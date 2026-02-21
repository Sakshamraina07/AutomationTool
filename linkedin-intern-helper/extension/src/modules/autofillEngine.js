// autofillEngine.js
// Handles intelligent form filling for Easy Apply modals

import { randomDelay } from './delayController.js';
import { base64ToBlob, getProfile } from './profileService.js';
import { getApplicationMemory, observeModalForInputs, normalizeLabel } from './applicationMemory.js';

let isRunning = false;
let observer = null;

export async function runAutofill(onStopCallback) {
    if (isRunning) return;
    isRunning = true;
    console.log("[InternHelper] Starting Autofill Engine...");

    // Load Profile Data & Application Memory
    const { profile, resume } = await getProfile();
    const memory = await getApplicationMemory();

    console.log("[InternHelper] Profile Data & Memory Loaded");

    await processModalSteps({ profile, resume, memory }, onStopCallback);
}

async function processModalSteps(fullProfile, onStopCallback) {
    const MAX_STEPS = 5;
    let step = 0;

    while (step < MAX_STEPS && isRunning) {
        step++;
        console.log(`[InternHelper] Processing Step ${step}...`);

        // 1. Wait for Modal Content
        const modal = await waitForModalStable();
        if (!modal) break;

        // Attach observer to learn new answers
        observeModalForInputs(modal);

        // 2. Check for Submit buttons
        const submitBtn = findButtonByText('Submit application') || document.querySelector('[aria-label="Submit application"]') || findSubmitButton();
        if (submitBtn) {
            console.log("[InternHelper] Submit Button Found! Waiting for manual submit.");
            highlightSubmitButton(submitBtn);
            // DO NOT AUTO-SUBMIT 
            cleanup();
            return;
        }

        // 3. Detect and Fill Inputs asynchronously with MutationObserver
        await fillInputsContinuously(fullProfile, modal);

        // 4. Look for "Next" or "Review" button
        const nextBtn = findButtonByText('Next') || findButtonByText('Review');

        if (nextBtn) {
            // Before clicking, check if there's a hidden submit button
            const hiddenSubmit = document.querySelector('[aria-label="Submit application"]') || findSubmitButton();
            if (hiddenSubmit) {
                console.log("[InternHelper] Hidden Submit Button Found! Waiting for manual submit.");
                highlightSubmitButton(hiddenSubmit);
                cleanup();
                return;
            }

            console.log("[InternHelper] Clicking Next/Review...");
            await randomDelay(1000, 2000);
            nextBtn.click();
            await randomDelay(2000, 3000); // Wait for transition
        } else {
            console.log("[InternHelper] No Next/Submit button found. Stopping.");
            cleanup();
            return;
        }
    }
    cleanup();
}

// Observe and inject continuously for a set period (e.g. 5 seconds) to catch dynamic fields
function fillInputsContinuously(fullProfile, modal) {
    return new Promise(async (resolve) => {
        let hasFilled = false;

        const tryFillAll = async () => {
            const inputs = modal.querySelectorAll('input, select, textarea');
            for (const input of inputs) {
                if (isVisible(input) && !input.value && !input.dataset.ihFilled) {
                    await randomDelay(800, 2000); // sequential delay
                    // Check visibility and emptiness again after delay
                    if (isVisible(input) && !input.value) {
                        const filled = await tryFillInput(input, fullProfile);
                        if (filled) {
                            input.dataset.ihFilled = "true";
                            hasFilled = true;
                        }
                    }
                }
            }
        };

        // Initial sweep
        await tryFillAll();

        // Observation sweep
        observer = new MutationObserver(async (mutations) => {
            // throttle calls to tryFillAll
            observer.disconnect();
            await tryFillAll();
            if (modal) {
                observer.observe(modal, { childList: true, subtree: true });
            }
        });

        observer.observe(modal, { childList: true, subtree: true });

        // Resolve after 4 seconds of observation
        setTimeout(() => {
            if (observer) observer.disconnect();
            resolve(hasFilled);
        }, 4000);
    });
}

function cleanup() {
    isRunning = false;
    if (observer) {
        observer.disconnect();
        observer = null;
    }
}

async function waitForModalStable() {
    return new Promise(resolve => {
        let stableFrames = 0;
        let lastModal = null;
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            const modal = document.querySelector('.jobs-easy-apply-modal, [role="dialog"][aria-modal="true"]');
            if (modal) {
                stableFrames++;
                lastModal = modal;
                if (stableFrames > 2) { // ~1s stable
                    clearInterval(interval);
                    resolve(lastModal);
                }
            }
            if (attempts > 30) {
                clearInterval(interval);
                resolve(null);
            }
        }, 500);
    });
}

function findSubmitButton() {
    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons.find(btn => {
        if (!isVisible(btn)) return false;
        const text = (btn.innerText || "").toLowerCase();
        const ariaLabel = (btn.getAttribute("aria-label") || "").toLowerCase();
        return text.includes("submit application") || ariaLabel.includes("submit application");
    });
}

async function tryFillInput(input, fullProfile) {
    const labelText = getLabelText(input);
    const labelKey = normalizeLabel(labelText);

    const name = (input.name || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const type = input.type;
    const { profile, resume, memory } = fullProfile;

    // === File Input (Resume) ===
    if (type === 'file') {
        if ((labelText.toLowerCase().includes('resume') || labelText.toLowerCase().includes('cv')) && resume) {
            try {
                const fileBlob = base64ToBlob(resume.data, resume.type);
                const dt = new DataTransfer();
                dt.items.add(new File([fileBlob], resume.name, { type: resume.type }));
                input.files = dt.files;
                input.dispatchEvent(new Event('change', { bubbles: true }));
                console.log("[InternHelper] Attached Resume:", resume.name);
                return true;
            } catch (e) {
                console.error("[InternHelper] Failed to attach resume", e);
            }
        }
        return false;
    }

    let value = null;

    // === PRIORITY 1: Persistent Memory (customQuestions) ===
    if (labelKey && memory?.customQuestions && memory.customQuestions[labelKey]) {
        value = memory.customQuestions[labelKey];
        console.log(`[InternHelper] Autofilling from Memory: ${labelKey} = ${value}`);
    }

    // === PRIORITY 2: Generic Mapping Engine ===
    if (!value) {
        const profileMap = {
            "first name": profile.firstName || profile.full_name?.split(' ')[0],
            "last name": profile.lastName || profile.full_name?.split(' ').slice(1).join(' '),
            "full name": profile.full_name,
            "phone": profile.phone,
            "mobile": profile.phone,
            "email": profile.email,
            "city": profile.location,
            "location": profile.location,
            "linkedin": profile.linkedin_url,
            "portfolio": profile.portfolio_url,
            "website": profile.portfolio_url,
            "blog": profile.portfolio_url,
            "authorization": profile.work_auth,
            "legally authorized": profile.work_auth,
            "sponsorship": profile.work_auth === "yes" ? "no" : "yes", // Example heuristic if needed
            "notice": profile.notice_period,
            "start date": profile.notice_period,
            "experience": profile.experience || profile.yoe,
            "years": profile.experience || profile.yoe,
            "cover letter": profile.cover_letter,
        };

        const checkKeys = [...Object.keys(profileMap)];
        const targetStr = `${labelText} ${name} ${id}`.toLowerCase();

        for (const key of checkKeys) {
            if (targetStr.includes(key)) {
                value = profileMap[key];
                break;
            }
        }
    }

    // === PRIORITY 3: Base Profile common_answers ===
    if (!value && profile.common_answers && profile.common_answers[labelKey]) {
        value = profile.common_answers[labelKey];
    }

    // === FILL VALUE ===
    if (value) {
        if (type === 'radio' || type === 'checkbox' || input.tagName === 'SELECT') {
            if (input.tagName === 'SELECT') {
                const option = Array.from(input.options).find(o =>
                    o.text.toLowerCase() === value.toLowerCase() ||
                    o.value.toLowerCase() === value.toLowerCase() ||
                    o.text.toLowerCase().includes(value.toLowerCase())
                );
                if (option) {
                    setNativeValue(input, option.value);
                    return true;
                }
            } else if (type === 'radio') {
                const radioLabel = getRadioLabelText(input).toLowerCase();
                // Match the value vs the specific radio option's label
                if (radioLabel.includes(value.toLowerCase()) || value.toLowerCase() === radioLabel) {
                    input.click();
                    return true;
                }
            } else if (type === 'checkbox') {
                if (value === true || value.toString().toLowerCase() === 'yes') {
                    if (!input.checked) input.click();
                    return true;
                }
            }
        } else {
            setNativeValue(input, value);
            return true;
        }
    } else {
        // Unfilled input... ApplicationMemory handles tracking user input automatically
        if (input.tagName !== 'FILE' && type !== 'file') {
            input.style.border = "2px solid #3b82f6"; // Highlight blue for user input required
            input.setAttribute('title', 'InternHelper: Please fill this to teach the Intelligent Memory');
        }
    }

    return false;
}

function getLabelText(input) {
    let text = "";
    // If radio or checkbox, the question is usually in a fieldset legend
    if (input.type === 'radio' || input.type === 'checkbox') {
        const fieldset = input.closest('fieldset');
        if (fieldset) {
            const legend = fieldset.querySelector('legend, .fb-dash-form-element__label');
            if (legend) text = legend.textContent;
        }
    }

    if (!text) {
        if (input.labels && input.labels.length > 0) {
            text = input.labels[0].textContent;
        } else if (input.getAttribute('aria-label')) {
            text = input.getAttribute('aria-label');
        } else {
            const parent = input.closest('div, label');
            text = parent ? parent.textContent : '';
        }
    }
    return text.replace(/\n/g, ' ').replace(/\*/g, '').trim();
}

function getRadioLabelText(input) {
    const parent = input.closest('label');
    if (parent) return parent.textContent.trim();
    const nextSibling = input.nextElementSibling;
    if (nextSibling && nextSibling.tagName === 'LABEL') return nextSibling.textContent.trim();
    return input.value || "";
}

// React 16+ safe injection method
function setNativeValue(element, value) {
    const valueSetter = Object.getOwnPropertyDescriptor(element.__proto__, 'value')?.set;
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

    if (valueSetter && valueSetter !== prototypeValueSetter) {
        prototypeValueSetter.call(element, value);
    } else if (valueSetter) {
        valueSetter.call(element, value);
    } else {
        element.value = value;
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
}

function findButtonByText(text) {
    return Array.from(document.querySelectorAll('.jobs-easy-apply-modal button'))
        .find(b => b.textContent.trim() === text || b.querySelector('span')?.textContent.trim() === text);
}

function isVisible(elem) {
    return !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
}

export function stopAutofill() {
    isRunning = false;
    cleanup();
}

function highlightSubmitButton(btn) {
    btn.style.border = "4px solid #f5c258"; // Warning/Action color
    btn.style.boxShadow = "0 0 10px #f5c258";
    btn.setAttribute('title', 'Review & Click Submit to Continue');

    let tooltip = document.getElementById('intern-helper-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'intern-helper-tooltip';
        tooltip.style.position = "absolute";
        tooltip.style.bottom = "110%";
        tooltip.style.left = "50%";
        tooltip.style.transform = "translateX(-50%)";
        tooltip.style.background = "#f5c258";
        tooltip.style.color = "black";
        tooltip.style.padding = "6px 12px";
        tooltip.style.borderRadius = "4px";
        tooltip.style.fontWeight = "bold";
        tooltip.style.zIndex = "9999";
        tooltip.style.whiteSpace = "nowrap";
        tooltip.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
        btn.parentElement.style.position = "relative";
        btn.parentElement.appendChild(tooltip);
    }
    tooltip.innerText = "Please review your application and Submit manually.";
}
