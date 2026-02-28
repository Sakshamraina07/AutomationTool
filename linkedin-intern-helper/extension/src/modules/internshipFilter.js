// internshipFilter.js
// Strict filter to ensure we only apply to internship roles
// Robust Easy Apply Detection (SPA Safe)

const VALID_KEYWORDS = [
    'intern',
    'internship',
    'trainee',
    'graduate',
    'entry level',
    'fresher',
    'apprentice'
];

export function isInternshipRole(title) {
    if (!title) return false;
    const lowerTitle = title.toLowerCase();
    return VALID_KEYWORDS.some(keyword => lowerTitle.includes(keyword));
}

export async function validateJobPage() {

    // ---- 1. WAIT FOR DETAILS PANEL (SPA SAFE) ----
    const detailsLoaded = await waitForDetailsPanel();
    if (!detailsLoaded) {
        return { valid: false, reason: "Job details not loaded (SPA delay)" };
    }

    // ---- 2. TITLE CHECK ----
    const titleEl = document.querySelector(
        '.job-details-jobs-unified-top-card__job-title, h1'
    );

    const title = titleEl?.textContent?.trim();

    if (!title) {
        return { valid: false, reason: "Title not found (DOM Change)" };
    }

    if (!isInternshipRole(title)) {
        return { valid: false, reason: "Not an internship role" };
    }

    // ---- 3. EASY APPLY DETECTION (ROBUST) ----
    const easyApplyBtn = await waitForEasyApplyButton();

    if (!easyApplyBtn) {
        return { valid: false, reason: "Easy Apply not available" };
    }

    return { valid: true, easyApplyBtn };
}

/* ----------------- HELPERS ----------------- */

function waitForDetailsPanel(timeout = 8000) {
    return new Promise((resolve) => {
        const start = Date.now();

        const interval = setInterval(() => {
            const container = document.querySelector('.jobs-details__main-content');
            if (container) {
                clearInterval(interval);
                resolve(true);
            }

            if (Date.now() - start > timeout) {
                clearInterval(interval);
                resolve(false);
            }
        }, 500);
    });
}

function waitForEasyApplyButton(timeout = 10000) {
    return new Promise((resolve) => {
        const start = Date.now();

        const interval = setInterval(() => {

            const selectors = [
                'button[aria-label*="Easy Apply"]',
                'button[data-control-name="jobdetails_topcard_inapply"]',
                '.jobs-apply-button',
                '.jobs-s-apply button'
            ];

            for (let sel of selectors) {
                const btn = document.querySelector(sel);
                if (btn && isVisible(btn)) {
                    clearInterval(interval);
                    return resolve(btn);
                }
            }

            // Fallback: text-based detection (handles line breaks etc)
            const allButtons = Array.from(document.querySelectorAll('button'));

            for (let b of allButtons) {
                const text = b.textContent?.replace(/\s+/g, ' ').trim().toLowerCase();
                const aria = b.getAttribute('aria-label')?.toLowerCase() || '';

                if (
                    (text && text.includes('easy apply')) ||
                    aria.includes('easy apply')
                ) {
                    if (isVisible(b)) {
                        clearInterval(interval);
                        return resolve(b);
                    }
                }
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