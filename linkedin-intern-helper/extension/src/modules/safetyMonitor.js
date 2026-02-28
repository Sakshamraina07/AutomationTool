// safetyMonitor.js
// Advanced Safety & Risk Detection Engine

let inactivityTimer = null;
const TIMEOUT_MS = 3 * 60 * 1000; // 3 Minutes

/* ================= INACTIVITY ================= */

export function startInactivityMonitor(onTimeout) {
    stopInactivityMonitor();

    inactivityTimer = setTimeout(() => {
        console.warn("[InternHelper] Inactivity timeout triggered.");
        if (typeof onTimeout === "function") {
            onTimeout();
        }
    }, TIMEOUT_MS);
}

export function resetInactivityMonitor(onTimeout) {
    startInactivityMonitor(onTimeout);
}

export function stopInactivityMonitor() {
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
    }
}

/* ================= SAFETY CHECK ================= */

export function checkSafety() {

    const pageText = document.body?.innerText?.toLowerCase() || "";

    /* ---------- CAPTCHA ---------- */

    const captchaDetected =
        document.querySelector('#captcha-internal') ||
        document.querySelector('iframe[src*="captcha"]') ||
        pageText.includes("security verification") ||
        pageText.includes("complete the security check") ||
        pageText.includes("prove you are human");

    if (captchaDetected) {
        return {
            safe: false,
            reason: "CAPTCHA detected"
        };
    }

    /* ---------- SUSPICIOUS ACTIVITY ---------- */

    if (
        pageText.includes("unusual activity") ||
        pageText.includes("temporarily restricted") ||
        pageText.includes("account restricted") ||
        pageText.includes("suspicious activity detected")
    ) {
        return {
            safe: false,
            reason: "Account restriction or suspicious activity detected"
        };
    }

    /* ---------- LOGGED OUT / SESSION EXPIRED ---------- */

    const loginForm =
        document.querySelector('input[name="session_key"]') ||
        document.querySelector('form[action*="login"]');

    if (loginForm || pageText.includes("sign in")) {
        return {
            safe: false,
            reason: "Session expired or logged out"
        };
    }

    /* ---------- UNEXPECTED REDIRECT ---------- */

    if (!window.location.pathname.includes("/jobs/")) {
        return {
            safe: false,
            reason: "Unexpected navigation detected"
        };
    }

    /* ---------- UNEXPECTED MODAL ---------- */

    const dialogs = document.querySelectorAll('[role="dialog"]');

    for (const dialog of dialogs) {
        const text = dialog.innerText?.toLowerCase() || "";

        if (
            !text.includes("apply") &&
            !text.includes("application") &&
            !text.includes("review")
        ) {
            return {
                safe: false,
                reason: "Unexpected modal detected"
            };
        }
    }

    return { safe: true };
}