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
import { computed, reactive, ref } from 'vue';

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

/**
 * The raw gateway workflow object (as fetched via NSXApi.fetchCurrentWorkflow /
 * pushed back via NSXCore.buildGatewayPayload) — the shape workflow.js and
 * mapping.js operate on. useRecipe.js derives its editable view from this;
 * anything that changes the loaded recipe (recipe picker, push after an edit)
 * updates this ref so every consumer stays in sync.
 */
export const currentWorkflow = ref(null);

/**
 * Full shot list — NOT a core cache (shot.js only caches per-id detail; no
 * skin-agnostic full-list cache exists because "how much to page/filter" is
 * skin-shaped). Nova keeps its own here so Espresso's history button, the
 * recipe picker (buildWorkflowItemsFromShots needs shot items), and the Diary
 * all read the same list instead of each re-fetching it.
 */
export const shots = ref([]);

export async function loadShots(limit = 200, offset = 0, search = '') {
  const res = await NSXApi.fetchShots(limit, offset, search);
  shots.value = Array.isArray(res) ? res : (res?.items ?? []);
  return shots.value;
}

/**
 * Beans and grinders ARE cached in core (bean.js/grinder.js), but that cache is a
 * plain array behind a sync getter, not something Vue can track. These refs mirror
 * it into reactivity via the domains' *Loaded events, so any view can just read
 * `beans.value`/`grinders.value` and re-render when NSXCore.loadBeans()/
 * loadGrinders() runs anywhere (e.g. the Diary creating a bean updates Espresso's
 * recipe picker too, with no extra plumbing).
 */
export const beans = ref([]);
export const grinders = ref([]);
NSXCore.on('beansLoaded', ({ beans: list }) => { beans.value = list; });
NSXCore.on('grindersLoaded', ({ grinders: list }) => { grinders.value = list; });

/**
 * profile.js (unlike bean.js/grinder.js) emits no *Loaded event — it has three
 * independent caches (visible/all/deleted) with different reload semantics, so
 * there's no one "the list changed" moment to hook. Nova mirrors the visible
 * cache explicitly instead: bootCore() populates it once, and anything that
 * changes the profile library (Settings' profile manager, later) calls
 * refreshProfiles() to keep this in sync.
 */
export const profiles = ref([]);
export async function refreshProfiles(force = false) {
  profiles.value = await NSXCore.loadProfiles(force);
  return profiles.value;
}

/**
 * Grinder identity in the recipe title/picker (see the design log): while only
 * one grinder is configured, it is implicit and drops out — a recipe is just
 * bean + profile. Add a second grinder and it reappears automatically, no skin
 * code changes needed.
 */
export const singleGrinder = computed(() => grinders.value.length <= 1);

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
    const [, workflowResult] = await Promise.allSettled([
      NSXApi.fetchMachineInfo(),
      NSXApi.fetchCurrentWorkflow(),
      refreshProfiles(),
      NSXCore.loadBeans(),
      NSXCore.loadGrinders(),
      NSXCore.loadRecipes(),
      loadShots(200),
    ]);
    if (workflowResult.status === 'fulfilled') currentWorkflow.value = workflowResult.value;

    // Seed the schedule id if one already exists on the gateway (first launch
    // on a machine that already has a schedule from a previous skin/session).
    try {
      const schedules = await NSXApi.fetchSchedules();
      const existing = Array.isArray(schedules) ? schedules[0] : schedules?.items?.[0];
      if (existing?.id && !NSXCore.getScheduleState().scheduleId) {
        NSXCore.setScheduleId(existing.id);
      }
    } catch (err) {
      console.warn('[Nova] could not fetch schedules on startup', err?.message);
    }
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
