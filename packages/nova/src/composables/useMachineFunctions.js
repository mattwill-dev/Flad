/**
 * Reactive mirrors of the steam/hotwater/flush domains. Unlike profile.js,
 * these domains DO emit a *Changed event on every state change — but
 * hydrateSteam()/hydrateHotwater()/hydrateFlush() (called once in bootCore)
 * set their module state directly without emitting, so a view that mounts
 * before boot finishes would otherwise read pre-hydration defaults. `watch
 * (boot.done, ...)` re-syncs once hydration has actually happened, the same
 * fix useRecipe.js applies to currentWorkflow for the same reason.
 */
import { reactive, watch } from 'vue';
import { boot } from './useCore.js';

const { NSXCore } = window;

export const steam = reactive({
  temp: 0, flow: 0, duration: 0, active: null, presets: {}, enabled: true,
});
export const hotwater = reactive({ temp: 0, flow: 0, volume: 0, active: null, presets: {} });
export const flush = reactive({ flow: 0, duration: 0, active: null, presets: {} });

function syncSteam() {
  Object.assign(steam, {
    temp: NSXCore.getSteamTemp(), flow: NSXCore.getSteamFlow(), duration: NSXCore.getSteamDuration(),
    active: NSXCore.getActiveSteamPreset(), presets: NSXCore.getSteamPresets(), enabled: NSXCore.isSteamEnabled(),
  });
}
function syncHotwater() {
  Object.assign(hotwater, {
    temp: NSXCore.getHotwaterTemp(), flow: NSXCore.getHotwaterFlow(), volume: NSXCore.getHotwaterVolume(),
    active: NSXCore.getActiveHotwaterPreset(), presets: NSXCore.getHotwaterPresets(),
  });
}
function syncFlush() {
  Object.assign(flush, {
    flow: NSXCore.getFlushFlow(), duration: NSXCore.getFlushDuration(),
    active: NSXCore.getActiveFlushPreset(), presets: NSXCore.getFlushPresets(),
  });
}

NSXCore.on('steamChanged', syncSteam);
NSXCore.on('hotwaterChanged', syncHotwater);
NSXCore.on('flushChanged', syncFlush);
watch(() => boot.done, (done) => { if (done) { syncSteam(); syncHotwater(); syncFlush(); } }, { immediate: true });
