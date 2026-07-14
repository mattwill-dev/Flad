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
 * ── The bean / bag invariant ───────────────────────────────────────────────
 * Every workflow that reaches the gateway carries a real bean and a real batch
 * (a *bag*: one bean + one roast date — see bean.js's resolveBatch). That is
 * upheld in exactly one place: ensureRecipeBatch(), called from pushRecipe(),
 * which is the single choke point every workflow passes through. It matters
 * because the batch is the ONLY structural link a shot has back to its bean
 * (shot.workflow.context.beanBatchId -> batch.beanId -> bean); without it the
 * Diary can only guess the bean by roaster/name string matching.
 *
 * Roast date is deliberately NOT a bean field: a bean's roaster/origin/process
 * are permanent, what changes is which bag you're pulling from. It lives on the
 * batch — and a batch's roast date is IMMUTABLE. Setting a new roast date
 * resolves the recipe to a DIFFERENT bag (see setRoastDate); it never rewrites
 * the old one, which would retroactively change the roast date every past shot
 * on that bag reports. The bean itself is managed in the Diary.
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
  beanId: null,      // resolved from coffeeRoaster+coffeeName (see ensureRecipeBatch)
  beanBatchId: null, // the bag: (beanId, roastDate) — never one per shot
  roastDate: null,   // ISO date string, or null = "not set". Derived from the batch,
                     // which is the source of truth; deliberately NOT persisted on the recipe.
  // ml-per-gram factor this recipe has learned for estimating weight from the
  // DE1's own volume tracking when no physical scale is connected — see
  // NSXCore.updateVolumeCalibration (mapping.js) and useLiveShot.js's
  // post-shot hook, which is what actually refines this after each brew.
  volumeCalibration: { factor: 1.0, samples: [] },
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
    beanId: recipe.beanId,
    beanBatchId: recipe.beanBatchId,
    volumeCalibration: recipe.volumeCalibration,
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

/** Applied by useLiveShot.js's post-shot hook once the calibration feedback
 *  loop (NSXCore.updateVolumeCalibration) has computed a refined factor for
 *  the recipe that was just brewed. */
export async function saveVolumeCalibration(cal) {
  recipe.volumeCalibration = cal;
  await persistCurrentRecipeEdits();
}

export async function resetVolumeCalibration() {
  await saveVolumeCalibration({ factor: 1.0, samples: [] });
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

/**
 * Upholds the bean/bag invariant: after this, the recipe has a real beanId and
 * a real beanBatchId. Called from pushRecipe(), the single choke point every
 * workflow passes through on its way to the gateway — so "every workflow has a
 * bag" is true by construction rather than by remembering to call this in each
 * of the half-dozen places that can change a recipe.
 *
 * Fast path first: pushRecipe() runs on EVERY dial edit, so an already-resolved
 * recipe must cost zero network.
 */
async function ensureRecipeBatch() {
  if (recipe.beanBatchId && recipe.beanId) return;

  const roaster = recipe.coffeeRoaster;
  const name = recipe.coffeeName;
  // A placeholder recipe (nothing picked yet) has no coffee to hang a bag off.
  if (!roaster || roaster === '—' || !name || name === '—') return;

  try {
    if (!recipe.beanId) {
      const bean = await NSXCore.resolveBean(roaster, name);
      if (!bean?.id) return;
      recipe.beanId = bean.id;
    }

    const batch = await NSXCore.resolveBatch(recipe.beanId, recipe.roastDate);
    recipe.beanBatchId = batch?.id ?? null;
    // The batch is the source of truth for the date — adopt whatever it holds
    // (an existing bag may already have one even if this recipe didn't know it).
    recipe.roastDate = batch?.roastDate ?? recipe.roastDate ?? null;
  } catch (err) {
    // A gateway hiccup here must not block the shot the user is about to pull:
    // push the workflow anyway (bean-less, as before) rather than throwing.
    console.warn('[Nova] could not resolve the recipe bean/bag', err?.message);
  }
}

/**
 * Deletes the bag a recipe just moved off — but only when provably unreferenced,
 * so correcting a mistyped roast date doesn't leave a stray bag behind while a
 * genuine bag-change keeps the old one (its shots still point at it).
 *
 * Fails safe: a gateway that ignores the beanBatchId shot filter returns ALL
 * shots -> non-empty -> we don't delete. The worst case is a stray bag, never
 * an orphaned shot whose bean link we just deleted out from under it.
 */
async function gcBatchIfUnused(batchId) {
  if (!batchId || batchId === recipe.beanBatchId) return;
  if (recipes.value.some((r) => r.beanBatchId === batchId)) return;

  try {
    const res = await NSXApi.fetchShots({ beanBatchId: batchId, limit: 1 });
    const items = Array.isArray(res) ? res : (res?.items ?? []);
    if (items.length > 0) return; // the bag has history — keep it
    await NSXApi.deleteBatch(batchId);
  } catch (err) {
    console.warn('[Nova] could not clean up the previous bag', err?.message);
  }
}

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
    beanId: null,
    beanBatchId: wf?.context?.beanBatchId ?? null,
    roastDate: null,
  });
  await adoptBatch(recipe.beanBatchId);
}

/** Reads roastDate + beanId back off a batch the recipe already references.
 *  The batch carries the real beanId FK, so this is also how a recipe loaded
 *  from the gateway (which only stores beanBatchId) learns which bean it is. */
async function adoptBatch(batchId) {
  if (!batchId) return;
  try {
    const batch = await NSXApi.fetchBatch(batchId);
    recipe.roastDate = batch?.roastDate ?? null;
    recipe.beanId = batch?.beanId ?? recipe.beanId ?? null;
  } catch {
    // The bag may have been deleted independently (e.g. archived on another
    // device). Drop the dangling reference so ensureRecipeBatch re-resolves a
    // real one on the next push, rather than pushing a broken FK.
    recipe.beanBatchId = null;
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
export async function pushRecipe({ silent = false } = {}) {
  if (!NSXCore.canExecuteOperation('setWorkflow')) {
    // `silent` is for pushes the USER didn't ask for (boot-time healing): the
    // machine merely being busy is not something to nag about, and the next
    // real push heals the workflow anyway.
    if (!silent) {
      const t = window.NSXI18n?.t || ((k) => k);
      NSXCore.emit('toast', t('toast.recipeStateError').replace('{state}', NSXCore.getMachineState()));
    }
    return;
  }
  // The invariant: no workflow leaves here without a real bean + bag behind it.
  await ensureRecipeBatch();

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
    beanId: entry.beanId ?? null,
    beanBatchId: entry.beanBatchId ?? null,
    roastDate: null,
    volumeCalibration: entry.volumeCalibration && typeof entry.volumeCalibration === 'object'
      ? entry.volumeCalibration
      : { factor: 1.0, samples: [] },
  });
  await adoptBatch(recipe.beanBatchId);
  await pushRecipe(); // ensureRecipeBatch heals an older, batch-less recipe here
}

/**
 * New-recipe flow (bean chosen, then a profile): dose/grind/temp keep whatever
 * was already dialed in (or the sole grinder's model, if none was set yet) —
 * only the bean+profile identity actually changes. Does not persist anything
 * itself; the caller (RecipePicker.vue) calls createRecipeFromCurrent() once
 * the user has actually picked a profile, so cancelling mid-flow saves nothing.
 *
 * `seedContext` is for the OTHER caller, loadOrCreateRecipeForBeanProfile —
 * recovering a recipe from a historic shot, where the shot's own
 * workflow.context holds the real dose/grind/yield that was actually brewed and
 * must win over whatever is currently dialed in. The plain bean-picker flow has
 * no such data, so it defaults to null and nothing changes there.
 */
export async function composeNewRecipe({ bean, profile, seedContext = null }) {
  recipe.id = null;
  Object.assign(recipe, {
    coffeeRoaster: bean.roaster || '—',
    coffeeName: bean.name || '—',
    grinderModel: seedContext?.grinderModel || (recipe.grinderModel !== '—' ? recipe.grinderModel : (grinders.value[0]?.model || '—')),
    grinderSetting: seedContext?.grinderSetting ?? recipe.grinderSetting,
    grinderId: seedContext?.grinderId ?? recipe.grinderId,
    targetDoseWeight: seedContext?.targetDoseWeight || recipe.targetDoseWeight || 18,
    targetYield: seedContext?.targetYield || recipe.targetYield || 36,
    groupTemp: NSXCore.resolveProfileTemp(profile.profile) ?? recipe.groupTemp,
    profileTitle: profile.profile?.title || '—',
    selectedProfileId: profile.id ?? null,
    // The bean is already a real Diary record here (BeanChooser picked it), so
    // ensureRecipeBatch only has the bag left to resolve — the bean's undated
    // one until the user sets a roast date.
    beanId: bean.id ?? null,
    beanBatchId: null,
    roastDate: null,
    volumeCalibration: { factor: 1.0, samples: [] },
  });
  await pushRecipe();
}

/** Case-insensitive match on the identity a recipe carries (roaster + name +
 *  profile title). Nothing else links a bean+profile pair to a recipe — a shot
 *  has no recipe id of its own, only these strings. */
export function findRecipeForBeanProfile(bean, profileTitle) {
  const roaster = (bean?.roaster || '').trim().toLowerCase();
  const name = (bean?.name || '').trim().toLowerCase();
  const title = (profileTitle || '').trim().toLowerCase();
  if (!roaster || !name) return null;
  return recipes.value.find((r) =>
    (r.coffeeRoaster || '').trim().toLowerCase() === roaster &&
    (r.coffeeName || '').trim().toLowerCase() === name &&
    (r.profileTitle || '').trim().toLowerCase() === title
  ) ?? null;
}

/**
 * Load the recipe for this bean+profile, creating and persisting one if it
 * doesn't exist yet (the coffee was brewed some other way — another skin, or
 * before this library existed). Shared by the Diary's profile rows and by
 * bootCore's adopt-or-create, so "what's on the machine is always a recipe in
 * your library" holds no matter how the workflow got there.
 *
 * ── Why a Diary profile title may not exist in the library ─────────────────
 * A shot records the profile title it was brewed with AT THAT TIME. A profile
 * can later be renamed, so the Diary can legitimately show a title (e.g.
 * "Adaptive") that no live profile carries any more — even though the profile
 * itself is still on the machine under its new name ("A-Flow / default-like-
 * dflow"). Title lookup alone can't find it.
 *
 * We resolve it by CONTENT instead, via the shot's own profile snapshot: the
 * bridge deduplicates profiles by their steps (profile ids are content hashes),
 * so POSTing the shot's steps does not create a duplicate — it returns the
 * existing, identical profile that is already on the DE1. That is the profile
 * the recipe must point at, under ITS real current name; a recipe titled with
 * a name no profile carries any more would just be a phantom. (Forcing the old
 * name onto a new record is impossible anyway: the only way to make the bridge
 * store a distinct profile would be to alter its steps, which would change how
 * the shot brews.) The Diary keeps showing the historic title for old shots —
 * that is their history, and correctly immutable.
 *
 * `fallbackContext` carries the shot's REAL dose/grind/yield, so the recovered
 * recipe reflects what was actually brewed instead of silently inheriting
 * whatever happened to be dialed in on the Espresso screen from an unrelated
 * recipe (composeNewRecipe's default, correct for its OTHER caller — a fresh
 * bean+profile pick, which has nothing else to seed from).
 */
export async function loadOrCreateRecipeForBeanProfile(bean, profileTitle, fallbackProfile = null, fallbackContext = null) {
  const log = (...args) => console.log('[Nova/recipe]', ...args);
  log(`tapped profile "${profileTitle}" for bean "${bean?.roaster} – ${bean?.name}"`);
  log('  shot-derived profile:', fallbackProfile
    ? `title="${fallbackProfile.title}", ${(fallbackProfile.steps ?? fallbackProfile.frames ?? []).length} steps`
    : 'NONE (no shot in this group carries a matching profile object)');
  log('  shot-derived context:', fallbackContext
    ? `dose=${fallbackContext.targetDoseWeight}g grind=${fallbackContext.grinderSetting} yield=${fallbackContext.targetYield}g`
    : 'NONE');
  log('  (both taken from the MOST RECENT shot brewed with this profile)');

  const existing = findRecipeForBeanProfile(bean, profileTitle);
  if (existing) {
    log(`  -> existing recipe found (id=${existing.id}, profileTitle="${existing.profileTitle}") — loading it`);
    await selectRecipe(existing);
    return existing;
  }
  log('  -> no existing recipe for this bean+profile; creating a new one');

  // 1. Try by title — the common case: the profile still carries this name.
  let match = null;
  try {
    const allProfiles = await NSXCore.loadProfilesWithHidden();
    match = allProfiles.find(
      (p) => (p.profile?.title || '').trim().toLowerCase() === (profileTitle || '').trim().toLowerCase()
    ) ?? null;
    log(match
      ? `  -> profile "${profileTitle}" found in the library by title (id=${match.id})`
      : `  -> no live profile is named "${profileTitle}" (${allProfiles.length} checked) — it was renamed or deleted`);
  } catch (err) {
    log('  -> could not read the profile library:', err?.message);
  }

  // 2. Fall back to resolving by CONTENT, using the shot's own profile snapshot.
  //    The bridge dedupes by steps, so this returns the existing identical
  //    profile rather than storing a copy — see the note above.
  const hasFrames = (p) => Array.isArray(p?.steps) && p.steps.length || Array.isArray(p?.frames) && p.frames.length;
  if (!match && hasFrames(fallbackProfile)) {
    log(`  -> resolving it by content instead (POSTing the shot's ${(fallbackProfile.steps ?? fallbackProfile.frames).length} steps)`);
    const resolved = await NSXApi.createProfile({ profile: fallbackProfile });
    match = NSXCore.normalizeProfileRecord(resolved);
    const resolvedTitle = match?.profile?.title;
    log(`  -> bridge resolved it to id=${match?.id}, title="${resolvedTitle}"`
      + (resolvedTitle !== profileTitle
        ? `  (same steps, but the profile is now named "${resolvedTitle}" — "${profileTitle}" was its old name)`
        : ''));
    NSXCore.invalidateProfilesAll(); // in case it really was new, so the picker sees it
  } else if (!match) {
    log('  -> nothing to resolve from (shot carries no steps) — the recipe would be frameless and unpushable');
    throw new Error(`No profile named "${profileTitle}" exists, and this shot carries no profile steps to resolve it by.`);
  }

  // Use the profile's REAL current title, not the historic one from the shot:
  // the recipe must name the profile that actually exists on the machine.
  await composeNewRecipe({
    bean,
    profile: match,
    seedContext: fallbackContext,
  });
  const entry = await createRecipeFromCurrent();
  log(`  -> recipe created: id=${entry.id}, profileTitle="${entry.profileTitle}", `
    + `selectedProfileId=${entry.selectedProfileId}, dose=${entry.targetDoseWeight}g, `
    + `grind=${entry.grinderSetting}, yield=${entry.targetYield}g`);
  return entry;
}

/**
 * Boot: make the workflow the gateway is already holding a real, saved recipe.
 *
 * Without this, a workflow the user never loaded through the picker (first
 * launch, or a coffee dialled in from another skin) leaves recipe.id null — and
 * then every dial edit persists nowhere, invisibly. Adopting it means "whatever
 * is on the machine is a recipe in your library" is true from the first frame,
 * so edits always land somewhere the user can see.
 *
 * Called from main.js after bootCore() — deliberately NOT from bootCore itself,
 * since useCore.js importing this module would close an import cycle
 * (useRecipe already imports useCore).
 */
export async function adoptCurrentWorkflowAsRecipe() {
  const wf = currentWorkflow.value;
  if (!wf) return null; // no machine / no workflow — nothing to adopt

  await refreshRecipes();
  await syncFromWorkflow(wf); // the watcher may not have run yet; this is idempotent

  const { coffeeRoaster: roaster, coffeeName: name, profileTitle } = recipe;
  if (!roaster || roaster === '—' || !name || name === '—') return null; // nothing dialled in yet

  const existing = findRecipeForBeanProfile({ roaster, name }, profileTitle);
  if (existing) {
    recipe.id = existing.id;
    // Fields the gateway workflow doesn't carry, but the saved recipe does.
    recipe.beanId = existing.beanId ?? recipe.beanId;
    if (existing.volumeCalibration) recipe.volumeCalibration = existing.volumeCalibration;
  } else {
    await ensureRecipeBatch();
    await createRecipeFromCurrent();
  }

  // Heal the gateway's copy only if it's actually missing the bag — re-pushing
  // an already-correct workflow on every boot would be pointless churn. Silent:
  // if the machine is mid-heat this is skipped, and the next real push heals it.
  await ensureRecipeBatch();
  if (!wf?.context?.beanBatchId && recipe.beanBatchId) {
    await pushRecipe({ silent: true });
  }
  return recipe.id;
}

/**
 * A new roast date means a NEW BAG — so this re-resolves the recipe onto a
 * different batch (find-or-create for that date) instead of editing the current
 * batch's date. Editing it in place is what the old implementation did, and it
 * silently rewrote history: every past shot pulled from the old bag would
 * retroactively report the new roast date.
 *
 * The bag the recipe just left keeps its shots. If it has none — the "I mistyped
 * the date" case — gcBatchIfUnused removes it so strays don't pile up.
 */
export async function setRoastDate(iso) {
  const previousBatchId = recipe.beanBatchId;

  recipe.roastDate = iso;
  recipe.beanBatchId = null; // force ensureRecipeBatch to resolve the bag for THIS date
  await pushRecipe();        // ensureRecipeBatch runs inside, then the workflow is pushed

  await gcBatchIfUnused(previousBatchId);
}
