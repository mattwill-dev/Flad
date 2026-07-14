/**
 * Sleep and lock are two different things: pressing the power button sleeps the
 * DE1 AND locks the screen, but unlocking (tapping the screensaver) does not have
 * to wake the DE1 back up — see nova_wake_on_unlock in SkinPanel. This composable
 * owns `locked` as skin-local UI state (not core: no other skin needs it).
 *
 * `locked` is set ONLY by explicit lock()/unlock() calls (PowerButton.vue is the
 * one caller of lock()) — it does NOT watch NSXCore's 'machineState' event.
 * That event fires on every machine snapshot (~every 250ms) for as long as the
 * DE1 stays asleep, not just on the transition into sleep, and it fires
 * identically whether sleep was triggered by the power button or by the
 * Settings machine-toggle. Locking off of it caused two bugs: the Settings
 * toggle (which must NEVER lock — the whole point is browsing the skin
 * without heating the machine) locked the screen anyway, and unlocking
 * without waking (wakeOnUnlock off) got re-locked by the very next heartbeat.
 */
import { ref } from 'vue';

const { NSXCore, NSXApi } = window;

export const locked = ref(false);

export function lock() {
  locked.value = true;
  // Dim to the configured screensaver level — a REAL gateway effect, not
  // decorative CSS, so the setting in SkinPanel isn't dead UI.
  const dimLevel = Number(NSXCore.getStore().nova_screensaver_brightness) || 30;
  NSXApi.setDisplayBrightness(dimLevel).catch((err) => {
    console.error('[Nova] failed to dim for lock', err);
  });
}

export async function unlock() {
  locked.value = false;
  // Restore the normal brightness the slider was last set to, regardless of
  // whether the machine itself wakes up below.
  const normalBrightness = Number(NSXCore.getStore().nsx_display_brightness) || 80;
  NSXApi.setDisplayBrightness(normalBrightness).catch((err) => {
    console.error('[Nova] failed to restore brightness on unlock', err);
  });

  const wakeOnUnlock = NSXCore.getStore().nova_wake_on_unlock !== false; // default true
  if (!wakeOnUnlock) return;
  try {
    await NSXApi.setMachineState('idle');
  } catch (err) {
    console.error('[Nova] failed to wake the machine', err);
  }
}

// Boot-only ground-truth sync: if the DE1 is already asleep when Nova loads
// (e.g. a page reload), the screen should start locked too. This does NOT
// become a subscription that keeps firing — see the note above about why
// watching 'machineState' continuously is exactly the bug this file exists to
// avoid. First event only, then never touched again.
let sawFirstState = false;
NSXCore.on('machineState', ({ state }) => {
  if (sawFirstState) return;
  sawFirstState = true;
  if (state === 'sleeping') locked.value = true;
});
