// background.js - Hardened Guided Session Engine

const API_URL = 'http://127.0.0.1:3005';

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
    chrome.runtime.sendMessage({ type: 'SESSION_COMPLETE', reason });
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

        case 'CHECK_BACKEND':
            fetch(`${API_URL}/health`)
                .then(res => sendResponse({ success: res.ok }))
                .catch(() => sendResponse({ success: false }));
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
    }
});