/**
 * Live shot + the recipe's history screen — one state machine, since "after the
 * shot, you're in the history screen for this recipe" is the whole point (see
 * the design log). Espresso only; steam/hotwater get their own simpler live
 * progress view in the next phase, not this graph.
 *
 * Mounted once as a global overlay (App.vue) since a hardware-triggered shot can
 * start while the user is on any tab, not just Espresso.
 */
import { reactive, ref, watch } from 'vue';
import { machine, liveShot, shots, loadShots } from './useCore.js';
import { recipe } from './useRecipe.js';

const { NSXCore, NSXApi } = window;

export const phase = ref('hidden'); // 'hidden' | 'live' | 'history'
export const series = reactive({ elapsed: [], pressure: [], flow: [], temperature: [], weightFlow: [] });
export const historyShots = ref([]); // this recipe's shots, newest first
export const historyIndex = ref(0);

let shotStartMs = 0;

watch(
  () => machine.state,
  (state, prev) => {
    if (state === 'espresso' && prev !== 'espresso') startLive();
    else if (prev === 'espresso' && state !== 'espresso' && phase.value === 'live') finishLive();
  }
);

function startLive() {
  phase.value = 'live';
  shotStartMs = Date.now();
  series.elapsed = [];
  series.pressure = [];
  series.flow = [];
  series.temperature = [];
  series.weightFlow = [];
}

// liveShot updates arrive at the gateway's broadcast rate (~250ms) — sample on
// every tick rather than running our own timer, so the graph's x-axis is real
// elapsed time, not an assumed frame rate.
watch(
  () => [liveShot.pressure, liveShot.flow, liveShot.groupTemperature],
  () => {
    if (phase.value !== 'live') return;
    series.elapsed.push((Date.now() - shotStartMs) / 1000);
    series.pressure.push(liveShot.pressure);
    series.flow.push(liveShot.flow);
    series.temperature.push(liveShot.groupTemperature);
    series.weightFlow.push(machine.weightFlow ?? 0);
  }
);

async function finishLive() {
  await loadShots(200);
  loadHistoryForCurrentRecipe();
}

/** Opens the history screen for the current recipe directly (the Espresso
 *  screen's History button) — same screen a live shot lands in afterward. */
export function loadHistoryForCurrentRecipe() {
  historyShots.value = NSXCore.findShotsForWorkflow(recipe, shots.value);
  historyIndex.value = 0;
  phase.value = 'history';
}

/** The on-screen "Skip": ends the brew early. Real DE1s start shots from the
 *  group-head hardware, but stopping one early is an allowed API operation
 *  (canExecuteOperation('stopShot', 'espresso') === true) — see the design log
 *  for why this is the one on-screen exception to "start is hardware-only". */
export async function skipShot() {
  if (!NSXCore.canExecuteOperation('stopShot', machine.state)) return;
  await NSXApi.setMachineState('idle');
  // machine.state's watcher above fires finishLive() once the state event arrives.
}

export function rateShot(shot, rating) {
  shot.annotations = { ...shot.annotations, enjoyment: rating };
  return NSXCore.updateShot(shot.id, { annotations: { enjoyment: rating } });
}

export function closeHistory() { phase.value = 'hidden'; }
export function olderShot() { if (historyIndex.value < historyShots.value.length - 1) historyIndex.value++; }
export function newerShot() { if (historyIndex.value > 0) historyIndex.value--; }
