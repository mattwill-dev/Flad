"use strict";
/**
 * NSXCore screensaver domain — custom screensaver photos stored on the gateway.
 *
 * Photos live in their own store namespace (NOT the main `NSX` settings
 * namespace) so the settings fetch stays small. One key per photo, so adding
 * or removing one never rewrites the others (and concurrent devices don't
 * clobber each other). Values are { dataUrl, addedAt }; order is by addedAt.
 *
 * Registered on NSXCore:
 *   Selectors: getScreensaverImages() -> [{ id, dataUrl, addedAt }]
 *   Commands:  loadScreensaverImages(), addScreensaverImage(dataUrl),
 *              removeScreensaverImage(id), clearScreensaverImages()
 */
(function () {
  const NSXCore = window.NSXCore;
  if (!NSXCore) {
    console.error("[NSXCore.screensaver] core.js must load before domains/screensaver.js");
    return;
  }

  const NS = "NSX-screensaver";
  const KEY_PREFIX = "img-";

  let _images = [];

  function api(name) {
    const fn = (window.NSXApi || {})[name];
    if (typeof fn !== "function") throw new Error(`NSXApi.${name} not available`);
    return fn;
  }

  /** Turn the namespace dict into a sorted image list (pure; exported for tests). */
  function parseScreensaverNamespace(dict) {
    if (!dict || typeof dict !== "object") return [];
    return Object.entries(dict)
      .filter(([k, v]) => k.startsWith(KEY_PREFIX) && typeof v?.dataUrl === "string")
      .map(([id, v]) => ({ id, dataUrl: v.dataUrl, addedAt: Number(v.addedAt) || 0 }))
      .sort((a, b) => a.addedAt - b.addedAt || a.id.localeCompare(b.id));
  }

  function getScreensaverImages() { return _images; }

  async function loadScreensaverImages() {
    _images = parseScreensaverNamespace(await api("getStoreNamespace")(NS));
    return _images;
  }

  async function addScreensaverImage(dataUrl) {
    // Strictly increasing so a multi-photo pick keeps its order.
    const last = _images.length ? _images[_images.length - 1].addedAt : 0;
    const addedAt = Math.max(Date.now(), last + 1);
    const id = `${KEY_PREFIX}${addedAt.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    await api("setStoreValue")(NS, id, { dataUrl, addedAt });
    _images = _images.concat({ id, dataUrl, addedAt });
    return _images;
  }

  async function removeScreensaverImage(id) {
    await api("deleteStoreValue")(NS, id);
    _images = _images.filter(img => img.id !== id);
    return _images;
  }

  async function clearScreensaverImages() {
    const del = api("deleteStoreValue");
    await Promise.all(_images.map(img => del(NS, img.id)));
    _images = [];
  }

  NSXCore.register({
    getScreensaverImages,
    loadScreensaverImages,
    addScreensaverImage,
    removeScreensaverImage,
    clearScreensaverImages,
    parseScreensaverNamespace,
  });
})();
