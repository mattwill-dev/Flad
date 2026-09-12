"use strict";
/**
 * NSXCore steam domain — headless state + logic for the steam wand.
 *
 * Owns steamPresets / activeSteamPreset / steamTemp / steamFlow / steamDuration /
 * steamEnabled. Persists through the core store; pushes steamSettings to the
 * machine.
 *
 * A custom (non-preset) temp/flow/duration triple is persisted under
 * nsx_steam_custom so it survives a reload/reconnect instead of silently
 * reverting to a preset's stored value (hydrateSteam() only falls back to
 * the first preset when there's no valid custom snapshot at all).
 *
 * Registered on NSXCore:
 *   Selectors: getSteamTemp(), getSteamFlow(), getSteamDuration(), getSteamPresets(),
 *              getActiveSteamPreset(), getActiveSteamPresetName(), isSteamEnabled()
 *   Commands:  selectSteamPreset(name), deactivateSteamPreset(),
 *              setSteamTemp(v), setSteamFlow(v), setSteamDuration(v),
 *              setSteamEnabled(enabled), setSteamPresets(next), hydrateSteam()
 *   Events:    'steamChanged' -> { temp, flow, duration, active, presets, enabled }
 */
(function () {
  const NSXCore = window.NSXCore;
  if (!NSXCore) {
    console.error("[NSXCore.steam] core.js must load before domains/steam.js");
    return;
  }

  const t = window.NSXI18n?.t || ((k) => k);

  const PRESET_DEFAULTS = {
    normal: { name: t("steam.small"), temp: 165, flow: 1.0, duration: 60 },
    stark:  { name: t("steam.large"), temp: 165, flow: 1.5, duration: 60 },
  };

  let presets  = JSON.parse(JSON.stringify(PRESET_DEFAULTS));
  let active   = "normal";
  let temp     = presets[active].temp;
  let flow     = presets[active].flow;
  let duration = presets[active].duration ?? 60;
  let enabled  = true;

  const clampTemp     = (v) => Math.min(165, Math.max(100, v));
  const clampFlow     = (v) => Math.round(Math.min(4.0, Math.max(0.5, v)) * 10) / 10;
  const clampDuration = (v) => Math.min(180, Math.max(1, v));

  function emitChanged() {
    NSXCore.emit("steamChanged", { temp, flow, duration, active, presets, enabled });
  }

  // ── Push helpers ─────────────────────────────────────────────────────────
  function pushAll() {
    NSXCore.debounced("steam", () =>
      NSXCore.push({ steamSettings: { targetTemperature: parseFloat(temp), flow: parseFloat(flow), duration: parseFloat(duration) } }));
  }
  function pushTemp() {
    NSXCore.debounced("steamTemp", () =>
      NSXCore.push({ steamSettings: { targetTemperature: parseFloat(temp) } }));
  }
  function pushFlow() {
    NSXCore.debounced("steamFlow", () =>
      NSXCore.push({ steamSettings: { flow: parseFloat(flow) } }));
  }
  function pushDuration() {
    NSXCore.debounced("steamDuration", () =>
      NSXCore.push({ steamSettings: { duration: parseFloat(duration) } }));
  }
  function pushEnabled() {
    const pushSteamSettings = (window.NSXApi || {}).pushSteamSettings;
    if (typeof pushSteamSettings !== "function") return;
    if (enabled) {
      pushSteamSettings(temp, flow).catch(() => {});
    } else {
      pushSteamSettings(0, 0).catch(() => {});
    }
  }

  // ── Commands ─────────────────────────────────────────────────────────────
  function selectSteamPreset(name) {
    if (!presets[name]) return;
    active   = name;
    temp     = presets[name].temp;
    flow     = presets[name].flow;
    duration = presets[name].duration ?? 60;
    NSXCore.saveActivePresetName("nsx_steam_active_preset", name);
    emitChanged();
    pushAll();
  }

  function saveCustomSteamValue() {
    NSXCore.patchStore({ nsx_steam_custom: { temp, flow, duration } });
  }

  function deactivateSteamPreset() {
    active = null;
    NSXCore.saveActivePresetName("nsx_steam_active_preset", "");
    saveCustomSteamValue();
    emitChanged();
  }

  function setSteamTemp(v) {
    temp = clampTemp(v);
    active = null;
    NSXCore.saveActivePresetName("nsx_steam_active_preset", "");
    saveCustomSteamValue();
    emitChanged();
    pushTemp();
  }

  function setSteamFlow(v) {
    flow = clampFlow(v);
    active = null;
    NSXCore.saveActivePresetName("nsx_steam_active_preset", "");
    saveCustomSteamValue();
    emitChanged();
    pushFlow();
  }

  function setSteamDuration(v) {
    duration = clampDuration(v);
    active = null;
    NSXCore.saveActivePresetName("nsx_steam_active_preset", "");
    saveCustomSteamValue();
    emitChanged();
    pushDuration();
  }

  function setSteamEnabled(en) {
    enabled = Boolean(en);
    NSXCore.patchStore({ nsx_steam_enabled: enabled });
    emitChanged();
    pushEnabled();
  }

  function setSteamPresets(next) {
    if (!next || typeof next !== "object") return;
    presets = next;
    NSXCore.patchStore({ nsx_steam_presets: presets });
    if (active && presets[active]) {
      temp     = presets[active].temp;
      flow     = presets[active].flow;
      duration = presets[active].duration ?? 60;
      pushAll();
    }
    emitChanged();
  }

  function getActiveSteamPresetName() {
    return active && presets[active] ? (presets[active].name ?? null) : null;
  }

  function mergeByDefaults(defaults, stored) {
    const out = {};
    for (const key of Object.keys(defaults)) {
      out[key] = { ...defaults[key], ...(stored && typeof stored === "object" ? stored[key] : undefined) };
    }
    return out;
  }

  // ── Hydration ─────────────────────────────────────────────────────────────
  function hydrateSteam() {
    const s = NSXCore.getStore();

    if (s.nsx_steam_presets && typeof s.nsx_steam_presets === "object") {
      presets = mergeByDefaults(PRESET_DEFAULTS, s.nsx_steam_presets);
    }

    const savedActive = s.nsx_steam_active_preset;
    if (typeof savedActive === "string" && savedActive && presets[savedActive]) {
      active = savedActive;
    } else if (savedActive === "" || savedActive === null) {
      active = null;
    } else if (typeof savedActive === "string" && savedActive) {
      // Stale key from a removed preset (e.g. an old "schwach") — fall back
      // to the first remaining preset instead of silently keeping whatever
      // `active` happened to already be.
      active = Object.keys(presets)[0] ?? null;
    }

    if (typeof s.nsx_steam_enabled === "boolean") enabled = s.nsx_steam_enabled;

    if (active && presets[active]) {
      const state = presets[active];
      temp     = state.temp;
      flow     = state.flow;
      duration = state.duration ?? 60;
    } else {
      const custom = s.nsx_steam_custom;
      if (
        custom && typeof custom === "object" &&
        Number.isFinite(Number(custom.temp)) &&
        Number.isFinite(Number(custom.flow)) &&
        Number.isFinite(Number(custom.duration))
      ) {
        temp     = clampTemp(Number(custom.temp));
        flow     = clampFlow(Number(custom.flow));
        duration = clampDuration(Number(custom.duration));
      } else {
        const fallback = presets[Object.keys(presets)[0]];
        temp     = fallback.temp;
        flow     = fallback.flow;
        duration = fallback.duration ?? 60;
      }
    }
  }

  NSXCore.register({
    // Selectors
    getSteamTemp:           () => temp,
    getSteamFlow:           () => flow,
    getSteamDuration:       () => duration,
    getSteamPresets:        () => presets,
    getActiveSteamPreset:   () => active,
    getActiveSteamPresetName,
    isSteamEnabled:         () => enabled,
    // Commands
    selectSteamPreset,
    deactivateSteamPreset,
    setSteamTemp,
    setSteamFlow,
    setSteamDuration,
    setSteamEnabled,
    setSteamPresets,
    hydrateSteam,
    // Expose defaults for drafts in the settings modal (read-only reference)
    STEAM_PRESET_DEFAULTS: PRESET_DEFAULTS,
  });
})();
