// background.js - Hardened Guided Session Engine

import { supabase, USER_ID } from './api.js';
import { getFieldValue } from './modules/tieredFillService.js';
import { saveCustomAnswer } from './modules/customAnswersService.js';

let cachedProfile = null;

async function getProfile() {
    if (cachedProfile) return cachedProfile;

    console.log("[InternHelper-BG] Fetching profile for caching...");
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq('user_id', USER_ID)
        .single();

    if (!error && data) {
        cachedProfile = data;
        console.log("[InternHelper-BG] Profile cached successfully.");
    } else {
        console.error("[InternHelper-BG] Error caching profile:", error);
    }

    return cachedProfile;
}
const DAILY_LIMIT = 10;
const BATCH_SIZE = 3;
const COOLDOWN_MS = 20 * 60 * 1000;

let isOpeningJob = false;

let sessionState = {
    isActive: false,
    isPaused: false,
    queue: [],
    currentIndex: 0,
    tabId: null,
    dailyCount: 0,
    batchCount: 0
};

/* ================= INIT RECOVERY ================= */

chrome.runtime.onStartup.addListener(recoverSession);
chrome.runtime.onInstalled.addListener(recoverSession);

async function recoverSession() {
    const { sessionState: saved } = await chrome.storage.local.get(['sessionState']);
    if (saved?.isActive) {
        console.log("[InternHelper-BG] Recovering previous session...");
        sessionState = saved;
        openNextJob();
    }
}

/* ================= STORAGE ================= */

async function saveSessionState() {
    await chrome.storage.local.set({ sessionState });
}

async function loadQueue() {
    const { jobQueue } = await chrome.storage.local.get(['jobQueue']);
    return Array.isArray(jobQueue) ? jobQueue : [];
}

async function saveQueue(queue) {
    await chrome.storage.local.set({ jobQueue: queue });
}

async function loadDailyStats() {
    const today = new Date().toDateString();
    const { dailyStats } = await chrome.storage.local.get(['dailyStats']);

    if (!dailyStats || dailyStats.date !== today) {
        return { date: today, count: 0 };
    }

    return dailyStats;
}

async function updateDailyStats() {
    const stats = await loadDailyStats();
    stats.count += 1;
    await chrome.storage.local.set({ dailyStats: stats });
    sessionState.dailyCount = stats.count;
}

/* ================= BUILD URL ================= */

function buildViewUrl(job) {
    if (job.jobId) {
        return `https://www.linkedin.com/jobs/view/${job.jobId}/`;
    }

    if (job.jobUrl?.includes('/jobs/view/')) {
        return job.jobUrl.split('?')[0];
    }

    return job.jobUrl;
}

/* ================= OPEN NEXT JOB ================= */

async function openNextJob() {

    if (isOpeningJob) return;
    isOpeningJob = true;

    try {

        if (!sessionState.isActive || sessionState.isPaused) return;

        if (sessionState.dailyCount >= DAILY_LIMIT) {
            await endSession("DAILY_LIMIT");
            return;
        }

        if (sessionState.currentIndex >= sessionState.queue.length) {
            await endSession();
            return;
        }

        const job = sessionState.queue[sessionState.currentIndex];

        if (!job || job.status === 'DONE' || job.status === 'FAILED') {
            sessionState.currentIndex++;
            await saveSessionState();
            setTimeout(openNextJob, 1000);
            return;
        }

        job.status = 'APPLYING';
        await saveSessionState();

        const queue = await loadQueue();
        const idx = queue.findIndex(j => j.jobId === job.jobId);

        if (idx !== -1) {
            queue[idx].status = 'APPLYING';
            await saveQueue(queue);
        }

        const viewUrl = buildViewUrl(job);

        const tabId = await getActiveTabId();
        if (!tabId) {
            await endSession("NO_ACTIVE_TAB");
            return;
        }

        sessionState.tabId = tabId;
        await saveSessionState();

        chrome.tabs.update(tabId, { url: viewUrl });

        // After job page loads, trigger autofill so guided_apply can click Easy Apply once and fill
        const onTabUpdated = (updatedTabId, changeInfo) => {
            if (updatedTabId !== tabId || changeInfo.status !== 'complete') return;
            chrome.tabs.onUpdated.removeListener(onTabUpdated);
            setTimeout(() => {
                getProfile().then(profile => {
                    chrome.tabs.sendMessage(
                        tabId,
                        { type: 'START_AUTOFILL', profile: profile || {} },
                        () => {
                            // Swallow errors if tab is gone or no listener
                            void chrome.runtime.lastError;
                        }
                    );
                });
            }, 5000);
        };
        chrome.tabs.onUpdated.addListener(onTabUpdated);

    } catch (err) {
        console.error("[InternHelper-BG] openNextJob error:", err);
    } finally {
        isOpeningJob = false;
    }
}

/* ================= TAB SAFE FETCH ================= */

function getActiveTabId() {
    return new Promise(resolve => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0]) {
                resolve(tabs[0].id);
            } else {
                resolve(null);
            }
        });
    });
}

/* ================= END SESSION ================= */

async function endSession(reason = null) {
    sessionState.isActive = false;
    await saveSessionState();
    // Swallow lastError in case the side panel is not open
    chrome.runtime.sendMessage({ type: 'SESSION_COMPLETE', reason }, () => {
        void chrome.runtime.lastError;
    });
}

/* ================= QUEUE ================= */

async function handleAddToQueue(job) {

    if (!job?.jobId) {
        return { success: false, error: 'INVALID_JOB' };
    }

    const queue = await loadQueue();

    if (queue.some(j => j.jobId === job.jobId)) {
        return { success: false, error: 'DUPLICATE' };
    }

    queue.push({
        ...job,
        status: 'PENDING',
        addedAt: Date.now()
    });

    await saveQueue(queue);

    return { success: true };
}

/* ================= MESSAGE LISTENER ================= */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    switch (message.type) {

        case 'TRIGGER_AUTOFILL':
            getProfile().then(profile => {
                if (sender.tab?.id) {
                    chrome.tabs.sendMessage(sender.tab.id, {
                        type: "START_AUTOFILL",
                        profile: profile || {}
                    });
                    console.log("[InternHelper-BG] Sent START_AUTOFILL to tab", sender.tab.id);
                }
            });
            return true;

        case 'GET_FIELD_VALUE':
            (async () => {
                try {
                    const profile = message.profile || await getProfile() || {};
                    const fieldInfo = {
                        labelText: message.labelText || '',
                        placeholder: message.placeholder || '',
                        inputType: message.inputType || 'text',
                        options: message.options || null,
                    };
                    const jobContext = { jobTitle: message.jobTitle || '', companyName: message.companyName || '' };
                    const result = await getFieldValue(profile, fieldInfo, jobContext);
                    sendResponse(result);
                } catch (e) {
                    console.warn('[InternHelper-BG] GET_FIELD_VALUE error:', e);
                    sendResponse({ value: null, source: 'error' });
                }
            })();
            return true;

        case 'SAVE_CUSTOM_ANSWER':
            (async () => {
                try {
                    const ok = await saveCustomAnswer(message.questionHash, message.questionText, message.answer);
                    sendResponse({ success: ok });
                } catch (e) {
                    console.warn('[InternHelper-BG] SAVE_CUSTOM_ANSWER error:', e);
                    sendResponse({ success: false });
                }
            })();
            return true;

        case 'CHECK_BACKEND':
            sendResponse({ success: true });
            return true;

        case 'GET_SESSION_STATUS':
            sendResponse(sessionState);
            return true;

        case 'ADD_TO_QUEUE':
            handleAddToQueue(message.job).then(sendResponse);
            return true;

        case 'START_SESSION':
            (async () => {

                const stats = await loadDailyStats();

                if (stats.count >= DAILY_LIMIT) {
                    sendResponse({ success: false, error: 'DAILY_LIMIT' });
                    return;
                }

                const queue = await loadQueue();

                sessionState.queue = queue.filter(j => j.status !== 'DONE');
                sessionState.currentIndex = 0;
                sessionState.isActive = true;
                sessionState.isPaused = false;
                sessionState.batchCount = 0;
                sessionState.dailyCount = stats.count;

                await saveSessionState();

                openNextJob();

                sendResponse({ success: true });

            })();

            return true;

        case 'APPLICATION_DONE':
        case 'APPLICATION_FAILED':

            (async () => {

                const success = message.type === 'APPLICATION_DONE';
                const job = sessionState.queue[sessionState.currentIndex];

                if (job) {
                    job.status = success ? 'DONE' : 'FAILED';

                    const queue = await loadQueue();
                    const idx = queue.findIndex(j => j.jobId === job.jobId);

                    if (idx !== -1) {
                        queue[idx].status = job.status;
                        await saveQueue(queue);
                    }
                }

                if (success) {
                    await updateDailyStats();
                    sessionState.batchCount++;
                }

                sessionState.currentIndex++;
                await saveSessionState();

                if (sessionState.batchCount >= BATCH_SIZE) {

                    sessionState.isPaused = true;

                    setTimeout(async () => {
                        sessionState.isPaused = false;
                        sessionState.batchCount = 0;
                        await saveSessionState();
                        openNextJob();
                    }, COOLDOWN_MS);

                } else {
                    setTimeout(openNextJob, 3000);
                }

                sendResponse({ success: true });

            })();

            return true;

        case 'STOP_SESSION':
            sessionState = {
                isActive: false,
                isPaused: false,
                queue: [],
                currentIndex: 0,
                tabId: null,
                dailyCount: 0,
                batchCount: 0
            };
            saveSessionState();
            sendResponse({ success: true });
            return true;

        case 'FILL_EASY_APPLY_FRAME':
            // Called by guided_apply.js after clicking Easy Apply.
            // Finds the Easy Apply iframe in the current tab and injects the fill function.
            (async () => {
                const tabId = sender.tab?.id;
                if (!tabId) { sendResponse({ success: false, error: 'NO_TAB' }); return; }

                const profile = message.profile || {};

                // Wait up to 8s for the Easy Apply form iframe.
                // Skip frameId=0 (parent) and /preload frames (those are just LinkedIn's search bar).
                // Look specifically for /easy-apply or /apply/ URL patterns.
                let targetFrame = null;
                for (let attempt = 0; attempt < 8; attempt++) {
                    await new Promise(r => setTimeout(r, 1000));
                    const frames = await new Promise(r =>
                        chrome.webNavigation.getAllFrames({ tabId }, r)
                    );
                    // Log all non-root frames for debugging
                    (frames || []).forEach(f => {
                        if (f.frameId !== 0) console.log(`[InternHelper-BG] Frame ${f.frameId}: ${f.url}`);
                    });
                    targetFrame = (frames || []).find(f =>
                        f.frameId !== 0 &&
                        !f.url.includes('/preload') &&
                        (f.url.includes('/easy-apply') ||
                            f.url.includes('/apply/'))
                    );
                    if (targetFrame) break;
                    console.log(`[InternHelper-BG] Frame scan attempt ${attempt + 1}/8 — Easy Apply frame not found yet`);
                }


                if (!targetFrame) {
                    console.warn('[InternHelper-BG] Easy Apply iframe not found after 6s.');
                    sendResponse({ success: false, error: 'FRAME_NOT_FOUND' });
                    return;
                }

                console.log('[InternHelper-BG] Found Easy Apply frame:', targetFrame.url, 'frameId:', targetFrame.frameId);

                try {
                    await chrome.scripting.executeScript({
                        target: { tabId, frameIds: [targetFrame.frameId] },
                        func: fillFormInFrame,
                        args: [profile]
                    });
                    console.log('[InternHelper-BG] fillFormInFrame injected successfully.');
                    sendResponse({ success: true });
                } catch (err) {
                    console.error('[InternHelper-BG] executeScript failed:', err);
                    sendResponse({ success: false, error: err.message });
                }
            })();
            return true;
    }
});

/* ================= INJECTABLE FILL FUNCTION ================= */
// This function is serialized and injected into the Easy Apply iframe.
// It must be self-contained — no closures, no imports, no external references.

function fillFormInFrame(profile) {
    console.log('[InternHelper-FRAME] fillFormInFrame running in frame:', window.location.href);

    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    const nativeTextareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;

    function triggerReact(el, value, isTextarea = false) {
        const setter = isTextarea ? nativeTextareaSetter : nativeSetter;
        setter.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    function getLabelText(el) {
        return (
            el.labels?.[0]?.innerText ||
            el.getAttribute('aria-label') ||
            el.closest('fieldset')?.querySelector('legend')?.innerText ||
            el.closest('[class*="form"]')?.querySelector('label')?.innerText ||
            el.closest('div')?.querySelector('label')?.innerText || ''
        ).toLowerCase().trim();
    }

    function mapFieldValue(el, profile) {
        const label = getLabelText(el);
        const type = el.type?.toLowerCase();
        const ph = (el.placeholder || '').toLowerCase();

        if (type === 'tel' || label.includes('phone') || label.includes('mobile') || ph.includes('phone'))
            return profile.phone_number || profile.phone || '';
        if (label.includes('first name') || ph.includes('first name'))
            return profile.first_name || '';
        if (label.includes('last name') || ph.includes('last name'))
            return profile.last_name || '';
        if (label.includes('email') || type === 'email')
            return profile.email || '';
        if (label.includes('linkedin') || ph.includes('linkedin'))
            return profile.linkedin_url || '';
        if (label.includes('city') || label.includes('location'))
            return profile.city || profile.location || '';
        if (label.includes('year') || label.includes('experience') || label.includes('gpa'))
            return profile.years_of_experience?.toString() || '';
        return null; // unknown field
    }

    const allInputs = [...document.querySelectorAll("input:not([type='hidden']), textarea, select")]
        .filter(el => !el.disabled && el.offsetParent !== null);

    console.log('[InternHelper-FRAME] Visible inputs in frame:', allInputs.length);
    allInputs.forEach(el => console.log('[InternHelper-FRAME] Input:', el.type, el.name, el.id, el.placeholder));

    let filled = 0;

    for (const el of allInputs) {
        const tag = el.tagName.toLowerCase();
        const type = (el.type || '').toLowerCase();

        if (type === 'radio' || type === 'checkbox') continue; // handle separately

        if (tag === 'select') {
            if (el.value && el.value.toLowerCase() !== 'select') continue; // already chosen
            const mapped = mapFieldValue(el, profile);
            if (mapped) {
                const opt = [...el.options].find(o => o.text.toLowerCase().includes(mapped.toLowerCase()));
                if (opt) { el.value = opt.value; el.dispatchEvent(new Event('change', { bubbles: true })); filled++; }
            }
            continue;
        }

        if (tag === 'textarea') {
            if (el.value && el.value.trim() !== '') continue;
            const mapped = mapFieldValue(el, profile) || (profile.summary || 'N/A');
            triggerReact(el, mapped, true);
            filled++;
            continue;
        }

        // Standard input
        if (el.value && el.value.trim() !== '') continue;
        const mapped = mapFieldValue(el, profile);
        if (mapped !== null && mapped !== '') {
            triggerReact(el, mapped);
            el.dataset.ihFrameFilled = 'true';
            filled++;
            console.log('[InternHelper-FRAME] Filled:', getLabelText(el), '→', mapped);
        }
    }

    console.log('[InternHelper-FRAME] Fields filled:', filled);

    // Click Next/Review/Submit if all visible inputs are filled
    setTimeout(() => {
        const btn = [...document.querySelectorAll('button')].find(b => {
            if (b.disabled || b.offsetParent === null) return false;
            const txt = (b.innerText || '').toLowerCase();
            const aria = (b.getAttribute('aria-label') || '').toLowerCase();
            return txt.includes('next') || txt.includes('review') || txt.includes('submit') ||
                aria.includes('next') || aria.includes('review') || aria.includes('submit');
        });
        if (btn) {
            console.log('[InternHelper-FRAME] Clicking:', btn.innerText.trim());
            btn.click();
        } else {
            console.log('[InternHelper-FRAME] No Next/Review/Submit button found yet.');
        }
    }, 800);
}
