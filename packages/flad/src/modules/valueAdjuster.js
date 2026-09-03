/**
 * valueAdjuster.js
 *
 * Full-screen drag-ruler number picker — ported from the Bestpresso skin's
 * ValueAdjustmentProvider (React) to vanilla JS. Ruler-drag (single finger),
 * tap-to-type keypad entry, remembered per-field preset chips, and a light
 * Web Audio tick as the value steps. No multi-finger step gestures (dropped
 * on request — single-finger drag only).
 *
 * Usage: window.NSXValueAdjuster.open({
 *   label, value, min, max, step, mode: 'integer'|'decimal', unit,
 *   suggestionKey, presets, valueHint, onSave,
 * })
 *
 * Depends on: nothing (maps to #value-adjuster-modal in index.html)
 */
"use strict";

(() => {
  const SUGGESTION_STORAGE_KEY = "flad.value-adjuster-suggestions.v1";
  const MAX_SUGGESTIONS = 8;
  const DIRECT_ENTRY_PREVIEW_MS = 1500;

  const modalEl = document.getElementById("value-adjuster-modal");
  const labelEl = document.getElementById("va-label");
  const valueBtnEl = document.getElementById("va-value-btn");
  const valueTextEl = document.getElementById("va-value-text");
  const unitEl = document.getElementById("va-unit");
  const directTextEl = document.getElementById("va-direct-text");
  const validationEl = document.getElementById("va-validation");
  const scrubberEl = document.getElementById("va-scrubber");
  const labelsEl = document.getElementById("va-labels");
  const ticksEl = document.getElementById("va-ticks");
  const keypadEl = document.getElementById("va-keypad");
  const presetRowEl = document.getElementById("va-preset-row");
  const cancelBtnEl = document.getElementById("va-cancel");
  const saveBtnEl = document.getElementById("va-save");
  const keypadDismissEl = document.getElementById("va-keypad-dismiss");

  if (!modalEl) return;

  /* ── Pure helpers (ported from valueAdjustmentGestures.ts) ─────── */

  function roundTo(value, decimals) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  function normalizedValue(value, req) {
    const clamped = Math.min(req.max, Math.max(req.min, value));
    const steps = Math.round((clamped - req.min) / req.step);
    const stepped = req.min + steps * req.step;
    return roundTo(stepped, req.mode === "decimal" ? 1 : 0);
  }

  function clampedValue(value, req) {
    return Math.min(req.max, Math.max(req.min, value));
  }

  function formatValue(value, mode) {
    return mode === "decimal" ? value.toFixed(1) : String(Math.round(value));
  }

  function formatSuggestion(value, mode) {
    return mode === "decimal" && !Number.isInteger(value)
      ? value.toFixed(1)
      : String(value);
  }

  function normalizedNumericDraft(value) {
    return value.replace(",", ".");
  }

  function numericDraftRangeIssue(value, min, max) {
    const normalized = normalizedNumericDraft(value);
    if (!normalized || normalized === ".") return "required";
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return "required";
    if (parsed < min) return "below";
    if (parsed > max) return "above";
    return null;
  }

  function appendNumericKey(value, key, replaceExisting) {
    if (!/^\d$/.test(key) && key !== ".") return value;
    if (key === ".") {
      if (!replaceExisting && value.includes(".")) return value;
      return replaceExisting || value === "" ? "0." : `${value}.`;
    }
    if (replaceExisting) return key;
    if (value === "0") return key;
    return `${value}${key}`;
  }

  function removeNumericKey(value) {
    return value.slice(0, -1);
  }

  /* ── Suggestion memory (localStorage, per suggestionKey) ────────── */

  function readSuggestionStore() {
    try {
      const parsed = JSON.parse(
        window.localStorage.getItem(SUGGESTION_STORAGE_KEY) || "{}",
      );
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }

  function writeSuggestionStore(store) {
    try {
      window.localStorage.setItem(SUGGESTION_STORAGE_KEY, JSON.stringify(store));
    } catch {
      // Suggestion memory is optional when storage is unavailable or full.
    }
  }

  function normalizedSuggestions(values, req) {
    const seen = new Set();
    const out = [];
    for (const v of values) {
      if (!Number.isFinite(v)) continue;
      const n = normalizedValue(v, req);
      if (n < req.min || n > req.max || seen.has(n)) continue;
      seen.add(n);
      out.push(n);
    }
    return out.slice(-MAX_SUGGESTIONS).sort((a, b) => a - b);
  }

  function rememberSuggestion(nextValue) {
    const selected = normalizedValue(nextValue, req);
    const store = readSuggestionStore();
    const hasHistory = Object.prototype.hasOwnProperty.call(
      store,
      req.suggestionKey,
    );
    const source = hasHistory ? store[req.suggestionKey] || [] : req.presets || [];
    let next = normalizedSuggestions(source, req).filter((v) => v !== selected);
    if (next.length >= MAX_SUGGESTIONS) next = next.slice(1);
    next.push(selected);
    store[req.suggestionKey] = next.slice(-MAX_SUGGESTIONS).sort((a, b) => a - b);
    writeSuggestionStore(store);
  }

  function currentPresets() {
    const store = readSuggestionStore();
    const hasHistory = Object.prototype.hasOwnProperty.call(
      store,
      req.suggestionKey,
    );
    const source = hasHistory ? store[req.suggestionKey] || [] : req.presets || [];
    return normalizedSuggestions(source, req);
  }

  /* ── Audio tick feedback ─────────────────────────────────────────── */

  let audioContext = null;
  let lastFeedbackValue = null;
  let lastFeedbackAt = 0;

  function prepareAudio() {
    if (!audioContext && typeof window.AudioContext !== "undefined") {
      try {
        audioContext = new window.AudioContext();
      } catch {
        return;
      }
    }
    if (audioContext?.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
  }

  function playTone(freq, gainPeak, durationS) {
    if (!audioContext || audioContext.state !== "running") return;
    try {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const startedAt = audioContext.currentTime;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(freq, startedAt);
      gain.gain.setValueAtTime(0.0001, startedAt);
      gain.gain.exponentialRampToValueAtTime(gainPeak, startedAt + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, startedAt + durationS);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.addEventListener(
        "ended",
        () => {
          oscillator.disconnect();
          gain.disconnect();
        },
        { once: true },
      );
      oscillator.start(startedAt);
      oscillator.stop(startedAt + durationS + 0.005);
    } catch {
      // Audio feedback is a progressive enhancement; picker stays usable without it.
    }
  }

  function playKeypadFeedback() {
    prepareAudio();
    playTone(520, 0.018, 0.026);
  }

  function playStepFeedback(nextValue) {
    const selected = normalizedValue(nextValue, req);
    if (selected === lastFeedbackValue) return;
    lastFeedbackValue = selected;
    const now = performance.now();
    if (now - lastFeedbackAt < 32) return;
    lastFeedbackAt = now;
    playTone(req.mode === "integer" ? 460 : 560, 0.014, 0.026);
  }

  /* ── State ───────────────────────────────────────────────────────── */

  let req = null;
  let value = 0;
  let visualValue = 0;
  let editingValue = false;
  let draftValue = "";
  let replaceDraftOnKey = false;
  let animationFrame = null;
  let directEntryTimer = null;
  let dragState = null;

  function stopAnimation() {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }

  /* ── Rendering ───────────────────────────────────────────────────── */

  function renderValue() {
    if (editingValue) {
      valueBtnEl.hidden = true;
      directTextEl.hidden = false;
      directTextEl.textContent = draftValue || "—";
    } else {
      valueBtnEl.hidden = false;
      directTextEl.hidden = true;
      valueTextEl.textContent = formatValue(visualValue, req.mode);
    }
    unitEl.textContent = req.unit || "";
    unitEl.hidden = !req.unit;

    const issue = editingValue
      ? numericDraftRangeIssue(draftValue, req.min, req.max)
      : null;
    if (issue === "above") {
      validationEl.textContent = `Maximum is ${req.max.toLocaleString()}.`;
      validationEl.hidden = false;
    } else if (issue === "below") {
      validationEl.textContent = `Minimum is ${req.min.toLocaleString()}.`;
      validationEl.hidden = false;
    } else if (issue === "required") {
      validationEl.textContent = "Enter a number.";
      validationEl.hidden = false;
    } else {
      validationEl.hidden = true;
    }
    saveBtnEl.disabled = issue === "above" || issue === "below" || issue === "required";
  }

  function renderRuler() {
    const centerLabel = Math.round(visualValue);
    let labelsHtml = "";
    for (let i = 0; i < 9; i++) {
      const label = centerLabel + i - 4;
      const inRange = label >= req.min && label <= req.max;
      const isCenter = label === centerLabel;
      labelsHtml += `<span data-distance="${Math.abs(i - 4)}">${inRange && !isCenter ? label : ""}</span>`;
    }
    labelsEl.innerHTML = labelsHtml;

    const minorTickStep = req.mode === "decimal" ? 0.1 : 0.25;
    const tickAnchor = Math.floor(visualValue / minorTickStep) * minorTickStep;
    const tickCount = req.mode === "decimal" ? 101 : 41;
    const centerIndex = req.mode === "decimal" ? 50 : 20;
    let ticksHtml = "";
    for (let index = 0; index < tickCount; index++) {
      const offset = index - centerIndex;
      const tickValue = tickAnchor + offset * minorTickStep;
      const left = 50 + (tickValue - visualValue) * 12.5;
      if (left < 0 || left > 100) continue;
      const major = Math.abs(tickValue - Math.round(tickValue)) < 0.001;
      ticksHtml += `<i style="left:${left}%" class="${major ? "value-adjuster__tick--major" : ""}"></i>`;
    }
    ticksEl.innerHTML = ticksHtml;

    scrubberEl.setAttribute("aria-valuemin", String(req.min));
    scrubberEl.setAttribute("aria-valuemax", String(req.max));
    scrubberEl.setAttribute("aria-valuenow", String(value));
    scrubberEl.setAttribute(
      "aria-valuetext",
      `${formatValue(value, req.mode)}${req.unit || ""}`,
    );
  }

  function renderPresets() {
    const presets = currentPresets();
    presetRowEl.innerHTML = presets
      .map((preset) => {
        const active = preset === value ? " value-adjuster__preset--active" : "";
        const unitHtml = req.unit ? `<small>${req.unit}</small>` : "";
        return `<button type="button" class="value-adjuster__preset${active}" data-preset="${preset}">${formatSuggestion(preset, req.mode)}${unitHtml}</button>`;
      })
      .join("");
  }

  function render() {
    labelEl.textContent = req.label;
    keypadEl.hidden = !editingValue;
    presetRowEl.parentElement.hidden = editingValue;
    renderValue();
    renderRuler();
    if (!editingValue) renderPresets();
  }

  /* ── Value transitions ───────────────────────────────────────────── */

  function setImmediateValue(nextValue) {
    stopAnimation();
    const next = normalizedValue(nextValue, req);
    visualValue = next;
    value = next;
    playStepFeedback(next);
    render();
  }

  function animateToValue(nextValue, requestedDuration) {
    const target = normalizedValue(nextValue, req);
    const start = visualValue;
    stopAnimation();
    value = target;

    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (start === target || reduceMotion) {
      visualValue = target;
      render();
      return;
    }

    const distanceInSteps = Math.abs(target - start) / req.step;
    const duration =
      requestedDuration ?? Math.min(720, Math.max(320, 240 + distanceInSteps * 18));
    const startedAt = performance.now();
    const step = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      visualValue = start + (target - start) * eased;
      playStepFeedback(visualValue);
      render();
      if (progress < 1) animationFrame = requestAnimationFrame(step);
      else animationFrame = null;
    };
    animationFrame = requestAnimationFrame(step);
  }

  /* ── Direct (keypad) entry ───────────────────────────────────────── */

  function beginDirectEntry() {
    stopAnimation();
    draftValue = formatValue(normalizedValue(visualValue, req), req.mode);
    replaceDraftOnKey = true;
    editingValue = true;
    render();
  }

  function queueDirectEntry(nextDraft) {
    const normalized = normalizedNumericDraft(nextDraft);
    if (!/^\d*(?:\.\d*)?$/.test(normalized)) return;
    stopAnimation();
    draftValue = normalized;
    if (directEntryTimer !== null) window.clearTimeout(directEntryTimer);
    directEntryTimer = null;
    render();
    if (!normalized || normalized === ".") return;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return;
    directEntryTimer = window.setTimeout(() => {
      directEntryTimer = null;
      animateToValue(parsed, 220);
    }, DIRECT_ENTRY_PREVIEW_MS);
  }

  function commitDirectEntry() {
    if (directEntryTimer !== null) window.clearTimeout(directEntryTimer);
    directEntryTimer = null;
    const normalized = normalizedNumericDraft(draftValue);
    const parsed = Number(normalized);
    if (numericDraftRangeIssue(normalized, req.min, req.max)) return;
    if (Number.isFinite(parsed) && normalized !== "") {
      const next = normalizedValue(parsed, req);
      stopAnimation();
      visualValue = next;
      value = next;
      lastFeedbackValue = next;
    }
    editingValue = false;
    render();
  }

  function cancelDirectEntry() {
    stopAnimation();
    if (directEntryTimer !== null) window.clearTimeout(directEntryTimer);
    directEntryTimer = null;
    editingValue = false;
    render();
  }

  /* ── Ruler drag (single pointer only) ─────────────────────────────── */

  const VISIBLE_STEPS = { decimal: 80, integer: 12 };

  function dragClientX(event) {
    return event.touches ? event.touches[0].clientX : event.clientX;
  }

  function onDragStart(event) {
    if (dragState) return; // single-pointer only
    if (editingValue) {
      const issue = numericDraftRangeIssue(draftValue, req.min, req.max);
      if (issue) cancelDirectEntry();
      else commitDirectEntry();
    }
    prepareAudio();
    stopAnimation();
    const clientX = dragClientX(event);
    const startValue = clampedValue(visualValue, req);
    visualValue = startValue;
    value = normalizedValue(startValue, req);
    lastFeedbackValue = value;
    dragState = { startX: clientX, startValue, moved: false };
    render();
  }

  function onDragMove(event) {
    if (!dragState) return;
    const clientX = dragClientX(event);
    const width = scrubberEl.getBoundingClientRect().width || 1;
    const visibleSteps = VISIBLE_STEPS[req.mode] || 12;
    const stepDelta = (dragState.startX - clientX) / (width / visibleSteps);
    if (Math.abs(stepDelta) >= 0.15) dragState.moved = true;
    const rawValue = dragState.startValue + stepDelta * req.step;
    const next =
      req.mode === "integer"
        ? clampedValue(rawValue, req)
        : normalizedValue(rawValue, req);
    visualValue = next;
    value = normalizedValue(next, req);
    playStepFeedback(value);
    render();
  }

  function onDragEnd() {
    if (!dragState) return;
    dragState = null;
    if (req.mode === "integer") animateToValue(value, 160);
    else setImmediateValue(value);
  }

  /* ── Keyboard (arrow/page/home/end) ───────────────────────────────── */

  function changeBySteps(steps) {
    setImmediateValue(visualValue + steps * req.step);
  }

  function onScrubberKeyDown(event) {
    const key = event.key;
    if (
      ![
        "ArrowLeft",
        "ArrowDown",
        "ArrowRight",
        "ArrowUp",
        "PageDown",
        "PageUp",
        "Home",
        "End",
      ].includes(key)
    ) {
      return;
    }
    prepareAudio();
    if (key === "ArrowLeft" || key === "ArrowDown") changeBySteps(-1);
    else if (key === "ArrowRight" || key === "ArrowUp") changeBySteps(1);
    else if (key === "PageDown") changeBySteps(-10);
    else if (key === "PageUp") changeBySteps(10);
    else if (key === "Home") setImmediateValue(req.min);
    else if (key === "End") setImmediateValue(req.max);
    event.preventDefault();
  }

  /* ── Keypad ──────────────────────────────────────────────────────── */

  keypadEl.addEventListener("click", (event) => {
    const keyBtn = event.target.closest("[data-va-key]");
    if (keyBtn) {
      playKeypadFeedback();
      queueDirectEntry(
        appendNumericKey(draftValue, keyBtn.dataset.vaKey, replaceDraftOnKey),
      );
      replaceDraftOnKey = false;
      return;
    }
    if (event.target.closest("[data-va-action='delete']")) {
      playKeypadFeedback();
      replaceDraftOnKey = false;
      queueDirectEntry(removeNumericKey(draftValue));
    }
  });

  keypadDismissEl?.addEventListener("click", () => {
    playKeypadFeedback();
    commitDirectEntry();
  });

  valueBtnEl?.addEventListener("click", beginDirectEntry);

  /* ── Presets ─────────────────────────────────────────────────────── */

  presetRowEl.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-preset]");
    if (!btn) return;
    prepareAudio();
    animateToValue(Number(btn.dataset.preset));
  });

  /* ── Scrubber pointer wiring (touch + mouse, matching the app's
     existing dual-input convention) ────────────────────────────────── */

  scrubberEl.addEventListener("touchstart", onDragStart, { passive: true });
  scrubberEl.addEventListener("touchmove", onDragMove, { passive: true });
  scrubberEl.addEventListener("touchend", onDragEnd, { passive: true });
  scrubberEl.addEventListener("touchcancel", onDragEnd, { passive: true });
  scrubberEl.addEventListener("mousedown", onDragStart);
  window.addEventListener("mousemove", (event) => {
    if (dragState) onDragMove(event);
  });
  window.addEventListener("mouseup", () => {
    if (dragState) onDragEnd();
  });
  scrubberEl.addEventListener("keydown", onScrubberKeyDown);

  /* ── Open / close ────────────────────────────────────────────────── */

  function close() {
    stopAnimation();
    if (directEntryTimer !== null) window.clearTimeout(directEntryTimer);
    directEntryTimer = null;
    dragState = null;
    editingValue = false;
    modalEl.hidden = true;
    req = null;
  }

  cancelBtnEl?.addEventListener("click", close);

  saveBtnEl?.addEventListener("click", () => {
    if (!req) return;
    if (editingValue) {
      const issue = numericDraftRangeIssue(draftValue, req.min, req.max);
      if (issue) return;
    }
    const savedValue = value;
    rememberSuggestion(savedValue);
    const onSave = req.onSave;
    close();
    onSave?.(savedValue);
  });

  document.addEventListener("keydown", (event) => {
    if (modalEl.hidden || event.key !== "Escape") return;
    if (editingValue) cancelDirectEntry();
    else close();
  });

  function open(options) {
    const min = Number(options.min);
    const max = Number(options.max);
    const step = Number(options.step) || (options.mode === "decimal" ? 0.1 : 1);
    req = {
      label: options.label || "",
      min: Number.isFinite(min) ? min : 0,
      max: Number.isFinite(max) ? max : 100,
      step,
      mode: options.mode === "decimal" ? "decimal" : "integer",
      unit: options.unit || "",
      suggestionKey: options.suggestionKey || options.label || "value",
      presets: Array.isArray(options.presets) ? options.presets : [],
      onSave: options.onSave || null,
    };
    const startValue = Number(options.value);
    value = normalizedValue(Number.isFinite(startValue) ? startValue : req.min, req);
    visualValue = value;
    lastFeedbackValue = value;
    editingValue = false;
    draftValue = "";
    modalEl.hidden = false;
    render();
    scrubberEl.focus({ preventScroll: true });
  }

  window.NSXValueAdjuster = { open, close };
})();
