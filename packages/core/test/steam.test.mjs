// Covers the steam custom-value persistence fix: a non-preset temp/flow/
// duration value used to live only in memory, so any hydrate (reload, the
// header Refresh button) silently reverted it to the Normal preset. Also
// covers hydrateSteam()'s recovery from a stale preset key left over from a
// removed preset (e.g. the old three-preset "schwach").
import { test } from "node:test";
import assert from "node:assert/strict";
import { setupWindow, loadCoreFile } from "./harness.mjs";

setupWindow();
loadCoreFile("core.js");
loadCoreFile("translations.js");
loadCoreFile("store.js");
loadCoreFile("push.js");
loadCoreFile("domains/steam.js");
const NSXCore = window.NSXCore;

window.NSXApi = { pushWorkflow: async () => {} };

test("setSteamTemp persists the custom value under nsx_steam_custom", () => {
  NSXCore.selectSteamPreset("normal");
  NSXCore.setSteamTemp(150);
  NSXCore.setSteamFlow(2.0);
  NSXCore.setSteamDuration(45);
  assert.deepEqual(NSXCore.getStore().nsx_steam_custom, {
    temp: 150,
    flow: 2.0,
    duration: 45,
  });
  assert.equal(NSXCore.getActiveSteamPreset(), null, "a direct set deactivates the preset");
});

test("hydrateSteam() restores the custom value when no preset is active", () => {
  NSXCore.patchStore({
    nsx_steam_active_preset: "",
    nsx_steam_custom: { temp: 140, flow: 1.8, duration: 30 },
  });
  NSXCore.hydrateSteam();
  assert.equal(NSXCore.getSteamTemp(), 140);
  assert.equal(NSXCore.getSteamFlow(), 1.8);
  assert.equal(NSXCore.getSteamDuration(), 30);
  assert.equal(NSXCore.getActiveSteamPreset(), null);
});

test("hydrateSteam() recovers from a stale active-preset key left over from a removed preset", () => {
  NSXCore.patchStore({ nsx_steam_active_preset: "schwach" });
  NSXCore.hydrateSteam();
  const active = NSXCore.getActiveSteamPreset();
  assert.ok(active && NSXCore.getSteamPresets()[active], "falls back to a real preset key");
  assert.equal(active, Object.keys(NSXCore.getSteamPresets())[0]);
});

test("hydrateSteam() falls back to the first preset when there is no valid custom snapshot at all", () => {
  NSXCore.patchStore({ nsx_steam_active_preset: "", nsx_steam_custom: undefined });
  NSXCore.hydrateSteam();
  const firstKey = Object.keys(NSXCore.getSteamPresets())[0];
  const preset = NSXCore.getSteamPresets()[firstKey];
  assert.equal(NSXCore.getSteamTemp(), preset.temp);
  assert.equal(NSXCore.getSteamFlow(), preset.flow);
});
