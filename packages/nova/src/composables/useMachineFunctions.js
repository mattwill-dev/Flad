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
import { boot, profiles, profilesAll, machine, currentWorkflow } from './useCore.js';
import { pushRecipe } from './useRecipe.js';

const { NSXCore, NSXApi } = window;

// After a Forward-flush run, restore the recipe that was loaded before it, so the
// machine is ready to brew again without the user re-selecting it. Armed by
// loadForwardFlush and consumed by the machine-state watcher below.
let restoreRecipeAfterShot = false;
let cleaningShotSeen = false;
watch(
  () => machine.state,
  (state) => {
    if (!restoreRecipeAfterShot) return;
    if (state === 'espresso') { cleaningShotSeen = true; return; }
    // The cleaning shot ran and the machine has settled back to idle → re-push
    // the still-in-memory recipe (its local edits were never touched).
    if (cleaningShotSeen && state === 'idle') {
      restoreRecipeAfterShot = false;
      cleaningShotSeen = false;
      pushRecipe({ silent: true }).catch(() => {});
    }
  }
);

/**
 * Load the "Forward flush" cleaning profile onto the machine as the current
 * workflow, so the user only has to press the machine's espresso button to run
 * the cleaning shot (mirrors NSX's cleaning-profile push: zero dose/yield, no
 * stop-at limit, dummy coffee context). Returns true on success.
 */
export async function loadForwardFlush() {
  const t = window.NSXI18n?.t || ((k) => k);
  // Match "Cleaning/Forward Flush x5" (the .? spans the space); fall back to any
  // cleaning profile whose title mentions flush. Search the visible list first,
  // then the with-hidden list (loading it if needed) in case it's hidden.
  const isFlush = (p) => /forward.?flush/i.test(p?.profile?.title || '');
  const isCleaningFlush = (p) => (p.profile?.beverage_type === 'cleaning') && /flush/i.test(p.profile?.title || '');
  const findIn = (list) => list.find(isFlush) || list.find(isCleaningFlush);
  let record = findIn(profiles.value) || findIn(profilesAll.value);
  if (!record) {
    try { record = findIn(await NSXCore.loadProfilesWithHidden()); } catch { /* ignore */ }
  }
  if (!record) {
    NSXCore.emit('toast', t('cleaning.forwardFlushNotFound'));
    return false;
  }
  if (!NSXCore.canExecuteOperation('setWorkflow')) {
    NSXCore.emit('toast', t('cleaning.forwardFlushBusy'));
    return false;
  }
  try {
    const profile = record.profile;
    const workflow = {
      coffeeRoaster: '—',
      coffeeName: t('cleaning.forwardFlush'),
      grinderModel: '—',
      grinderSetting: '—',
      targetDoseWeight: 0,
      targetYield: 0,
      groupTemp: NSXCore.resolveProfileTemp(profile) ?? 0,
      profileTitle: profile?.title || t('cleaning.forwardFlush'),
      selectedProfileId: record.id,
      profile,
      stopAtWeight: false, // run every frame to completion — no weight/volume stop
    };
    const payload = await NSXCore.buildGatewayPayload(workflow, { scaleConnected: machine.scaleConnected });
    if (!payload) throw new Error('profile could not be resolved');
    await NSXApi.pushWorkflow(payload);
    currentWorkflow.value = payload;
    // Arm the auto-restore: once this cleaning shot has run and the machine is
    // idle again, the previous recipe is pushed back automatically.
    restoreRecipeAfterShot = true;
    cleaningShotSeen = false;
    NSXCore.emit('toast', t('cleaning.forwardFlushLoaded'));
    return true;
  } catch (err) {
    NSXCore.emit('toast', t('cleaning.forwardFlushNotFound') + ': ' + (err?.message || err));
    return false;
  }
}

export const steam = reactive({
  temp: 0, flow: 0, duration: 0, active: null, presets: {}, enabled: true, timerEnabled: true,
});
export const hotwater = reactive({ temp: 0, flow: 0, volume: 0, active: null, presets: {} });
export const flush = reactive({ flow: 0, duration: 0, active: null, presets: {}, timerEnabled: true });

function syncSteam() {
  Object.assign(steam, {
    temp: NSXCore.getSteamTemp(), flow: NSXCore.getSteamFlow(), duration: NSXCore.getSteamDuration(),
    active: NSXCore.getActiveSteamPreset(), presets: NSXCore.getSteamPresets(),
    enabled: NSXCore.isSteamEnabled(), timerEnabled: NSXCore.isSteamTimerEnabled(),
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
    timerEnabled: NSXCore.isFlushTimerEnabled(),
  });
}

NSXCore.on('steamChanged', syncSteam);
NSXCore.on('hotwaterChanged', syncHotwater);
NSXCore.on('flushChanged', syncFlush);
watch(() => boot.done, (done) => { if (done) { syncSteam(); syncHotwater(); syncFlush(); } }, { immediate: true });
