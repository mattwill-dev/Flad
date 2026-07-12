/**
 * The bridge between NSXCore (plain event emitter on `window`) and Vue reactivity.
 *
 * Everything pure — presets, recipes, shot/workflow mapping, machine state, CRUD —
 * lives in NSXCore (see packages/core/README.md). This module owns no business
 * logic; it mirrors core events into a reactive object the views render from, and
 * runs the prescribed bootstrap sequence.
 *
 * Subscriptions happen at module load, before any await, because api.js already has
 * the WebSockets open and messages may be arriving.
 */
import { reactive } from 'vue';

const { NSXCore, NSXApi } = window;

/** Live machine/device state. Written only by the handlers below. */
export const machine = reactive({
  state: 'sleeping',
  substate: null,
  connected: false,
  scaleConnected: false,
  weight: 0,
  weightFlow: null,
  water: { currentLevel: null, refillLevel: null },
  timeToReadyMs: null,
});

/** Skin bootstrap status, so views can show a loading/disconnected state. */
export const boot = reactive({ done: false, error: null });

NSXCore.on('machineState', ({ state, substate }) => {
  machine.state = state;
  machine.substate = substate ?? null;
  // machine.js keeps the authoritative cache that canExecuteOperation() reads;
  // the skin's handler is its only writer.
  NSXCore.setMachineState(state);
});

NSXCore.on('machineConnected', (connected) => { machine.connected = !!connected; });
NSXCore.on('scaleConnected', (connected) => { machine.scaleConnected = !!connected; });

NSXCore.on('scaleWeight', ({ weight, weightFlow }) => {
  machine.weight = weight;
  machine.weightFlow = weightFlow ?? null;
});

NSXCore.on('waterLevel', ({ currentLevel, refillLevel }) => {
  machine.water.currentLevel = currentLevel;
  machine.water.refillLevel = refillLevel;
});

NSXCore.on('timeToReady', ({ remainingMs }) => { machine.timeToReadyMs = remainingMs ?? null; });

/** Startup sequence, in the order the core README prescribes. */
export async function bootCore() {
  try {
    await NSXCore.migrateLegacyStore();
    await NSXCore.loadStore();

    NSXCore.hydrateSteam();
    NSXCore.hydrateHotwater();
    NSXCore.hydrateFlush();
    NSXCore.hydrateSchedule();

    // A machine can be offline while the tablet is not — a failed fetch must not
    // stop the skin from rendering, so these are settled, not awaited as a unit.
    await Promise.allSettled([
      NSXApi.fetchMachineInfo(),
      NSXApi.fetchCurrentWorkflow(),
      NSXCore.loadProfiles(),
      NSXCore.loadBeans(),
      NSXCore.loadGrinders(),
      NSXCore.loadRecipes(),
    ]);
  } catch (err) {
    console.error('[Nova] core bootstrap failed', err);
    boot.error = err;
  } finally {
    boot.done = true;
  }
}

export function useMachine() {
  return machine;
}
