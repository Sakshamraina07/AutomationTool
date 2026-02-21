// modules/applicationMemory.js

const BLACKLIST = ["credit", "card", "bank", "ssn", "social security", "account number", "routing", "password", "salary expectations"];

export function normalizeLabel(label) {
    if (!label) return "";
    return label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function isBlacklisted(label) {
    const lowerLabel = label.toLowerCase();
    return BLACKLIST.some(item => lowerLabel.includes(item));
}

export async function getApplicationMemory() {
    return new Promise(resolve => {
        chrome.storage.local.get(["applicationMemory"], (res) => {
            resolve(res.applicationMemory || { customQuestions: {} });
        });
    });
}

export async function saveFieldToMemory(key, value) {
    if (!key || isBlacklisted(key) || value == null) return;

    const memory = await getApplicationMemory();

    if (!memory.customQuestions) {
        memory.customQuestions = {};
    }

    if (memory.customQuestions[key] === value) return;

    memory.customQuestions[key] = value;

    return new Promise(resolve => {
        chrome.storage.local.set({ applicationMemory: memory }, () => {
            console.log(`[InternHelper] Saved to Memory: ${key} = ${value}`);
            resolve();
        });
    });
}

let timeoutId = null;

export function captureInputs(modal) {
    if (!modal) return;

    const inputs = modal.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (input.dataset.memoryTracked) return;
        input.dataset.memoryTracked = "true";

        const handler = (e) => handleInputEvent(e.target);
        input.addEventListener('change', handler);
        input.addEventListener('blur', handler);
        input.addEventListener('input', handler); // For real-time typing
    });
}

function getLabelText(input) {
    let text = "";
    if (input.labels && input.labels.length > 0) {
        text = input.labels[0].textContent;
    } else if (input.getAttribute('aria-label')) {
        text = input.getAttribute('aria-label');
    } else {
        const parent = input.closest('div, label');
        text = parent ? parent.textContent : '';
    }
    // Clean up typical LinkedIn required asterisks and newlines
    return text.replace(/\n/g, ' ').replace(/\*/g, '').trim();
}

function getRadioLabelText(input) {
    // For radio buttons, the label is usually a sibling or parent label
    const parent = input.closest('label');
    if (parent) return parent.textContent.trim();
    const nextSibling = input.nextElementSibling;
    if (nextSibling && nextSibling.tagName === 'LABEL') return nextSibling.textContent.trim();
    return input.value;
}

function handleInputEvent(target) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
        let val = target.value;
        if (target.type === 'checkbox') {
            val = target.checked;
        } else if (target.type === 'radio') {
            if (!target.checked) return;
            val = getRadioLabelText(target);
        }

        let label = "";
        if (target.type === 'radio' || target.type === 'checkbox') {
            const fieldset = target.closest('fieldset');
            if (fieldset) {
                const legend = fieldset.querySelector('legend, .fb-dash-form-element__label');
                if (legend) label = legend.textContent;
            }
        }

        if (!label) {
            label = getLabelText(target);
        }

        const key = normalizeLabel(label);

        if (key && val !== undefined && val !== "") {
            saveFieldToMemory(key, val);
        }
    }, 500);
}

export function observeModalForInputs(modal) {
    if (!modal || modal.dataset.observerAttached) return;
    modal.dataset.observerAttached = "true";

    captureInputs(modal);

    const observer = new MutationObserver(() => {
        captureInputs(modal);
    });

    observer.observe(modal, { childList: true, subtree: true, attributes: false });
}
