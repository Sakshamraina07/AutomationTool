import './content_style.css';

console.log("[InternHelper] Content script loaded (Ultra Stable)");

const SELECTORS = {
    DETAILS_CONTAINER: '.jobs-search__job-details--container, .job-view-layout, .jobs-search-two-pane__details',
    ACTIONS_BAR: '.jobs-unified-top-card__actions-container, .jobs-s-apply',
    MODAL: '.jobs-easy-apply-modal',
    MODAL_HEADER: '.artdeco-modal__header',
    BUTTON_ID: 'internhelper-queue-btn'
};

const State = {
    detailsObserver: null,
    modalObserver: null,
    lastUrl: location.href
};

// ---------------- SAFE UTIL ----------------

function disconnectObservers() {
    State.detailsObserver?.disconnect();
    State.modalObserver?.disconnect();
    State.detailsObserver = null;
    State.modalObserver = null;
}

// ---------------- QUEUE BUTTON ----------------

function injectQueueButton(actionsBar) {
    if (!actionsBar) return;
    if (document.getElementById(SELECTORS.BUTTON_ID)) return;

    const btn = document.createElement('button');
    btn.id = SELECTORS.BUTTON_ID;
    btn.className = "artdeco-button artdeco-button--2 artdeco-button--secondary";
    btn.innerHTML = `<span class="artdeco-button__text">+ Queue</span>`;

    btn.style.cssText = `
        margin-left: 8px;
        background-color: #10b981 !important;
        color: white !important;
        border-color: #10b981 !important;
        min-height: 32px;
    `;

    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await handleAddToQueue(btn);
    });

    actionsBar.appendChild(btn);
    console.log("[InternHelper] Queue button injected");
}

async function handleAddToQueue(btn) {
    if (!window.location.href.includes("/jobs/view/") && !window.location.href.includes("/jobs/search/")) return;

    if (btn.dataset.processing) return;

    btn.dataset.processing = "true";
    btn.innerHTML = `<span class="artdeco-button__text">...</span>`;

    const jobId =
        new URLSearchParams(location.search).get('currentJobId') ||
        location.pathname.match(/jobs\/view\/(\d+)/)?.[1] ||
        `job_${Date.now()}`;

    const jobUrl = `https://www.linkedin.com/jobs/view/${jobId}/`;

    try {
        const container =
            document.querySelector(".jobs-search__job-details--container") ||
            document.querySelector(".jobs-details");

        const title = container?.querySelector('h1')?.textContent?.trim() || "Job";
        const company =
            container?.querySelector('.job-details-jobs-unified-top-card__company-name')
                ?.textContent?.trim() || "Company";

        const res = await chrome.runtime.sendMessage({
            type: 'ADD_TO_QUEUE',
            job: { jobId, jobUrl, title, company, easyApply: true }
        });

        if (res?.success) {
            btn.innerHTML = `<span class="artdeco-button__text">✓</span>`;
        } else if (res?.error === 'DUPLICATE') {
            btn.innerHTML = `<span class="artdeco-button__text">In Queue</span>`;
        } else {
            btn.innerHTML = `<span class="artdeco-button__text">Limit</span>`;
        }
    } catch (err) {
        console.error(err);
        btn.innerHTML = `<span class="artdeco-button__text">Error</span>`;
    }

    setTimeout(() => {
        if (btn.isConnected) {
            btn.innerHTML = `<span class="artdeco-button__text">+ Queue</span>`;
            delete btn.dataset.processing;
        }
    }, 1500);
}

// ---------------- DETAILS OBSERVER ----------------

function setupDetailsObserver(detailsNode) {
    State.detailsObserver?.disconnect();

    const tryInject = () => {
        const actionsBar = detailsNode.querySelector(SELECTORS.ACTIONS_BAR);
        if (actionsBar) injectQueueButton(actionsBar);
    };

    tryInject();

    State.detailsObserver = new MutationObserver(() => {
        // Instead of subtree scan,
        // only check if button missing
        if (!document.getElementById(SELECTORS.BUTTON_ID)) {
            tryInject();
        }
    });

    State.detailsObserver.observe(detailsNode, {
        childList: true,
        subtree: false   // 🔥 PERFORMANCE SAFE
    });
}

// ---------------- MODAL OBSERVER ----------------

function setupModalObserver(modalNode) {
    State.modalObserver?.disconnect();

    const injectSmartApply = () => {
        if (modalNode.querySelector('#ih-smart-apply')) return;

        const header = modalNode.querySelector(SELECTORS.MODAL_HEADER);
        if (!header) return;

        const btn = document.createElement('button');
        btn.id = 'ih-smart-apply';
        btn.textContent = "⚡ Smart Apply";
        btn.style.cssText = `
            margin-left:auto;
            margin-right:16px;
            background:#7c3aed;
            color:white;
            border:none;
            padding:4px 12px;
            border-radius:16px;
            font-weight:bold;
            cursor:pointer;
        `;

        header.appendChild(btn);
    };

    injectSmartApply();

    State.modalObserver = new MutationObserver(injectSmartApply);

    State.modalObserver.observe(modalNode, {
        childList: true,
        subtree: false   // 🔥 PERFORMANCE SAFE
    });
}

// ---------------- GLOBAL WATCHER ----------------

function setupGlobalWatcher() {
    const checkNodes = () => {
        const details = document.querySelector(SELECTORS.DETAILS_CONTAINER);
        if (details) setupDetailsObserver(details);

        const modal = document.querySelector(SELECTORS.MODAL);
        if (modal) setupModalObserver(modal);
    };

    checkNodes();

    const bodyObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (node.nodeType !== 1) continue;

                if (node.matches?.(SELECTORS.DETAILS_CONTAINER)) {
                    setupDetailsObserver(node);
                }

                if (node.matches?.(SELECTORS.MODAL)) {
                    setupModalObserver(node);
                }
            }
        }
    });

    bodyObserver.observe(document.body, {
        childList: true,
        subtree: false  // 🔥 CRITICAL
    });
}

// ---------------- TITLE WATCHER ----------------

function setupTitleWatcher() {
    const titleEl = document.querySelector('title');
    if (!titleEl) return;

    const observer = new MutationObserver(() => {
        if (location.href !== State.lastUrl) {
            State.lastUrl = location.href;
            console.log("[InternHelper] Navigation detected");

            disconnectObservers();
            setupGlobalWatcher();
        }
    });

    observer.observe(titleEl, { childList: true });
}

// ---------------- INIT ----------------

function init() {
    setupGlobalWatcher();
    setupTitleWatcher();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
