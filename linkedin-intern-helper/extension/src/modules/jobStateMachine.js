import { runAutofill } from './autofillEngine.js';
import { randomDelay } from './delayController.js';
import { fetchApi, USER_ID } from '../api.js';

const STATE = {
    OPEN_JOB: 'OPEN_JOB',
    CLICK_EASY_APPLY: 'CLICK_EASY_APPLY',
    FILL_FORM: 'FILL_FORM',
    WAITING_SUBMIT: 'WAITING_SUBMIT',
    DONE: 'DONE',
    FAILED: 'FAILED'
};

let currentState = STATE.OPEN_JOB;
let currentJob = null;
let isRunning = false;

/* ================= UTILS ================= */

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isElementVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    // 2. Remove Strict Visibility Check: only rely on getBoundingClientRect width & height
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
}

/* ================= ENTRY ================= */

export async function startJobStateMachine(job) {
    if (!job) return;
    if (isRunning) {
        console.warn("[InternHelper] State machine already running. Skipping.");
        return;
    }

    if (!window.location.pathname.includes('/jobs/view/')) {
        console.warn("[InternHelper] Not on a job view page. Blocking execution.");
        return;
    }

    isRunning = true;
    currentJob = job;
    currentState = STATE.OPEN_JOB;

    console.log(`[InternHelper] Starting State Machine for: ${job.title}`);

    try {
        await processStateMachine();
    } catch (e) {
        console.error("[InternHelper] State Machine Crash:", e);
        chrome.runtime.sendMessage({
            type: 'APPLICATION_FAILED',
            reason: e.message
        });
    } finally {
        isRunning = false;
    }
}

/* ================= CORE LOOP ================= */

async function processStateMachine() {
    while (currentState !== STATE.DONE && currentState !== STATE.FAILED) {
        console.log(`[InternHelper] Current State: ${currentState}`);

        switch (currentState) {
            case STATE.OPEN_JOB:
                await handleOpenJob();
                break;
            case STATE.CLICK_EASY_APPLY:
                await handleClickEasyApply();
                break;
            case STATE.FILL_FORM:
                await handleFillForm();
                break;
            case STATE.WAITING_SUBMIT:
                await handleWaitingSubmit();
                break;
        }

        await randomDelay(800, 1500);
    }

    if (currentState === STATE.DONE) {
        console.log("[InternHelper] Application Complete.");
        chrome.runtime.sendMessage({ type: 'APPLICATION_DONE' });
    } else {
        console.log("[InternHelper] Application Failed.");
        chrome.runtime.sendMessage({ type: 'APPLICATION_FAILED' });
    }
}

/* ================= DETECTION ================= */

function findEasyApplyButton() {
    // 1. Multi-Strategy Button Detection: button or anchor
    const elements = Array.from(document.querySelectorAll("button, a"));

    for (const el of elements) {
        if (!isElementVisible(el)) continue;

        if (el.disabled || el.hasAttribute('disabled')) {
            // Logging as requested
            // console.log("[IH] Button visible but disabled");
            continue;
        }

        const text = (el.innerText || "").toLowerCase();
        const ariaLabel = (el.getAttribute("aria-label") || "").toLowerCase();
        const controlName = (el.getAttribute("data-control-name") || "").toLowerCase();
        const className = (el.className || "").toString().toLowerCase();

        // Check for Apply vs Save. Ensure it's not "already applied"
        const isAlreadyApplied = text.includes("applied") && !text.includes("easy apply");
        if (isAlreadyApplied) continue;

        // Strategy A: aria-label
        if (ariaLabel.includes("easy apply")) {
            console.log("[IH] Easy Apply Strategy A success");
            return el;
        }

        // Strategy B: data-control-name
        if (controlName.includes("jobdetails_topcard_inapply") || controlName.includes("apply")) {
            // Need to make sure it's not the "save" button which also might have "apply" in the name if weirdly structured,
            // but usually topcard_inapply is specific.
            if (!text.includes("save")) {
                console.log("[IH] Strategy B matched");
                return el;
            }
        }

        // Strategy C: class-based fallback
        if (className.includes("jobs-apply-button") || className.includes("jobs-s-apply")) {
            console.log("[IH] Strategy C matched");
            return el;
        }

        // Strategy D: text fallback
        if (text.includes("easy apply")) {
            console.log("[IH] Strategy D matched");
            return el;
        }
    }

    return null;
}

function findModal() {
    const modal = document.querySelector('.jobs-easy-apply-modal, [role="dialog"][aria-modal="true"]');
    if (modal && isElementVisible(modal)) {
        return modal;
    }
    return null;
}

/* ================= DOM WAITERS ================= */

async function waitForJobContainer() {
    console.log("[IH] Waiting for job details container...");
    const maxWait = 10000; // 10s
    const start = Date.now();

    // Wait until .jobs-search__job-details--container OR .job-view-layout exists
    while (Date.now() - start < maxWait) {
        if (document.querySelector('.jobs-search__job-details--container, .job-view-layout')) {
            console.log("[IH] Job details container found.");
            return true;
        }
        await wait(500);
    }
    return false;
}

function waitForButtonMutationObserver(timeout = 8000) {
    return new Promise(resolve => {
        const observer = new MutationObserver(() => {
            const btn = findEasyApplyButton();
            if (btn) {
                console.log("[IH] Mutation observer detected button");
                observer.disconnect();
                resolve(btn);
            }
        });

        const container = document.querySelector('.jobs-search__job-details--container, .job-view-layout') || document.body;
        observer.observe(container, { childList: true, subtree: true, attributes: true });

        setTimeout(() => {
            observer.disconnect();
            resolve(null);
        }, timeout);
    });
}

/* ================= STATES ================= */

async function handleOpenJob() {
    console.log("[InternHelper] Searching for Easy Apply button...");

    // 3. Wait for Job Details Container First
    const hasContainer = await waitForJobContainer();
    if (!hasContainer) {
        console.warn("[IH] Job details container never appeared. Proceeding anyway...");
    }

    // 5. Increase Retry Window (Dynamic Backoff)
    let delay = 500;
    const maxTotalTime = 30000; // 30 seconds
    const start = Date.now();

    while (Date.now() - start < maxTotalTime) {
        console.log(`[IH] Polling for Easy Apply button (delay: ${delay}ms)...`);
        const btn = findEasyApplyButton();

        if (btn) {
            await wait(500);
            const stableBtn = findEasyApplyButton();
            if (stableBtn) {
                console.log("[InternHelper] Easy Apply button is stable and found.");
                currentState = STATE.CLICK_EASY_APPLY;
                return;
            }
        }

        await wait(delay);
        // Dynamic backoff up to 3 seconds
        delay = Math.min(delay * 1.5, 3000);
    }

    // 4. Add MutationObserver Fallback (Critical)
    console.log("[IH] Polling exhausted. Attaching MutationObserver fallback...");
    const btnFromObserver = await waitForButtonMutationObserver(8000);
    if (btnFromObserver) {
        await wait(500);
        if (findEasyApplyButton()) {
            console.log("[InternHelper] Easy Apply button stable after mutation observer.");
            currentState = STATE.CLICK_EASY_APPLY;
            return;
        }
    }

    // 6. DO NOT Fail Immediately (Check if job is expired)
    const bodyText = document.body.innerText.toLowerCase();
    if (bodyText.includes("no longer accepting applications")) {
        console.log("[IH] Job is expired (No longer accepting applications).");
        currentState = STATE.FAILED;
        return;
    }

    if (bodyText.includes("applied on") || bodyText.includes("already applied")) {
        console.log("[InternHelper] Job already applied.");
        currentState = STATE.DONE;
        return;
    }

    // Final Retry after 5 seconds
    console.log("[IH] Checking one final time after 5 seconds...");
    await wait(5000);
    if (findEasyApplyButton()) {
        console.log("[InternHelper] Easy Apply found on final retry.");
        currentState = STATE.CLICK_EASY_APPLY;
        return;
    }

    console.log("[InternHelper] Could not find Easy Apply button after all retries and fallbacks.");
    currentState = STATE.FAILED;
}

async function handleClickEasyApply() {
    const applyBtn = findEasyApplyButton();

    if (!applyBtn) {
        console.log("[InternHelper] Button lost before click. Reverting to OPEN_JOB.");
        currentState = STATE.OPEN_JOB;
        return;
    }

    console.log("[InternHelper] Clicking Easy Apply...");

    try {
        // Scroll into view
        applyBtn.scrollIntoView({ behavior: "smooth", block: "center" });
        await wait(600);

        // Focus
        applyBtn.focus();
        await wait(300);

        // Real Click Strategy
        applyBtn.click();

        console.log("[InternHelper] Click dispatched. Waiting for modal to open.");

        // Wait up to 10 seconds for modal visibility
        const MAX_MODAL_WAIT = 20; // 20 * 500ms = 10s
        for (let i = 0; i < MAX_MODAL_WAIT; i++) {
            await wait(500);
            if (findModal()) {
                console.log("[InternHelper] Modal successfully opened.");
                currentState = STATE.FILL_FORM;
                return;
            }
        }

        console.log("[InternHelper] Modal did not appear after click. Reverting to OPEN_JOB.");
        currentState = STATE.OPEN_JOB;

    } catch (e) {
        console.error("[InternHelper] Error clicking button:", e);
        currentState = STATE.FAILED;
    }
}

async function handleFillForm() {
    const modal = findModal();
    if (!modal) {
        console.log("[InternHelper] Modal disappeared before filling started. Reverting to OPEN_JOB.");
        currentState = STATE.OPEN_JOB;
        return;
    }

    console.log("[InternHelper] Modal present. Triggering AutofillEngine...");

    try {
        // AutofillEngine handles its own step detection inside the modal
        await runAutofill();
        currentState = STATE.WAITING_SUBMIT;
    } catch (e) {
        console.error("[InternHelper] Error running autofill:", e);
        currentState = STATE.FAILED;
    }
}

async function handleWaitingSubmit() {
    console.log("[InternHelper] Waiting for user to submit manually...");

    // Wait until modal is closed
    const MAX_WAIT_TIME = 10 * 60 * 1000; // 10 minutes max 
    const INTERVAL = 1000;
    const checks = MAX_WAIT_TIME / INTERVAL;

    for (let i = 0; i < checks; i++) {
        await wait(INTERVAL);

        const modal = findModal();
        if (!modal) {
            // Modal closed. Verify if it was submitted successfully or cancelled.
            await wait(1000); // Give DOM a moment to update with success message

            const domText = document.body.innerText.toLowerCase();
            const successTexts = [
                "application was sent",
                "application submitted",
                "applied on",
                "your application was sent"
            ];

            const isSuccess = successTexts.some(text => domText.includes(text));

            if (isSuccess) {
                console.log("[InternHelper] Application success confirmation detected.");
                currentState = STATE.DONE;

                // --- ADD RENDER API CALL FOR SUCCESSFUL APPLICATION TRACKING ---
                try {
                    await fetchApi('/applications/track', {
                        method: 'POST',
                        body: JSON.stringify({
                            user_id: USER_ID,
                            job_id: window.location.href, // or parse exactly
                            title: currentJob?.title || document.title.split('|')[0].trim(),
                            company: currentJob?.company || "Unknown Company",
                            status: "APPLIED"
                        })
                    });
                    console.log("[InternHelper] Successfully tracked application to Render DB.");
                } catch (apiErr) {
                    console.error("[InternHelper] Failed to push history to Render DB:", apiErr);
                }
            } else {
                console.warn("[InternHelper] Modal closed but no success confirmation found. Marking FAILED.");
                currentState = STATE.FAILED;
            }
            return;
        }
    }

    console.log("[InternHelper] Timeout waiting for manual submit.");
    currentState = STATE.FAILED;
}