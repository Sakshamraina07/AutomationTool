// lever_apply.js — Form fill + Next/Submit for Lever-embedded apply forms (runs in iframe)
// Only runs when embedded (window.parent !== window) so we don't run on direct lever.co visits

(function () {
  "use strict";

  if (window === window.top) return; // Only run when embedded (e.g. in LinkedIn modal)
  if (typeof window.__leverApplyLoaded !== "undefined") return;
  window.__leverApplyLoaded = true;

  const TICK_MS = 1000;
  let tickId = null;
  let profile = { full_name: "", phone: "", email: "" };

  function log(msg) {
    try { console.log("[InternHelper-Lever]", msg); } catch (_) {}
  }

  function setNativeValue(el, value) {
    try {
      const tag = (el.tagName || "").toLowerCase();
      const str = value == null ? "" : String(value);
      if (tag === "textarea") {
        const d = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value");
        if (d && d.set) d.set.call(el, str);
        else el.value = str;
      } else {
        const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
        if (d && d.set) d.set.call(el, str);
        else el.value = str;
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("blur", { bubbles: true }));
    } catch (_) {}
  }

  function isVisible(el) {
    try { return el && el.offsetParent !== null; } catch (_) { return false; }
  }

  function getInputs() {
    try {
      return Array.from(document.querySelectorAll("input:not([type=hidden]):not([type=radio]):not([type=checkbox]), textarea, select"))
        .filter(el => isVisible(el) && !el.disabled);
    } catch (_) { return []; }
  }

  function getActionButton() {
    try {
      const btns = Array.from(document.querySelectorAll("button")).filter(b => isVisible(b) && !b.disabled);
      const txt = (t) => (t.innerText || t.textContent || "").toLowerCase().trim();
      const aria = (t) => (t.getAttribute("aria-label") || "").toLowerCase().trim();
      for (const b of btns) {
        const t = txt(b);
        const a = aria(b);
        if (t.includes("submit") || a.includes("submit")) return { el: b, type: "submit" };
        if (t.includes("review") || a.includes("review")) return { el: b, type: "review" };
        if (t.includes("next") || t === "continue" || a.includes("next")) return { el: b, type: "next" };
      }
      return null;
    } catch (_) { return null; }
  }

  function getLabel(field) {
    try {
      const doc = field.ownerDocument || document;
      if (field.id) {
        const lb = doc.querySelector("label[for=\"" + field.id + "\"]");
        if (lb && lb.innerText) return lb.innerText.toLowerCase().trim();
      }
      const parent = field.closest("div, fieldset");
      if (parent) {
        const lb = parent.querySelector("label");
        if (lb && lb.innerText) return lb.innerText.toLowerCase().trim();
      }
      return (field.placeholder || field.name || field.getAttribute("aria-label") || "").toLowerCase().trim();
    } catch (_) { return ""; }
  }

  function getValueForField(field, label) {
    const type = (field.type || "").toLowerCase();
    const tag = (field.tagName || "").toLowerCase();
    const full = (profile.full_name || "").trim();
    const parts = full ? full.split(/\s+/) : [];
    const first = parts[0] || "";
    const last = parts.slice(1).join(" ") || "";

    if (type === "tel" || (label && (label.includes("phone") || label.includes("mobile")))) return profile.phone || "";
    if (type === "email" || (label && label.includes("email"))) return profile.email || "";
    if (label && label.includes("first name")) return first;
    if (label && label.includes("last name")) return last;
    if (label && label.includes("name")) return full || first || last || "";
    return "";
  }

  function fillAndClick() {
    const inputs = getInputs();
    let filled = 0;
    for (const field of inputs) {
      try {
        const cur = (field.value || "").trim();
        if (cur.length > 0) continue;
        const label = getLabel(field);
        const value = getValueForField(field, label);
        if (!value) continue;

        if (field.tagName === "SELECT") {
          const opt = Array.from(field.options).find(o =>
            (o.text || o.value || "").toLowerCase().includes(value.toLowerCase())
          );
          if (opt) {
            field.value = opt.value;
            field.dispatchEvent(new Event("change", { bubbles: true }));
            filled++;
            log("Selected: " + (opt.text || opt.value));
          }
        } else {
          setNativeValue(field, value);
          filled++;
          log("Filled: " + label + " → " + value);
        }
      } catch (_) {}
    }

    const action = getActionButton();
    if (action) {
      try {
        action.el.scrollIntoView({ behavior: "instant", block: "center" });
        setTimeout(() => {
          try {
            action.el.click();
            log("Clicked: " + action.type);
          } catch (_) {}
        }, 300);
      } catch (_) {}
    } else {
      log("No Next/Submit button found.");
    }
  }

  function runTick() {
    tickId = null;
    fillAndClick();
    const action = getActionButton();
    if (action) {
      const inputs = getInputs();
      const allFilled = inputs.length === 0 || inputs.every(el => (el.value || "").trim().length > 0);
      if (allFilled) {
        try {
          action.el.scrollIntoView({ behavior: "instant", block: "center" });
          setTimeout(() => {
            try {
              action.el.click();
              log("Clicked: " + action.type);
              if (action.type === "submit") {
                if (tickId) clearTimeout(tickId);
                tickId = null;
                return;
              }
            } catch (_) {}
          }, 400);
        } catch (_) {}
      }
    }
    tickId = setTimeout(runTick, TICK_MS);
  }

  function start() {
    chrome.storage.local.get(["userProfile"], (res) => {
      if (res && res.userProfile) profile = res.userProfile;
      log("Lever form detected. Starting fill + next.");
      runTick();
    });
  }

  const obs = new MutationObserver(() => {
    if (!tickId && document.body) {
      const action = getActionButton();
      if (action) start();
    }
  });

  if (document.body) {
    const action = getActionButton();
    if (action) start();
    else obs.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      const action = getActionButton();
      if (action) start();
      else obs.observe(document.body, { childList: true, subtree: true });
    });
  }
})();
