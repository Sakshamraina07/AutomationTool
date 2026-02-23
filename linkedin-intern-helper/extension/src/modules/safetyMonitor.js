// safetyMonitor.js
// Monitors for CAPTCHAs, DOM changes, and Inactivity

let inactivityTimer = null;
const TIMEOUT_MS = 3 * 60 * 1000; // 3 Minutes

export function startInactivityMonitor(onTimeout) {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        onTimeout();
    }, TIMEOUT_MS);
}

export function resetInactivityMonitor(onTimeout) {
    startInactivityMonitor(onTimeout);
}

export function stopInactivityMonitor() {
    clearTimeout(inactivityTimer);
}

export function checkSafety() {
    // 1. CAPTCHA Detection
    if (document.querySelector('#captcha-internal') || document.body.innerText.includes("security check")) {
        return { safe: false, reason: "CAPTCHA Detected" };
    }

    // 2. Modal Overlay (Unexpected)
    const unexpectedModal = document.querySelector('.artdeco-modal');
    if (unexpectedModal && !unexpectedModal.innerText.includes("Apply")) {
        // Allow "Easy apply" modal, block others
        // return { safe: false, reason: "Unexpected Modal" };
        // Relaxed for now, need to be careful
    }

    return { safe: true };
}
