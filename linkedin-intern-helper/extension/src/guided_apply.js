// guided_apply.js — EASY APPLY ONLY (Simplify-style)
// ─────────────────────────────────────────────────────────────
// • Only /jobs/view/. Hard route gate. Single engine instance. No search/feed/preload.
// • Trigger only when Easy Apply detected on job view. No auto-navigation. No job card clicks.
// • Fix: Ollama async no longer blocks allRequiredFilled → Next is always clicked after fill.
// ─────────────────────────────────────────────────────────────

(function () {
  "use strict";

  if (window !== window.top) return;
  if (typeof window !== "undefined" && window.__internHelperLoaded) return;
  window.__internHelperLoaded = true;

  const STATE = {
    IDLE: "IDLE",
    EASY_APPLY_CLICKED: "EASY_APPLY_CLICKED",
    FORM_ACTIVE: "FORM_ACTIVE",
    FORM_FILLED: "FORM_FILLED",
    DONE: "DONE",
  };

  const MAX_ITERATIONS = 60;
  const TICK_MIN_MS = 900;
  const TICK_MAX_MS = 1300;
  const NEXT_SCROLL_WAIT_MS = 300;
  // How long to wait for Ollama fields before giving up and proceeding anyway
  const OLLAMA_TIMEOUT_TICKS = 8;

  let state = STATE.IDLE;
  let iteration = 0;
  let profile = {};
  let easyApplyClickedOnce = false;
  let tickTimeoutId = null;
  // Count ticks spent waiting for Ollama responses
  let ollamaWaitTicks = 0;
  // Observer to react quickly to dynamic modal re-renders
  let stepModalObserver = null;
  let stepModalObserved = null;

  if (typeof window === "object" && typeof window.__internHelperRunning !== "boolean") {
    window.__internHelperRunning = false;
  }

  function log(msg) {
    try { console.log("[InternHelper]", msg); } catch (_) { }
  }

  function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // ─── React-safe fill (native setter + events) ─────────────────
  function setNativeValue(element, value) {
    try {
      const tag = (element.tagName || "").toLowerCase();
      const strValue = value == null ? "" : String(value);

      if (tag === "textarea") {
        const desc = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value");
        if (desc && typeof desc.set === "function") {
          desc.set.call(element, strValue);
        } else {
          element.value = strValue;
        }
      } else {
        const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
        if (desc && typeof desc.set === "function") {
          desc.set.call(element, strValue);
        } else {
          element.value = strValue;
        }
      }

      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      element.dispatchEvent(new Event("blur", { bubbles: true }));
    } catch (_) { }
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

  // ─── Modal: any dialog container; also supports iframe-embedded forms (Lever, etc.) ───
  function getModal() {
    try {
      const byRole = document.querySelector('div[role="dialog"]');
      const byClass = document.querySelector(".jobs-easy-apply-modal");
      const root = (byRole && isVisible(byRole)) ? byRole : (byClass && isVisible(byClass)) ? byClass : null;
      if (!root) return null;

      // If modal contains an iframe (Lever, Greenhouse, etc.), use iframe's document when same-origin
      const iframe = root.querySelector("iframe");
      if (iframe && iframe.contentDocument && iframe.contentDocument.body) {
        const doc = iframe.contentDocument;
        const hasForm = doc.querySelector("input, textarea, select") && doc.querySelector("button");
        if (hasForm) {
          log("getModal: using iframe document (Lever/ATS form).");
          return { root: root, doc: doc };
        }
      }
      return root;
    } catch (_) {
      return null;
    }
  }

  function getModalRoot(modal) {
    return modal && modal.root ? modal.root : modal;
  }

  function getModalDoc(modal) {
    return modal && modal.doc ? modal.doc : document;
  }

  function queryModal(modal, selector) {
    if (!modal) return [];
    if (modal.doc) return modal.doc.querySelectorAll(selector);
    return modal.querySelectorAll(selector);
  }

  function isFormActive(modal) {
    if (!modal) return false;
    try {
      const inputs = queryModal(modal, "input:not([type=\"hidden\"]), textarea, select");
      const hasVisibleInput = Array.from(inputs).some(function (el) {
        return isVisible(el);
      });
      if (!hasVisibleInput) return false;

      const buttons = queryModal(modal, "button");
      const actionTexts = ["next", "review", "submit", "continue", "apply", "submit application"];
      const hasActionButton = Array.from(buttons).some(function (b) {
        if (!isVisible(b)) return false;
        const text = (b.innerText || b.textContent || "").toLowerCase().trim();
        const aria = (b.getAttribute("aria-label") || "").toLowerCase().trim();
        return actionTexts.some(function (t) {
          return text.includes(t) || aria.includes(t);
        });
      });
      if (hasActionButton) log("isFormActive: action button detected.");
      return hasActionButton;
    } catch (_) {
      return false;
    }
  }

  function getActionButton(modal) {
    if (!modal) return null;
    try {
      const buttons = queryModal(modal, "button");
      for (let i = 0; i < buttons.length; i++) {
        const b = buttons[i];
        if (!isVisible(b)) continue;
        const text = (b.innerText || b.textContent || "").toLowerCase().trim();
        const aria = (b.getAttribute("aria-label") || "").toLowerCase().trim();
        const disabled = !!b.disabled || (b.getAttribute("aria-disabled") || "").toLowerCase().trim() === "true";
        if (disabled) {
          if (text || aria) log("getActionButton: skipping disabled button \"" + text + "\" (" + aria + ")");
          continue;
        }
        if (text.includes("submit") || aria.includes("submit application") || aria.includes("submit")) {
          log("getActionButton: using SUBMIT button \"" + text + "\" (" + aria + ")");
          return { el: b, type: "submit" };
        }
        if (text.includes("apply") || aria.includes("apply")) {
          log("getActionButton: using APPLY-as-submit button \"" + text + "\" (" + aria + ")");
          return { el: b, type: "submit" };
        }
        if (text.includes("review") || aria.includes("review")) {
          log("getActionButton: using REVIEW button \"" + text + "\" (" + aria + ")");
          return { el: b, type: "review" };
        }
        if (text.includes("next") || aria.includes("next") || text === "continue" || aria === "continue") {
          log("getActionButton: using NEXT/CONTINUE button \"" + text + "\" (" + aria + ")");
          return { el: b, type: "next" };
        }
      }
      log("getActionButton: no suitable action button found.");
      return null;
    } catch (_) {
      return null;
    }
  }

  function getVisibleRequiredInputs(modal) {
    if (!modal) return [];
    try {
      const nodes = queryModal(modal, "input:not([type=\"hidden\"]), textarea, select");
      const out = [];
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i];
        if (!isVisible(el)) continue;
        const required = el.getAttribute("aria-required") === "true" || el.hasAttribute("required");
        const looksRequired = !required && (el.type === "tel" || el.type === "email");
        if (required || looksRequired) out.push(el);
      }
      // If no explicit required, treat all visible non-checkbox/radio inputs as fillable
      if (out.length === 0) {
        for (let j = 0; j < nodes.length; j++) {
          const el = nodes[j];
          if (isVisible(el) && (el.tagName === "SELECT" || (el.type !== "checkbox" && el.type !== "radio"))) out.push(el);
        }
      }
      log("getVisibleRequiredInputs: found " + out.length + " candidate required/important fields.");
      return out;
    } catch (_) {
      return [];
    }
  }

  function hasValidationErrors(modal) {
    if (!modal) return false;
    try {
      const invalid = queryModal(modal, "[aria-invalid=\"true\"]");
      return invalid.length > 0;
    } catch (_) {
      return false;
    }
  }

  function getLabelText(field) {
    try {
      const doc = field && field.ownerDocument ? field.ownerDocument : document;
      if (field && field.id) {
        const label = doc.querySelector("label[for=\"" + field.id + "\"]");
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

  function looksLikeAdditionalQuestion(field, labelText) {
    try {
      const txt = (labelText || field.placeholder || field.name || "").toLowerCase();
      if (!txt) return true;
      // These have dedicated fast-fill handlers — don't route to Ollama
      if (txt.includes("phone") || txt.includes("mobile")) return false;
      if (txt.includes("email")) return false;
      if (txt.includes("first name") || txt.includes("last name") || txt.includes("name")) return false;
      if (txt.includes("city") || txt.includes("location") || txt.includes("address")) return false;
      // Everything else → Ollama
      return true;
    } catch (_) {
      return false;
    }
  }

  // ─── LinkedIn location autocomplete handler ──────────────────────────────
  function isLocationField(field, labelText) {
    const txt = (labelText || field.placeholder || field.name || "").toLowerCase();
    return txt.includes("city") || txt.includes("location") || txt.includes("address");
  }

  function fillLocationAutocomplete(field, value) {
    if (!value) return;
    field.dataset.ihLocationStatus = "pending";
    log("fillLocationAutocomplete: typing city: " + value);

    // Step 1: type the city value to trigger autocomplete
    setNativeValue(field, value);
    try {
      field.dispatchEvent(new KeyboardEvent("keydown", { key: value[0], keyCode: value.charCodeAt(0), bubbles: true }));
    } catch (_) { }

    // Step 2: poll for dropdown; click first suggestion
    var attempts = 0;
    var maxAttempts = 16; // 4 seconds max (16 x 250ms)
    var pollId = setInterval(function () {
      attempts++;
      try {
        // Try standard role=listbox dropdown
        var listbox = document.querySelector('[role="listbox"]') ||
          document.querySelector(".basic-typeahead__triggered-content");
        if (listbox) {
          var firstOpt = listbox.querySelector('[role="option"]') || listbox.querySelector("li");
          if (firstOpt && isVisible(firstOpt)) {
            clearInterval(pollId);
            firstOpt.click();
            log("fillLocationAutocomplete: selected — " + (firstOpt.innerText || "").trim());
            field.dataset.ihLocationStatus = "done";
            wakeEngine();
            return;
          }
        }
        // Try aria-controls / aria-owns
        var controlId = field.getAttribute("aria-controls") || field.getAttribute("aria-owns");
        if (controlId) {
          var list = document.getElementById(controlId);
          if (list) {
            var opt = list.querySelector('[role="option"]') || list.querySelector("li");
            if (opt && isVisible(opt)) {
              clearInterval(pollId);
              opt.click();
              log("fillLocationAutocomplete: selected via aria-controls");
              field.dataset.ihLocationStatus = "done";
              wakeEngine();
              return;
            }
          }
        }
      } catch (_) { }
      if (attempts >= maxAttempts) {
        clearInterval(pollId);
        log("fillLocationAutocomplete: timeout. field value=" + (field.value || ""));
        field.dataset.ihLocationStatus = "done";
        wakeEngine();
      }
    }, 250);
  }

  function wakeEngine() {
    if (state === STATE.FORM_ACTIVE || state === STATE.FORM_FILLED) {
      if (tickTimeoutId) { clearTimeout(tickTimeoutId); tickTimeoutId = null; }
      tickTimeoutId = setTimeout(runTick, 600);
    }
  }

  function getValueForField(field, labelText) {
    const type = (field.type || "").toLowerCase();
    const label = (labelText || "").toLowerCase();
    const full = (profile.full_name || profile.name || "").trim();
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
    if (label.includes("city")) return profile.city || "";
    if (label.includes("location") || label.includes("address")) return profile.location || "";
    return "";
  }

  // ─── FIX: After Ollama fills a field, wake up the engine immediately ──────
  function onOllamaFilled() {
    // If we're waiting for Ollama fields, re-schedule a tick right away
    if (state === STATE.FORM_ACTIVE || state === STATE.FORM_FILLED) {
      if (tickTimeoutId) {
        clearTimeout(tickTimeoutId);
        tickTimeoutId = null;
      }
      ollamaWaitTicks = 0;
      tickTimeoutId = setTimeout(runTick, 500);
    }
  }

  function fillRequiredFields(modal) {
    const inputs = getVisibleRequiredInputs(modal);
    let filled = 0;
    for (let i = 0; i < inputs.length; i++) {
      const field = inputs[i];
      try {
        const cur = (field.value || "").trim();
        if (cur.length > 0) continue; // never overwrite existing value

        const labelText = getLabelText(field);
        const value = getValueForField(field, labelText);

        // ─── Location autocomplete (LinkedIn combobox — must poll for dropdown) ───
        if (isLocationField(field, labelText)) {
          if (field.dataset.ihLocationStatus !== "pending" && field.dataset.ihLocationStatus !== "done") {
            fillLocationAutocomplete(field, profile.city || "Pune");
          }
          continue; // handled asynchronously
        }

        if (!value) {
          // ─── Ollama fallback for open-ended / additional questions ───
          if (looksLikeAdditionalQuestion(field, labelText)) {
            // Only fire once per field; don't re-fire if already pending or done
            if (field.dataset.ihLlmStatus !== "pending" && field.dataset.ihLlmStatus !== "done") {
              field.dataset.ihLlmStatus = "pending";
              const question = labelText || field.placeholder || field.name || "";
              if (field.tagName === "SELECT") {
                // Multiple-choice: pass options to Ollama and map answer back to an option
                const opts = Array.from(field.options)
                  .map(function (o) { return (o.text || o.value || "").trim(); })
                  .filter(function (t) { return t.length > 0; });
                log("Asking Ollama (select) for: " + question + " with options: " + opts.join(" | "));
                try {
                  chrome.runtime.sendMessage(
                    {
                      type: "ASK_OLLAMA",
                      questionText: question,
                      jobDescription: "General Internship",
                      options: opts
                    },
                    function (res) {
                      try {
                        if (chrome.runtime && chrome.runtime.lastError) {
                          field.dataset.ihLlmStatus = "done";
                          onOllamaFilled();
                          return;
                        }
                        if (!res || !res.success || !res.answer) {
                          field.dataset.ihLlmStatus = "done";
                          onOllamaFilled();
                          return;
                        }
                        const raw = String(res.answer || "").toLowerCase().trim();
                        let chosen = null;
                        // 1) exact text match
                        chosen = Array.from(field.options).find(function (o) {
                          return (o.text || o.value || "").toLowerCase().trim() === raw;
                        });
                        // 2) substring / contains match
                        if (!chosen && raw) {
                          chosen = Array.from(field.options).find(function (o) {
                            const t = (o.text || o.value || "").toLowerCase().trim();
                            return t.includes(raw) || raw.includes(t);
                          });
                        }
                        // 3) yes/no style fallbacks
                        if (!chosen) {
                          if (raw.startsWith("y")) {
                            chosen = Array.from(field.options).find(function (o) {
                              const t = (o.text || o.value || "").toLowerCase();
                              return t.includes("yes") || t.includes("y");
                            });
                          } else if (raw.startsWith("n")) {
                            chosen = Array.from(field.options).find(function (o) {
                              const t = (o.text || o.value || "").toLowerCase();
                              return t.includes("no") || t.includes("n");
                            });
                          }
                        }
                        if (chosen) {
                          field.value = chosen.value;
                          field.dispatchEvent(new Event("change", { bubbles: true }));
                          log("Ollama selected option: " + (chosen.text || chosen.value) + " for " + question);
                        } else {
                          log("Ollama answer did not match any option for: " + question + " (answer=\"" + raw + "\")");
                        }
                        field.dataset.ihLlmStatus = "done";
                        onOllamaFilled();
                      } catch (_) {
                        field.dataset.ihLlmStatus = "done";
                        onOllamaFilled();
                      }
                    }
                  );
                } catch (_) {
                  field.dataset.ihLlmStatus = "done";
                }
              } else {
                // Text / textarea: free-form answer
                log("Asking Ollama for: " + question);
                try {
                  chrome.runtime.sendMessage(
                    {
                      type: "ASK_OLLAMA",
                      questionText: question,
                      jobDescription: "General Internship"
                    },
                    function (res) {
                      try {
                        if (chrome.runtime && chrome.runtime.lastError) {
                          field.dataset.ihLlmStatus = "done";
                          onOllamaFilled();
                          return;
                        }
                        if (!res || !res.success || !res.answer) {
                          field.dataset.ihLlmStatus = "done";
                          onOllamaFilled();
                          return;
                        }
                        setNativeValue(field, res.answer);
                        field.dataset.ihLlmStatus = "done";
                        log("Ollama filled field: " + question + " → " + res.answer);
                        // ─── Wake the engine after Ollama fills ───
                        onOllamaFilled();
                      } catch (_) {
                        field.dataset.ihLlmStatus = "done";
                        onOllamaFilled();
                      }
                    }
                  );
                } catch (_) {
                  field.dataset.ihLlmStatus = "done";
                }
              }
            }
          }
          continue;
        }

        // Guard: if a required text/textarea remains empty after mapping and is not handled by Ollama,
        // log it so we can debug instead of silently blocking Next.
        const type = (field.type || "").toLowerCase();
        const tag = (field.tagName || "").toLowerCase();
        const required = field.getAttribute("aria-required") === "true" || field.hasAttribute("required");
        if (required && (tag === "input" || tag === "textarea") && (type === "text" || type === "")) {
          log("fillRequiredFields: required field still empty after mapping: \"" + (labelText || field.name || field.placeholder || "") + "\"");
        }

        if (field.tagName === "SELECT") {
          const opt = Array.from(field.options).find(function (o) {
            return (o.text || o.value || "").toLowerCase().includes(value.toLowerCase());
          });
          if (opt) {
            field.value = opt.value;
            field.dispatchEvent(new Event("change", { bubbles: true }));
            log("fillRequiredFields: selected option \"" + opt.text + "\" for \"" + (labelText || field.name || field.placeholder || "") + "\"");
            filled++;
          } else {
            log("fillRequiredFields: no matching option for value \"" + value + "\" on \"" + (labelText || field.name || field.placeholder || "") + "\"");
          }
        } else {
          setNativeValue(field, value);
          const applied = ((field.value || "").trim() === String(value).trim());
          if (applied) {
            log("fillRequiredFields: filled \"" + (labelText || field.name || field.placeholder || "") + "\" → \"" + value + "\"");
            filled++;
          } else {
            log("fillRequiredFields: value did not stick for \"" + (labelText || field.name || field.placeholder || "") + "\"; current=\"" + (field.value || "") + "\"");
          }
        }
      } catch (_) { }
    }
    return filled;
  }

  // ─── FIX: allRequiredFilled now skips Ollama-managed fields ───────────────
  // A field counts as "handled" if:
  //   - It has a value, OR
  //   - Ollama is pending/done for it (we'll wait for onOllamaFilled to re-tick, or move on after timeout)
  function allRequiredFilled(modal) {
    const inputs = getVisibleRequiredInputs(modal);
    for (let i = 0; i < inputs.length; i++) {
      const el = inputs[i];
      const v = (el.value || "").trim();
      if (v.length === 0) {
        // Skip if Ollama or location autocomplete is handling this field
        const llmStatus = el.dataset.ihLlmStatus;
        if (llmStatus === "pending" || llmStatus === "done") continue;
        const locStatus = el.dataset.ihLocationStatus;
        if (locStatus === "pending" || locStatus === "done") continue;
        return false;
      }
    }
    return true;
  }

  // Returns true if any visible field is still waiting on Ollama
  function hasOllamaPending(modal) {
    const inputs = getVisibleRequiredInputs(modal);
    for (let i = 0; i < inputs.length; i++) {
      const el = inputs[i];
      if (el && el.dataset && el.dataset.ihLlmStatus === "pending") return true;
    }
    return false;
  }

  function clickPrimary(modal) {
    const action = getActionButton(modal);
    if (!action) {
      log("clickPrimary: no action button to click.");
      return null;
    }
    try {
      log("clickPrimary: attempting to click \"" + action.type + "\" button.");
      action.el.scrollIntoView({ behavior: "instant", block: "center" });
      setTimeout(function () {
        try {
          action.el.click();
          log("Clicked: " + action.type);
        } catch (_) { }
      }, NEXT_SCROLL_WAIT_MS);
    } catch (_) { }
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

    const modal = getModal();

    // Keep a lightweight observer on the active modal so we can re-scan quickly when it re-renders
    try {
      if (!stepModalObserver) {
        stepModalObserver = new MutationObserver(function () {
          if (state === STATE.DONE || state === STATE.IDLE) return;
          if (!tickTimeoutId) {
            log("stepModalObserver: modal mutated, scheduling immediate tick.");
            tickTimeoutId = setTimeout(runTick, randomBetween(TICK_MIN_MS, TICK_MAX_MS));
          }
        });
      }
      if (modal && stepModalObserved !== modal) {
        if (stepModalObserved) stepModalObserver.disconnect();
        stepModalObserver.observe(modal, { childList: true, subtree: true });
        stepModalObserved = modal;
      } else if (!modal && stepModalObserved) {
        stepModalObserver.disconnect();
        stepModalObserved = null;
      }
    } catch (_) { }
    if (!isJobViewPage() && !modal) {
      log("Not a job view page and no modal. Halting.");
      state = STATE.DONE;
      if (typeof window !== "undefined") window.__internHelperRunning = false;
      return;
    }

    log("Tick [" + state + "] iter=" + iteration);
    iteration++;
    if (iteration > MAX_ITERATIONS) {
      log("Max iterations reached. Stopping.");
      state = STATE.DONE;
      if (typeof window !== "undefined") window.__internHelperRunning = false;
      return;
    }

    switch (state) {

      case STATE.EASY_APPLY_CLICKED: {
        if (isFormActive(modal)) {
          ollamaWaitTicks = 0;
          state = STATE.FORM_ACTIVE;
          log("Form active — starting fill.");
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
          log("Validation errors — waiting.");
          scheduleTick();
          return;
        }

        // Fill all fields we can (Ollama fields fire async)
        fillRequiredFields(modal);

        // Check if Ollama is still working
        if (hasOllamaPending(modal)) {
          ollamaWaitTicks++;
          if (ollamaWaitTicks < OLLAMA_TIMEOUT_TICKS) {
            log("Waiting for Ollama (" + ollamaWaitTicks + "/" + OLLAMA_TIMEOUT_TICKS + ")...");
            scheduleTick();
            return;
          }
          // Timeout reached — proceed anyway so we don't hang forever
          log("Ollama timeout — proceeding to click Next anyway.");
        }

        if (!allRequiredFilled(modal)) {
          // If LinkedIn shows a clickable Next/Review/Submit and there are no visible validation
          // errors, treat this step as complete even if our heuristic can't see every required field.
          const action = getActionButton(modal);
          if (!action || hasValidationErrors(modal)) {
            scheduleTick();
            return;
          }
        }

        ollamaWaitTicks = 0;
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
          ollamaWaitTicks = 0;
          scheduleTick();
          return;
        }
        if (!allRequiredFilled(modal)) {
          state = STATE.FORM_ACTIVE;
          ollamaWaitTicks = 0;
          scheduleTick();
          return;
        }
        const actionType = clickPrimary(modal);
        log("Action clicked: " + actionType);
        if (actionType === "submit") {
          state = STATE.DONE;
          log("Submit clicked. Flow complete!");
          if (typeof window !== "undefined") window.__internHelperRunning = false;
        } else {
          // next / review → more steps ahead
          state = STATE.FORM_ACTIVE;
          ollamaWaitTicks = 0;
          iteration = 0; // reset iteration per-step so we don't hit MAX_ITERATIONS mid-flow
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
    if (tickTimeoutId) return; // don't double-schedule
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
    ollamaWaitTicks = 0;
    easyApplyClickedOnce = false;
    state = STATE.EASY_APPLY_CLICKED;
    log("START_AUTOFILL received. Starting state machine.");

    const modal = getModal();
    if (isFormActive(modal)) {
      state = STATE.FORM_ACTIVE;
      log("Form already active on startFlow.");
      scheduleTick();
      return;
    }

    const easyBtn = findEasyApplyButton();
    if (easyBtn && !modal) {
      try {
        easyBtn.scrollIntoView({ behavior: "instant", block: "center" });
        setTimeout(function () {
          try {
            easyBtn.click();
            easyApplyClickedOnce = true;
            log("Easy Apply clicked once.");
          } catch (_) { }
        }, 200);
      } catch (_) { }
    }

    scheduleTick();
  }

  function stopFlow() {
    if (tickTimeoutId) {
      clearTimeout(tickTimeoutId);
      tickTimeoutId = null;
    }
    state = STATE.IDLE;
    ollamaWaitTicks = 0;
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

    const immediateBtn = findEasyApplyButton();
    if (immediateBtn) {
      log("Easy Apply button present immediately.");
      startFlow();
      return;
    }

    const btnObserver = new MutationObserver(function () {
      const btn = findEasyApplyButton();
      if (btn) {
        log("Easy Apply button detected via observer.");
        btnObserver.disconnect();
        startFlow();
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

  // ─── Modal watcher: when user manually clicks Easy Apply, start engine ────
  function maybeStartFormEngineFromOpenModal() {
    if (typeof window === "object" && window.__internHelperRunning) return;
    const modal = getModal();
    if (!modal) return;
    iteration = 0;
    ollamaWaitTicks = 0;
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

  // ─── Message listener ────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener(function (message, _sender, sendResponse) {
    try {
      if (message.type === "START_AUTOFILL" || message.type === "START_GUIDED_APPLY") {
        profile = message.profile || {};
        const modal = getModal();
        if (modal && isFormActive(modal)) {
          log("START_AUTOFILL: modal open, starting form engine.");
          if (window.__internHelperRunning) { sendResponse({ success: true }); return false; }
          iteration = 0;
          ollamaWaitTicks = 0;
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

  // ─── Init: load profile from storage ─────────────────────────────────────
  (function init() {
    try {
      chrome.storage.local.get(["guidedProfile", "guidedSessionActive"], function (stored) {
        if (stored.guidedSessionActive && stored.guidedProfile) {
          profile = stored.guidedProfile;
          log("Profile loaded from storage.");
        }
      });
    } catch (_) { }
    log("Content script loaded (v2 — Ollama async fix).");
  })();
})();
