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
import { recipe, bumpRecipeLastUsed } from './useRecipe.js';

const { NSXCore, NSXApi } = window;

export const phase = ref('hidden'); // 'hidden' | 'live' | 'history'
export const series = reactive({ elapsed: [], pressure: [], flow: [], temperature: [], weightFlow: [] });
export const historyShots = ref([]); // this recipe's shots, newest first
export const historyIndex = ref(0);

/**
 * The FULL record (with `measurements`/`snapshot`) for the shot currently
 * shown in history — `historyShots` only holds the lightweight list-endpoint
 * shots (no measurements), so duration/ratio/actual-yield all read null off
 * them. NSX always re-fetches the full detail before computing shot-review
 * stats; this mirrors that instead of computing from the list item.
 */
export const currentFullShot = ref(null);

watch(
  [historyIndex, historyShots],
  async () => {
    const shot = historyShots.value[historyIndex.value];
    currentFullShot.value = null;
    if (!shot) return;
    try {
      currentFullShot.value = await NSXCore.getShotDetails(shot.id);
    } catch (err) {
      console.warn('[Nova] could not fetch full shot detail', err?.message);
    }
  },
  { immediate: true }
);

/** Records a corrected dose-in for the shot currently in review — the DE1
 *  never measures dose itself, so this is the same editable annotation NSX's
 *  shot review lets the user set (falls back to the recipe's target dose
 *  until edited). Refetches the full detail since updateShot invalidates it. */
export async function setActualDose(doseWeight) {
  const shot = historyShots.value[historyIndex.value];
  if (!shot) return;
  await NSXCore.updateShot(shot.id, { annotations: { actualDoseWeight: doseWeight } });
  currentFullShot.value = await NSXCore.getShotDetails(shot.id);
}

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
  // Matches NSX's real trigger exactly: selecting a recipe never touches
  // lastUsed, only an actually-completed shot does.
  await bumpRecipeLastUsed(recipe.id);
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
