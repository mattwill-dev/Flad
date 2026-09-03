/**
 * router.js
 *
 * Drives panel navigation: setTab(index) switches the active panel in
 * #panels-track. There is no bottom tab bar — panels are reached
 * programmatically (e.g. the Home shot-history carousel card, or the
 * cleaning-wizard "done" flow) via window.NSXRouter.setTab(index).
 *
 * Depends on: nothing (pure DOM logic)
 */
"use strict";

(() => {

const trackEl     = document.getElementById("panels-track");
const pageTitleEl = document.getElementById("page-title");
const tabItems    = Array.from(document.querySelectorAll(".tab-item"));
const PANEL_N     = document.querySelectorAll(".tab-panel").length;

const TAB_TITLES = () => [
  window.NSXI18n?.t('nav.home')     ?? 'Home',
  window.NSXI18n?.t('nav.history')  ?? 'History',
];

let activeIndex = 0;
let _homeLabelOverride = '';

function setHomeLabelOverride(label) {
  _homeLabelOverride = label || '';
  if (activeIndex === 0 && pageTitleEl) pageTitleEl.textContent = _homeLabelOverride || TAB_TITLES()[0];
}

function setTab(index, animate = true) {
  if (index === activeIndex && animate) return;
  activeIndex = index;

  tabItems.forEach((item, i) => {
    const on = i === index;
    item.classList.toggle("active", on);
    item.setAttribute("aria-selected", String(on));
  });

  if (pageTitleEl) {
    pageTitleEl.textContent = (index === 0 && _homeLabelOverride) ? _homeLabelOverride : (TAB_TITLES()[index] ?? "");
  }

  if (!animate) {
    trackEl.style.transition = "none";
    trackEl.style.transform  = `translateX(-${index * (100 / PANEL_N).toFixed(3)}%)`;
    trackEl.offsetWidth; /* force reflow to apply instantly */
    trackEl.style.transition = "";
  } else {
    trackEl.style.transform = `translateX(-${index * (100 / PANEL_N).toFixed(3)}%)`;
  }

  window.dispatchEvent(new CustomEvent("router:tabchange", { detail: { index } }));
}

/* ── Tab button click ─────────────────────────────────── */
tabItems.forEach((item, i) => item.addEventListener("click", () => setTab(i)));


window.NSXRouter = {
  setTab,
  setHomeLabelOverride,
};
})();
