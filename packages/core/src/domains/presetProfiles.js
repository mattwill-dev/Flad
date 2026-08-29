"use strict";
/**
 * NSXCore presetProfiles domain — a single cache of Decent's bundled
 * factory-default profiles, fetched live from a public GitHub raw URL (not
 * bundled into this repo — neither upstream source repo declares an open
 * license, so a live fetch avoids redistributing their content and stays in
 * sync with upstream edits).
 *
 * Registered on NSXCore:
 *   Selector: getPresetProfiles() — sync, cache-only read (null if not yet loaded)
 *   Command:  loadPresetProfiles(force?)
 */
(function () {
  const NSXCore = window.NSXCore;
  if (!NSXCore) {
    console.error("[NSXCore.presetProfiles] core.js must load before domains/presetProfiles.js");
    return;
  }

  const PRESET_PROFILES_URL =
    "https://raw.githubusercontent.com/decentespresso/streamline-js/main/src/profiles/new_api.json";

  let _cache = null; // null = never successfully loaded; never cached as []

  function getPresetProfiles() { return _cache; }

  async function loadPresetProfiles(force = false) {
    if (_cache?.length && !force) return _cache;
    const res = await fetch(PRESET_PROFILES_URL);
    if (!res.ok) throw new Error(`Gallery fetch failed: HTTP ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    const records = list
      .map((raw) => NSXCore.normalizeProfileRecord(raw))
      .filter(Boolean)
      .filter((r) => r.profile);
    // Never cache an empty/failed result, mirroring profile.js's caches —
    // leaves the prior good value (or null) in place so re-entering gallery
    // mode after a transient failure retries automatically.
    if (!records.length) throw new Error("Gallery response had no usable profiles");
    _cache = records;
    return records;
  }

  NSXCore.register({
    getPresetProfiles,
    loadPresetProfiles,
  });
})();
