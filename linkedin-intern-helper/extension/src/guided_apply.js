// guided_apply.js — EASY APPLY ONLY (Simplify-style)
// ─────────────────────────────────────────────────────────────
// • Only /jobs/view/. Hard route gate. Single engine instance. No search/feed/preload.
// • Trigger only when Easy Apply detected on job view. No auto-navigation. No job card clicks.
// ─────────────────────────────────────────────────────────────

(function () {
  "use strict";

  if (window !== window.top) return;
  if (typeof window !== "undefined" && window.__internHelperLoaded) return;
  window.__internHelperLoaded = true;

  const MODE = "EASY_APPLY_ONLY";

  const STATE = {
    IDLE: "IDLE",
    EASY_APPLY_CLICKED: "EASY_APPLY_CLICKED",
    FORM_ACTIVE: "FORM_ACTIVE",
    FORM_FILLED: "FORM_FILLED",
    DONE: "DONE",
  };

  const MAX_ITERATIONS = 40;
  const TICK_MIN_MS = 800;
  const TICK_MAX_MS = 1200;
  const NEXT_SCROLL_WAIT_MS = 300;

  let state = STATE.IDLE;
  let iteration = 0;
  let profile = {};
  let easyApplyClickedOnce = false;
  let tickTimeoutId = null;

  // single active engine flag (defaults to false)
  if (typeof window === "object" && typeof window.__internHelperRunning !== "boolean") {
    window.__internHelperRunning = false;
  }

  function log(msg) {
    try {
      console.log("[InternHelper]", msg);
    } catch (_) {}
  }

  function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // ─── React-safe fill (native setter + events) ─────────────────
  function setNativeValue(element, value) {
    try {
      const proto = Object.getPrototypeOf(element);
      const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
      if (!descriptor || !descriptor.set) return;
      descriptor.set.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (_) {}
  }

  function isVisible(el) {
    try {
      return el && typeof el.offsetParent !== "undefined" && el.offsetParent !== null;
    } catch (_) {
      return false;
    }
  }

  // ─── HARD ROUTE GATE: only /jobs/view/ ──────────────────────────────────────

  function isBlockedRoute() {
    try {
      const path = (location.pathname || "").toLowerCase();
      if (path.startsWith("/jobs/view/")) return false;
      if (path.includes("/jobs/search")) return true;
      if (path.includes("/feed")) return true;
      if (path.includes("/preload")) return true;
      if (path.includes("/messaging")) return true;
      if (path.includes("/notifications")) return true;
      if (path.startsWith("/jobs/")) return true;
      return true;
    } catch (_) {
      return true;
    }
  }

  function isJobViewPage() {
    try {
      return (location.pathname || "").startsWith("/jobs/view/");
    } catch (_) {
      return false;
    }
  }

  function hasEasyApplyOnPage() {
    try {
      const byControl = document.querySelector('[data-control-name="jobdetails_topcard_inapply"]');
      if (byControl && isVisible(byControl)) return true;
      const btn = findEasyApplyButton();
      return btn !== null;
    } catch (_) {
      return false;
    }
  }

  function getJobContainer() {
    try {
      return document.querySelector(".jobs-details__main-content") ||
        document.querySelector(".jobs-search__job-details--container");
    } catch (_) {
      return null;
    }
  }

  // ─── Modal: any dialog container (prefer role, no fragile class-only) ───
  function getModal() {
    try {
      const byRole = document.querySelector('div[role="dialog"]');
      if (byRole && isVisible(byRole)) return byRole;
      const byClass = document.querySelector(".jobs-easy-apply-modal");
      if (byClass && isVisible(byClass)) return byClass;
      return null;
    } catch (_) {
      return null;
    }
  }

  // Form is active only if: at least one visible input AND a Next/Review/Submit button exists
  function isFormActive(modal) {
    if (!modal) return false;
    try {
      const inputs = modal.querySelectorAll("input:not([type=\"hidden\"]), textarea, select");
      const hasVisibleInput = Array.from(inputs).some(function (el) {
        return isVisible(el);
      });
      if (!hasVisibleInput) return false;
      const buttons = modal.querySelectorAll("button");
      const actionTexts = ["next", "review", "submit"];
      const hasActionButton = Array.from(buttons).some(function (b) {
        if (!isVisible(b)) return false;
        const text = (b.innerText || b.textContent || "").toLowerCase().trim();
        const aria = (b.getAttribute("aria-label") || "").toLowerCase();
        return actionTexts.some(function (t) {
          return text.includes(t) || aria.includes(t);
        });
      });
      return hasActionButton;
    } catch (_) {
      return false;
    }
  }

  function getActionButton(modal) {
    if (!modal) return null;
    try {
      const buttons = modal.querySelectorAll("button");
      for (let i = 0; i < buttons.length; i++) {
        const b = buttons[i];
        if (!isVisible(b) || b.disabled) continue;
        const text = (b.innerText || b.textContent || "").toLowerCase().trim();
        const aria = (b.getAttribute("aria-label") || "").toLowerCase();
        if (text.includes("submit") || aria.includes("submit application")) return { el: b, type: "submit" };
        if (text.includes("review") || aria.includes("review")) return { el: b, type: "review" };
        if (text.includes("next") || aria.includes("next") || text === "continue") return { el: b, type: "next" };
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  function getVisibleRequiredInputs(modal) {
    if (!modal) return [];
    try {
      const nodes = modal.querySelectorAll("input:not([type=\"hidden\"]), textarea, select");
      const out = [];
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i];
        if (!isVisible(el)) continue;
        const required = el.getAttribute("aria-required") === "true" || el.hasAttribute("required");
        const looksRequired = !required && (el.type === "tel" || el.type === "email");
        if (required || looksRequired) out.push(el);
      }
      // If no explicit required, treat visible empty inputs as fillable
      if (out.length === 0) {
        for (let j = 0; j < nodes.length; j++) {
          const el = nodes[j];
          if (isVisible(el) && (el.tagName === "SELECT" || el.type !== "checkbox" && el.type !== "radio")) out.push(el);
        }
      }
      return out;
    } catch (_) {
      return [];
    }
  }

  function hasValidationErrors(modal) {
    if (!modal) return false;
    try {
      const invalid = modal.querySelectorAll("[aria-invalid=\"true\"]");
      return invalid.length > 0;
    } catch (_) {
      return false;
    }
  }

  function getLabelText(field) {
    try {
      if (field.id) {
        const label = document.querySelector("label[for=\"" + field.id + "\"]");
        if (label && label.innerText) return label.innerText.toLowerCase().trim();
      }
      const aria = field.getAttribute("aria-label");
      if (aria) return aria.toLowerCase().trim();
      const parent = field.closest("div");
      if (parent) {
        const nearest = parent.querySelector("label");
        if (nearest && nearest.innerText) return nearest.innerText.toLowerCase().trim();
      }
      return (field.placeholder || field.name || "").toLowerCase().trim();
    } catch (_) {
      return "";
    }
  }

  function getValueForField(field, labelText) {
    const type = (field.type || "").toLowerCase();
    const label = (labelText || "").toLowerCase();
    const full = (profile.full_name || "").trim();
    const parts = full ? full.split(/\s+/) : [];
    const first = parts[0] || "";
    const last = parts.slice(1).join(" ") || "";

    if (type === "tel" || label.includes("phone") || label.includes("mobile") || label.includes("contact"))
      return (profile.phone && String(profile.phone).trim()) ? String(profile.phone).trim() : "";
    if (type === "email" || label.includes("email"))
      return (profile.email && String(profile.email).trim()) ? String(profile.email).trim() : "";
    if (label.includes("first name")) return first;
    if (label.includes("last name")) return last;
    if (label.includes("name")) return full || first || last || "";
    return "";
  }

  function fillRequiredFields(modal) {
    const inputs = getVisibleRequiredInputs(modal);
    let filled = 0;
    for (let i = 0; i < inputs.length; i++) {
      const field = inputs[i];
      try {
        const cur = (field.value || "").trim();
        if (cur.length > 0) continue; // never overwrite
        const labelText = getLabelText(field);
        const value = getValueForField(field, labelText);
        if (!value) continue;
        if (field.tagName === "SELECT") {
          const opt = Array.from(field.options).find(function (o) {
            return (o.text || o.value || "").toLowerCase().includes(value.toLowerCase());
          });
          if (opt) {
            field.value = opt.value;
            field.dispatchEvent(new Event("change", { bubbles: true }));
            filled++;
          }
        } else {
          setNativeValue(field, value);
          filled++;
        }
      } catch (_) {}
    }
    return filled;
  }

  function allRequiredFilled(modal) {
    const inputs = getVisibleRequiredInputs(modal);
    for (let i = 0; i < inputs.length; i++) {
      const el = inputs[i];
      const v = (el.value || "").trim();
      if (v.length === 0) return false;
    }
    return true;
  }

  function clickPrimary(modal) {
    const action = getActionButton(modal);
    if (!action) return null;
    try {
      action.el.scrollIntoView({ behavior: "instant", block: "center" });
      setTimeout(function () {
        try {
          action.el.click();
        } catch (_) {}
      }, NEXT_SCROLL_WAIT_MS);
    } catch (_) {}
    return action.type;
  }

  function findEasyApplyButton() {
    try {
      const byControl = document.querySelector('[data-control-name="jobdetails_topcard_inapply"]');
      if (byControl && isVisible(byControl)) return byControl;
      const easyBtn = [...document.querySelectorAll("button")].find(function (btn) {
        if (!isVisible(btn)) return false;
        const text = (btn.innerText || btn.textContent || "").trim().toLowerCase();
        const aria = (btn.getAttribute("aria-label") || "").trim().toLowerCase();
        return text.includes("easy apply") || aria.includes("easy apply");
      });
      return easyBtn || null;
    } catch (_) {
      return null;
    }
  }

  function runTick() {
    tickTimeoutId = null;
    if (state === STATE.DONE || state === STATE.IDLE) return;

    // Allow modal-based flows even on search pages; otherwise require /jobs/view/
    const modal = getModal();
    if (!isJobViewPage() && !modal) {
      log("Not a job view page and no modal. Halting.");
      state = STATE.DONE;
      if (typeof window !== "undefined") window.__internHelperRunning = false;
      return;
    }

    log("Loop tick executing");
    iteration++;
    if (iteration > MAX_ITERATIONS) {
      log("Max iterations reached. Stopping.");
      state = STATE.DONE;
      if (typeof window !== "undefined") window.__internHelperRunning = false;
      return;
    }

    switch (state) {
      case STATE.EASY_APPLY_CLICKED: {
        const jobContainer = getJobContainer();
        if (!jobContainer && !modal) {
          log("Job container not found; stopping loop.");
          state = STATE.DONE;
          return;
        }
        if (isFormActive(modal)) {
          state = STATE.FORM_ACTIVE;
          log("Form active.");
          scheduleTick();
          return;
        }
        scheduleTick();
        return;
      }

      case STATE.FORM_ACTIVE: {
        if (!modal || !isFormActive(modal)) {
          scheduleTick();
          return;
        }
        if (hasValidationErrors(modal)) {
          scheduleTick();
          return;
        }
        fillRequiredFields(modal);
        if (!allRequiredFilled(modal)) {
          scheduleTick();
          return;
        }
        state = STATE.FORM_FILLED;
        scheduleTick();
        return;
      }

      case STATE.FORM_FILLED: {
        if (!modal || !isFormActive(modal)) {
          scheduleTick();
          return;
        }
        if (hasValidationErrors(modal)) {
          state = STATE.FORM_ACTIVE;
          scheduleTick();
          return;
        }
        if (!allRequiredFilled(modal)) {
          state = STATE.FORM_ACTIVE;
          scheduleTick();
          return;
        }
        const actionType = clickPrimary(modal);
        if (actionType === "submit") {
          state = STATE.DONE;
          log("Submit clicked. Flow complete.");
          if (typeof window !== "undefined") window.__internHelperRunning = false;
        } else {
          // "next" or "review" behave like a step advance
          state = STATE.FORM_ACTIVE;
        }
        scheduleTick();
        return;
      }

      default:
        scheduleTick();
    }
  }

  function scheduleTick() {
    if (state === STATE.DONE || state === STATE.IDLE) return;
    const delay = randomBetween(TICK_MIN_MS, TICK_MAX_MS);
    tickTimeoutId = setTimeout(runTick, delay);
  }

  function startFlow() {
    if (state !== STATE.IDLE) return;
    if (!isJobViewPage()) {
      log("START_AUTOFILL ignored: not a job view page.");
      return;
    }
    if (!document.querySelector(".jobs-search__job-details--container") && !getJobContainer()) {
      log("START_AUTOFILL ignored: job container not found.");
      return;
    }
    iteration = 0;
    easyApplyClickedOnce = false;
    state = STATE.EASY_APPLY_CLICKED;
    log("START_AUTOFILL received. Starting state machine.");

    const modal = getModal();
    if (isFormActive(modal)) {
      state = STATE.FORM_ACTIVE;
      log("Form already active.");
      scheduleTick();
      return;
    }

    // Try immediately; if not found, ticks will keep waiting in EASY_APPLY_CLICKED
    const easyBtn = findEasyApplyButton();
    if (easyBtn && !modal) {
      try {
        easyBtn.scrollIntoView({ behavior: "instant", block: "center" });
        setTimeout(function () {
          try {
            easyBtn.click();
            easyApplyClickedOnce = true;
            log("Easy Apply clicked once.");
          } catch (_) {}
        }, 200);
      } catch (_) {}
    }

    scheduleTick();
  }

  function stopFlow() {
    if (tickTimeoutId) {
      clearTimeout(tickTimeoutId);
      tickTimeoutId = null;
    }
    state = STATE.IDLE;
    if (typeof window !== "undefined") window.__internHelperRunning = false;
  }

  function AutomationController() {
    log("AutomationController constructed");
  }

  AutomationController.prototype.start = function () {
    log("AutomationController started");
    if (state !== STATE.IDLE) return;
    if (!isJobViewPage()) return;
    if (!document.querySelector(".jobs-search__job-details--container") && !getJobContainer()) return;
    if (!hasEasyApplyOnPage()) {
      log("Easy Apply button not found; not starting.");
      return;
    }

    function runStart() {
      startFlow();
    }

    const immediateBtn = findEasyApplyButton();
    if (immediateBtn) {
      log("Easy Apply button present immediately.");
      runStart();
      return;
    }

    const btnObserver = new MutationObserver(function () {
      const btn = findEasyApplyButton();
      if (btn) {
        log("Easy Apply button detected via observer.");
        btnObserver.disconnect();
        runStart();
      }
    });
    if (document.body) btnObserver.observe(document.body, { childList: true, subtree: true });
  };

  let waitForJobContainerInterval = null;
  let waitForJobContainerTimeout = null;

  function clearWaitForJobContainer() {
    if (waitForJobContainerInterval) {
      clearInterval(waitForJobContainerInterval);
      waitForJobContainerInterval = null;
    }
    if (waitForJobContainerTimeout) {
      clearTimeout(waitForJobContainerTimeout);
      waitForJobContainerTimeout = null;
    }
  }

  function startAutomation() {
    stopFlow();
    if (window.__internHelperRunning) return;
    window.__internHelperRunning = true;
    new AutomationController().start();
  }

  function initEngine() {
    if (!isJobViewPage()) {
      log("Engine disabled: not job view page.");
      return;
    }
    if (isBlockedRoute()) {
      log("Engine disabled: blocked route.");
      return;
    }
    if (window.__internHelperRunning) return;

    if (!hasEasyApplyOnPage()) {
      log("No Easy Apply → engine idle.");
      return;
    }

    clearWaitForJobContainer();
    const container = document.querySelector(".jobs-search__job-details--container");
    if (container) {
      log("Job container found. Starting engine.");
      startAutomation();
      return;
    }

    log("Waiting for job container...");
    const maxWaitMs = 25000;
    waitForJobContainerTimeout = setTimeout(function () {
      clearWaitForJobContainer();
      log("Job container wait timed out.");
    }, maxWaitMs);
    waitForJobContainerInterval = setInterval(function () {
      const el = document.querySelector(".jobs-search__job-details--container");
      if (el && hasEasyApplyOnPage()) {
        clearWaitForJobContainer();
        log("Job container found. Starting engine.");
        startAutomation();
      }
    }, 500);
  }

  let lastUrl = location.href;
  const routeObserver = new MutationObserver(function () {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      if (isJobViewPage()) {
        log("SPA route change detected (job view): " + lastUrl);
        initEngine();
      } else {
        if (window.__internHelperRunning) stopFlow();
        clearWaitForJobContainer();
      }
    }
  });

  function attachSpaRouteWatcher() {
    routeObserver.observe(document, { subtree: true, childList: true });
    if (isJobViewPage() && !isBlockedRoute()) initEngine();
  }

  if (document.body) {
    attachSpaRouteWatcher();
  } else {
    window.addEventListener("DOMContentLoaded", attachSpaRouteWatcher);
  }

  // Modal watcher: when Easy Apply modal appears (user clicked Easy Apply), start fill + next
  function maybeStartFormEngineFromOpenModal() {
    if (typeof window === "object" && window.__internHelperRunning) return;
    const modal = getModal();
    if (!modal) return;
    // Modal open = user already clicked Easy Apply; don't require button still visible
    iteration = 0;
    easyApplyClickedOnce = true;
    state = isFormActive(modal) ? STATE.FORM_ACTIVE : STATE.EASY_APPLY_CLICKED;
    if (typeof window === "object") window.__internHelperRunning = true;
    log("Easy Apply modal detected. Starting form engine.");
    scheduleTick();
  }

  const modalObserver = new MutationObserver(function () {
    setTimeout(maybeStartFormEngineFromOpenModal, 400);
  });

  function attachModalWatcher() {
    if (!document.body) return;
    modalObserver.observe(document.body, { childList: true, subtree: true });
    maybeStartFormEngineFromOpenModal();
  }

  if (document.body) {
    attachModalWatcher();
  } else {
    window.addEventListener("DOMContentLoaded", attachModalWatcher);
  }

  chrome.runtime.onMessage.addListener(function (message, _sender, sendResponse) {
    try {
      if (message.type === "START_AUTOFILL" || message.type === "START_GUIDED_APPLY") {
        profile = message.profile || {};
        const modal = getModal();
        if (modal && isFormActive(modal)) {
          log("START_AUTOFILL: modal open, starting form engine.");
          if (window.__internHelperRunning) { sendResponse({ success: true }); return false; }
          iteration = 0;
          easyApplyClickedOnce = true;
          state = STATE.FORM_ACTIVE;
          window.__internHelperRunning = true;
          scheduleTick();
          sendResponse({ success: true });
          return false;
        }
        if (!isJobViewPage()) {
          log("Engine disabled: not job view page.");
          sendResponse({ success: false });
          return false;
        }
        if (!hasEasyApplyOnPage()) {
          log("No Easy Apply → engine idle.");
          sendResponse({ success: false });
          return false;
        }
        startFlow();
        sendResponse({ success: true });
      } else if (message.type === "STOP_GUIDED_APPLY") {
        stopFlow();
        sendResponse({ success: true });
      }
    } catch (_) {
      sendResponse({ success: false });
    }
    return false;
  });

  (function init() {
    try {
      chrome.storage.local.get(["guidedProfile", "guidedSessionActive"], function (stored) {
        if (stored.guidedSessionActive && stored.guidedProfile) {
          profile = stored.guidedProfile;
          log("Profile loaded from storage.");
        }
      });
    } catch (_) {}
    log("Content script loaded.");
  })();
})();
