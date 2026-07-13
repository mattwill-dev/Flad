/**
 * The current recipe as an editable view over NSXCore's raw "workflow" shape
 * (see packages/core/src/domains/workflow.js's buildGatewayPayload / mapping.js's
 * mapApiWorkflowToDisplay). A recipe = bean + profile (+ grinder, once more than
 * one is configured — see GRINDERS in useGrinders.js).
 *
 * Recipes are real persisted entities the user builds (workflow.js's recipe
 * store: loadRecipes/saveRecipes/makeRecipeId — a gateway-store-backed list,
 * 3-way merged on write), not a list conjured from shot history. `recipe.id`
 * tracks which persisted entity (if any) is currently loaded: set by
 * selectRecipe()/createRecipeFromCurrent(), left null for a workflow the
 * gateway happens to be running that was never loaded through the picker in
 * this session. Editing dose/grind/yield/temp/profile while a recipe.id is
 * set updates that SAME persisted entity (see persistCurrentRecipeEdits,
 * called from pushRecipe) — the same "loaded recipe stays the same recipe"
 * behavior NSX's workflowItems[selectedWorkflowIndex] has.
 *
 * Roast date is deliberately NOT a bean field here: it lives on a *batch* of the
 * bean (a bean's roaster/origin/process are permanent; what changes is which bag
 * you're currently pulling from). Setting it from this screen creates/updates the
 * batch behind the recipe's beanBatchId — the bean itself is managed in the Diary.
 */
import { reactive, computed, ref, watch } from 'vue';
import { currentWorkflow, machine, grinders } from './useCore.js';

const { NSXCore, NSXApi } = window;

export const recipe = reactive({
  id: null, // persisted recipe id, or null if not (yet) loaded from the library
  coffeeRoaster: '—',
  coffeeName: '—',
  grinderModel: '—',
  grinderSetting: '—',
  targetDoseWeight: 0,
  targetYield: 0,
  groupTemp: 0,
  profileTitle: '—',
  selectedProfileId: null,
  useVolumeStopWhenNoScale: false,
  grinderId: null,
  beanBatchId: null,
  roastDate: null, // ISO date string, or null = "not set"
});

/** The persisted recipe library — the recipe picker's real list, not a
 *  history-derived one. Lazily loaded (RecipePicker.vue calls this on open),
 *  matching every other lazily-loaded panel's own load-on-open convention. */
export const recipes = ref([]);
export async function refreshRecipes() {
  recipes.value = await NSXCore.loadRecipes();
  return recipes.value;
}

function snapshotFromCurrentRecipe(existing = {}) {
  return {
    ...existing,
    id: recipe.id,
    coffeeRoaster: recipe.coffeeRoaster,
    coffeeName: recipe.coffeeName,
    grinderModel: recipe.grinderModel,
    grinderSetting: recipe.grinderSetting,
    targetDoseWeight: recipe.targetDoseWeight,
    targetYield: recipe.targetYield,
    groupTemp: recipe.groupTemp,
    profileTitle: recipe.profileTitle,
    selectedProfileId: recipe.selectedProfileId,
    useVolumeStopWhenNoScale: recipe.useVolumeStopWhenNoScale,
    grinderId: recipe.grinderId,
    beanBatchId: recipe.beanBatchId,
  };
}

/** Writes the current dial values back into the loaded recipe's persisted
 *  entry — a no-op if nothing is loaded (recipe.id is null). */
async function persistCurrentRecipeEdits() {
  if (!recipe.id) return;
  const idx = recipes.value.findIndex((r) => r.id === recipe.id);
  if (idx < 0) return;
  const snapshot = snapshotFromCurrentRecipe(recipes.value[idx]);
  const updated = recipes.value.map((r, i) => (i === idx ? snapshot : r));
  recipes.value = await NSXCore.saveRecipes(updated);
}

/** Persists the current dial values as a brand-new recipe entity and loads
 *  it (recipe.id now points at it) — the "+ New recipe" flow's save step. */
export async function createRecipeFromCurrent() {
  recipe.id = NSXCore.makeRecipeId();
  const entry = snapshotFromCurrentRecipe({ lastUsed: Date.now() });
  recipes.value = await NSXCore.saveRecipes([...recipes.value, entry]);
  return entry;
}

export async function deleteRecipe(id) {
  recipes.value = await NSXCore.saveRecipes(recipes.value.filter((r) => r.id !== id));
  if (recipe.id === id) recipe.id = null;
}

/** Bumps a recipe's lastUsed on an actual completed shot — matches NSX's real
 *  trigger exactly (selecting a recipe does NOT touch lastUsed; only a shot
 *  finishing does). Called from useLiveShot.js's finishLive(). */
export async function bumpRecipeLastUsed(id) {
  if (!id) return;
  const idx = recipes.value.findIndex((r) => r.id === id);
  if (idx < 0) return;
  const updated = recipes.value.map((r, i) => (i === idx ? { ...r, lastUsed: Date.now() } : r));
  recipes.value = await NSXCore.saveRecipes(updated);
}

export const roastAge = computed(() => NSXCore.getBatchAge(recipe.roastDate));

async function syncFromWorkflow(wf) {
  if (!wf) return;
  const display = NSXCore.mapApiWorkflowToDisplay(wf);
  Object.assign(recipe, {
    coffeeRoaster: display.coffeeRoaster,
    coffeeName: display.coffeeName,
    grinderModel: display.grinderModel,
    grinderSetting: display.grinderSetting,
    targetDoseWeight: display.targetDoseWeight,
    targetYield: display.targetYield,
    groupTemp: NSXCore.resolveProfileTemp(wf?.profile) ?? 0,
    profileTitle: display.profileTitle,
    selectedProfileId: wf?.profileId ?? null,
    useVolumeStopWhenNoScale: !!wf?.useVolumeStopWhenNoScale,
    grinderId: wf?.context?.grinderId ?? null,
    beanBatchId: wf?.context?.beanBatchId ?? null,
    roastDate: null,
  });
  if (recipe.beanBatchId) {
    try {
      const batch = await NSXApi.fetchBatch(recipe.beanBatchId);
      recipe.roastDate = batch?.roastDate ?? null;
    } catch {
      // batch may have been deleted independently; not fatal to loading the recipe
    }
  }
}

export async function refreshFromWorkflow() {
  await syncFromWorkflow(currentWorkflow.value);
}

// Espresso mounts before bootCore()'s fetchCurrentWorkflow() necessarily resolves
// (it's the default route), so `recipe` must react whenever currentWorkflow later
// changes — not just when a view happens to call refreshFromWorkflow() itself.
// selectRecipe()/composeNewRecipe() also assign `recipe` fields directly before
// this fires; syncFromWorkflow is idempotent, so the watcher re-running is harmless.
watch(currentWorkflow, (wf) => { syncFromWorkflow(wf); });

/** Builds the gateway payload from the current edits and pushes it.
 *  Guarded the same way NSX's own pushSelectedWorkflowToMachine is: setWorkflow
 *  is only legal in 'idle' (see machine.js's ALLOWED_OPERATIONS) — without this,
 *  editing dose/grind/profile while e.g. heating or mid-maintenance would push
 *  a workflow change racing whatever the machine is actually doing. */
export async function pushRecipe() {
  if (!NSXCore.canExecuteOperation('setWorkflow')) {
    const t = window.NSXI18n?.t || ((k) => k);
    NSXCore.emit('toast', t('toast.recipeStateError').replace('{state}', NSXCore.getMachineState()));
    return;
  }
  const workflowForPayload = {
    coffeeRoaster: recipe.coffeeRoaster,
    coffeeName: recipe.coffeeName,
    grinderModel: recipe.grinderModel,
    grinderSetting: recipe.grinderSetting,
    targetDoseWeight: recipe.targetDoseWeight,
    targetYield: recipe.targetYield,
    groupTemp: recipe.groupTemp,
    profileTitle: recipe.profileTitle,
    selectedProfileId: recipe.selectedProfileId,
    useVolumeStopWhenNoScale: recipe.useVolumeStopWhenNoScale,
    grinderId: recipe.grinderId,
    beanBatchId: recipe.beanBatchId,
  };
  const payload = await NSXCore.buildGatewayPayload(workflowForPayload, {
    scaleConnected: machine.scaleConnected,
  });
  if (!payload) throw new Error('Could not resolve a profile to push (frameless or missing)');
  await NSXApi.pushWorkflow(payload);
  currentWorkflow.value = payload; // what we sent is now what the gateway holds
  await persistCurrentRecipeEdits();
  return payload;
}

/** Loads an existing recipe entity from the library and pushes it — selecting
 *  a recipe is "load it onto the machine now", since starting the brew itself
 *  happens on the machine's own hardware. Does NOT touch lastUsed (matching
 *  NSX exactly — only a completed shot does, see bumpRecipeLastUsed). */
export async function selectRecipe(entry) {
  Object.assign(recipe, {
    id: entry.id ?? null,
    coffeeRoaster: entry.coffeeRoaster || '—',
    coffeeName: entry.coffeeName || '—',
    grinderModel: entry.grinderModel || '—',
    grinderSetting: entry.grinderSetting || '—',
    targetDoseWeight: Number(entry.targetDoseWeight) || 0,
    targetYield: Number(entry.targetYield) || 0,
    groupTemp: Number(entry.groupTemp) || 0,
    profileTitle: entry.profileTitle || '—',
    selectedProfileId: entry.selectedProfileId ?? null,
    useVolumeStopWhenNoScale: !!entry.useVolumeStopWhenNoScale,
    grinderId: entry.grinderId ?? null,
    beanBatchId: entry.beanBatchId ?? null,
    roastDate: null,
  });
  if (recipe.beanBatchId) {
    try {
      const batch = await NSXApi.fetchBatch(recipe.beanBatchId);
      recipe.roastDate = batch?.roastDate ?? null;
    } catch {
      // batch may have been deleted independently; not fatal to loading the recipe
    }
  }
  await pushRecipe();
}

/** New-recipe flow (bean chosen, then a profile): dose/grind/temp keep whatever
 *  was already dialed in (or the sole grinder's model, if none was set yet) —
 *  only the bean+profile identity actually changes. Does not persist anything
 *  itself; the caller (RecipePicker.vue) calls createRecipeFromCurrent() once
 *  the user has actually picked a profile, so cancelling mid-flow saves nothing. */
export async function composeNewRecipe({ bean, profile }) {
  recipe.id = null;
  Object.assign(recipe, {
    coffeeRoaster: bean.roaster || '—',
    coffeeName: bean.name || '—',
    grinderModel: recipe.grinderModel !== '—' ? recipe.grinderModel : (grinders.value[0]?.model || '—'),
    targetDoseWeight: recipe.targetDoseWeight || 18,
    targetYield: recipe.targetYield || 36,
    groupTemp: NSXCore.resolveProfileTemp(profile.profile) ?? recipe.groupTemp,
    profileTitle: profile.profile?.title || '—',
    selectedProfileId: profile.id ?? null,
    beanBatchId: null,
    roastDate: null,
  });
  await pushRecipe();
}

/** Find an existing bean matching this recipe's roaster+name (case-insensitive).
 *  Beans are created/edited in the Diary, not here — this only looks one up. */
function findMatchingBean() {
  const roaster = recipe.coffeeRoaster.trim().toLowerCase();
  const name = recipe.coffeeName.trim().toLowerCase();
  if (!roaster || roaster === '—' || !name || name === '—') return null;
  return (NSXCore.getBeans() || []).find(
    (b) => (b.roaster || '').trim().toLowerCase() === roaster && (b.name || '').trim().toLowerCase() === name
  ) ?? null;
}

/**
 * Sets the roast date on the recipe's batch, creating one if the recipe doesn't
 * have one yet. If the recipe's bean isn't in the Diary yet, the date is held
 * locally for this session only (there's no bean to attach a batch to) — the
 * roast-date chip still reflects it, it just won't survive a reload.
 */
export async function setRoastDate(iso) {
  const bean = findMatchingBean();
  if (!bean) { recipe.roastDate = iso; return; }
  if (recipe.beanBatchId) {
    await NSXApi.updateBatch(recipe.beanBatchId, { roastDate: iso });
  } else {
    const created = await NSXApi.createBatch(bean.id, { roastDate: iso });
    recipe.beanBatchId = created?.id ?? null;
    await pushRecipe(); // persist the new beanBatchId onto the workflow itself
  }
  recipe.roastDate = iso;
}
