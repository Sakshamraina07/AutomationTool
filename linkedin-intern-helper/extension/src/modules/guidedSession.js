// guidedSession.js
// STRICT STATE MACHINE ENGINE for LinkedIn Easy Apply Internships
// Enforces: Same Tab, Internship Only, Strict Easy Apply, Manual Submit.

import { validateJobPage, isInternshipRole } from './internshipFilter.js';
import { checkSafety, startInactivityMonitor, stopInactivityMonitor } from './safetyMonitor.js';
import { randomDelay } from './delayController.js';
import { runAutofill } from './autofillEngine.js';

const STATE = {
    IDLE: 'IDLE',
    SCANNING: 'SCANNING',
    PROCESSING: 'PROCESSING',
    WAITING_SUBMIT: 'WAITING_SUBMIT',
    SCROLLING: 'SCROLLING'
};

let currentState = STATE.IDLE;
let sessionPaused = false;
let processedJobIds = new Set();

export async function runGuidedSession() {
    if (currentState !== STATE.IDLE) return;

    console.log("[Heisenberg.ai] Starting State Machine Engine...");
    currentState = STATE.SCANNING;

    const safety = checkSafety();
    if (!safety.safe) {
        alert(`Session Blocked: ${safety.reason}`);
        currentState = STATE.IDLE;
        return;
    }

    startInactivityMonitor(handleInactivity);

    try {
        await mainLoop();
    } catch (e) {
        console.error("[Heisenberg.ai] Engine Crash:", e);
        alert("Engine Stopped due to error. Check console.");
    } finally {
        stopInactivityMonitor();
        currentState = STATE.IDLE;
        console.log("[Heisenberg.ai] Session Ended.");
    }
}

async function mainLoop() {
    while (currentState !== STATE.IDLE) {
        if (sessionPaused) {
            await new Promise(r => setTimeout(r, 1000));
            continue;
        }

        switch (currentState) {
            case STATE.SCANNING:
                await handleScanning();
                break;
            case STATE.PROCESSING:
                break;
            case STATE.SCROLLING:
                await handleScrolling();
                break;
        }
    }
}

async function handleScanning() {
    const cards = Array.from(document.querySelectorAll('.jobs-search-results__list-item, .job-card-container'));

    const newCards = cards.filter(card => {
        const id = card.getAttribute('data-job-id') || card.querySelector('a')?.href;
        return id && !processedJobIds.has(id);
    });

    if (newCards.length > 0) {
        currentState = STATE.PROCESSING;
        await processCards(newCards);
    } else {
        currentState = STATE.SCROLLING;
    }
}

async function processCards(cards) {
    for (const card of cards) {
        if (currentState === STATE.IDLE) break;
        if (sessionPaused) await waitForResume();

        const jobId = card.getAttribute('data-job-id') || card.querySelector('a')?.href;
        processedJobIds.add(jobId);

        const titleEl = card.querySelector('.job-card-list__title, .artdeco-entity-lockup__title');
        const title = titleEl?.textContent.trim();

        if (!title || !isInternshipRole(title)) continue;

        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const clickable = card.querySelector('a.job-card-list__title') || card;
        clickable.click();

        // 4. Validate Details (Strict Easy Apply Check)
        const validation = await validateJobPage();
        if (!validation.valid) {
            console.log(`[Heisenberg.ai] Skipping (Validation): ${validation.reason}`);
            chrome.runtime.sendMessage({ type: 'SKIP_JOB', reason: validation.reason });
            continue;
        }

        const easyApplyBtn = await waitForEasyApply();

        if (!easyApplyBtn) {
            console.log("[InternHelper] Easy Apply not found.");
            continue;
        }

        console.log("[InternHelper] Easy Apply Found. Clicking...");
        easyApplyBtn.click();

        await randomDelay(1500, 2500);

        currentState = STATE.WAITING_SUBMIT;

        await new Promise(async (resolve) => {
            await runAutofill(() => {
                monitorSubmission(resolve);
            });
        });

        currentState = STATE.PROCESSING;
        await randomDelay(2000, 3000);
    }

    currentState = STATE.SCANNING;
}

async function waitForDetailsLoad(timeout = 8000) {
    return new Promise((resolve) => {
        const start = Date.now();

        const observer = new MutationObserver(() => {
            const container = document.querySelector('.jobs-details__main-content');
            if (container) {
                observer.disconnect();
                resolve();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(() => {
            observer.disconnect();
            resolve();
        }, timeout);
    });
}

async function waitForEasyApply(timeout = 10000) {
    return new Promise((resolve) => {
        const start = Date.now();

        const check = () => {
            const selectors = [
                'button[aria-label*="Easy Apply"]',
                'button[data-control-name="jobdetails_topcard_inapply"]',
                '.jobs-apply-button',
                '.jobs-s-apply button'
            ];

            for (let sel of selectors) {
                const btn = document.querySelector(sel);
                if (btn && isVisible(btn)) {
                    return btn;
                }
            }
            return null;
        };

        const interval = setInterval(() => {
            const btn = check();
            if (btn) {
                clearInterval(interval);
                resolve(btn);
            }

            if (Date.now() - start > timeout) {
                clearInterval(interval);
                resolve(null);
            }
        }, 500);
    });
}

function isVisible(el) {
    return el && el.offsetParent !== null;
}

function waitForResume() {
    return new Promise(resolve => {
        const check = setInterval(() => {
            if (!sessionPaused) {
                clearInterval(check);
                resolve();
            }
        }, 500);
    });
}

function monitorSubmission(resolve) {
    const check = setInterval(() => {
        const modal = document.querySelector('.jobs-easy-apply-modal');
        if (!modal) {
            clearInterval(check);
            resolve();
        }
    }, 1000);
}

async function handleScrolling() {
    const list = document.querySelector('.jobs-search-results-list');
    if (list) {
        list.scrollBy({ top: 500, behavior: 'smooth' });
        await randomDelay(2000, 3000);
        currentState = STATE.SCANNING;
    } else {
        currentState = STATE.IDLE;
    }
}

function handleInactivity() {
    pauseSession();
}

export function pauseSession() { sessionPaused = true; }
export function resumeSession() { sessionPaused = false; }
export function stopSession() { currentState = STATE.IDLE; }