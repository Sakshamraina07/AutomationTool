// guided_apply.js
// Content script injected into LinkedIn job pages to execute Guided Apply logic

import { startJobStateMachine } from "./modules/jobStateMachine.js";

// ==================== SCRIPT START ====================
console.log("[InternHelper] Guided Apply Script Loaded (Ultra Stable)");
let isApplying = false;

chrome.storage.local.get(["sessionState"], (result) => {
  const state = result.sessionState;

  if (state && state.isActive && !state.isPaused) {
    if (!window.location.href.includes("/jobs/view/")) return;

    // Prevent duplicate execution
    if (window.__INTERN_HELPER_LOCK) return;
    window.__INTERN_HELPER_LOCK = true;

    if (isApplying) return;

    const currentJob = state.queue[state.currentIndex];

    // Parse URLs properly without relying on query parameters
    const currentUrl = location.href.split("?")[0];
    const targetUrl = currentJob?.jobUrl?.split("?")[0];

    if (currentJob && currentUrl === targetUrl) {
      isApplying = true;
      console.log(`[InternHelper] Resuming session for: ${currentJob.title}`);
      setTimeout(() => startJobStateMachine(currentJob), 3000);
    } else if (currentJob?.jobUrl?.includes("/jobs/view/")) {
      console.log("[InternHelper] URL mismatch. Background script controls navigation, content script doing nothing.");
    }
  }
});