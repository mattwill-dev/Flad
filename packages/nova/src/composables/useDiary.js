/**
 * Roaster -> bean -> shots drill-down. Beans/shots come from useCore.js's
 * reactive mirrors of the real bean cache and shot list — no mock data here.
 *
 * Sorting: beans have no created-at field in the real API (only the store's
 * own array order, which is insertion order) — "oldest first" is therefore the
 * list as the API returns it, "newest first" is that reversed, and "A-Z" sorts
 * by name. This is honest to what data actually exists, rather than inventing
 * a fake timestamp. Shots DO have a real `timestamp`, sorted by that instead.
 */
import { computed, reactive, ref, watch } from 'vue';
import { beans, shots, shotsTotal, loadShots, loadMoreShots } from './useCore.js';
import { loadOrCreateRecipeForBeanProfile } from './useRecipe.js';

const { NSXApi, NSXCore } = window;

export const diaryState = reactive({
  level: 0, // 0 = roasters, 1 = beans, 2 = shots
  roasterName: null,
  bean: null,
  sort: 'newest', // 'oldest' | 'newest' | 'alpha' (shots: no 'alpha')
  view: 'browse', // 'browse' | 'full' (flat, all shots)
  query: '',
  expandedProfile: null, // which profile group (by title) is expanded, at level 2
  showArchived: false, // include archived beans in the browse view
});

function sortByNameOrder(items, sort, nameKey = 'name') {
  const arr = items.slice();
  if (sort === 'alpha') arr.sort((a, b) => (a[nameKey] || '').localeCompare(b[nameKey] || ''));
  else if (sort === 'newest') arr.reverse();
  return arr; // 'oldest' = API array order, unchanged
}

const matches = (text, q) => (text || '').toLowerCase().includes(q.trim().toLowerCase());

// bean.js's cache always includes archived beans (it also serves autocomplete) —
// browsing/picking is the skin's concern, so archived beans are hidden by
// default; the Diary's "Show all" toggle (diaryState.showArchived) reveals them.
const activeBeans = computed(() => beans.value.filter((b) => diaryState.showArchived || !b.archived));

/**
 * batchId -> beanId, built from every active bean's real batches (a batch
 * carries the actual `beanId` foreign key — see fetchBatches/fetchBatch in
 * api.js). A shot only ever records `beanBatchId` (which batch it was
 * brewed from), not a bean id directly, so this map is what actually
 * resolves a shot back to its bean; shotMatchesBean below falls back to
 * fuzzy roaster/name string matching only for shots that predate a batch
 * ever being set (e.g. brewed before a roast date was recorded).
 */
export const batchToBean = ref(new Map());

export async function loadBatchMap() {
  const map = new Map();
  await Promise.all(activeBeans.value.map(async (bean) => {
    try {
      const res = await NSXApi.fetchBatches(bean.id, true);
      const list = Array.isArray(res) ? res : (res?.items ?? []);
      for (const batch of list) map.set(batch.id, bean.id);
    } catch {
      // one bean's batches failing to load shouldn't block the others —
      // shots for it just fall back to fuzzy matching below.
    }
  }));
  batchToBean.value = map;
}
watch(beans, loadBatchMap, { immediate: true });

export const roasterGroups = computed(() => {
  const byRoaster = new Map();
  for (const bean of activeBeans.value) {
    const key = bean.roaster || '—';
    if (!byRoaster.has(key)) byRoaster.set(key, []);
    byRoaster.get(key).push(bean);
  }
  let groups = [...byRoaster.entries()].map(([name, list]) => ({ name, beans: list }));
  if (diaryState.query) groups = groups.filter((g) => matches(g.name, diaryState.query));
  return sortByNameOrder(groups, diaryState.sort);
});

export const beansInRoaster = computed(() => {
  if (!diaryState.roasterName) return [];
  let list = activeBeans.value.filter((b) => (b.roaster || '—') === diaryState.roasterName);
  if (diaryState.query) list = list.filter((b) => matches(b.name, diaryState.query));
  return sortByNameOrder(list, diaryState.sort);
});

function shotMatchesBean(shot, bean) {
  const beanBatchId = shot?.workflow?.context?.beanBatchId;
  if (beanBatchId && batchToBean.value.has(beanBatchId)) {
    return batchToBean.value.get(beanBatchId) === bean.id;
  }
  // Fallback for shots brewed before this bean ever had a batch/roast date set.
  const ctx = shot?.workflow?.context || {};
  const roaster = (bean.roaster || '').trim().toLowerCase();
  const name = (bean.name || '').trim().toLowerCase();
  return (ctx.coffeeRoaster || '').trim().toLowerCase() === roaster && (ctx.coffeeName || '').trim().toLowerCase() === name;
}
const shotProfile = (shot) => shot?.workflow?.profile?.title || shot?.workflow?.profileTitle || '—';
const byTimestampDesc = (a, b) => (Date.parse(b?.timestamp || 0) || 0) - (Date.parse(a?.timestamp || 0) || 0);

/**
 * Shots for the bean currently drilled INTO — fetched from the server scoped to
 * that bean (coffeeName + coffeeRoaster), so ALL of its shots show, not just the
 * ones that happened to be in the global newest-200. A text search is passed as
 * an ADDITIONAL argument on that same query (see loadBeanShots). Kept separate
 * from the global `shots` list so the flat full-history view is untouched.
 */
export const beanShots = ref([]);
export const beanShotsLoading = ref(false);

export async function loadBeanShots(bean, query = '') {
  if (!bean) { beanShots.value = []; return; }
  beanShotsLoading.value = true;
  try {
    const res = await NSXApi.fetchShots({
      limit: 500,
      coffeeName: bean.name || '',
      coffeeRoaster: bean.roaster || '',
      search: query || '',
    });
    beanShots.value = Array.isArray(res) ? res : (res?.items ?? []);
  } catch (err) {
    console.error('[Nova] Diary could not load bean shots', err);
    NSXCore.emit('toast', `Could not load shots: ${err?.message || err}`);
    beanShots.value = [];
  } finally {
    beanShotsLoading.value = false;
  }
}

export const shotsInBean = computed(() => {
  if (!diaryState.bean) return [];
  // Already server-scoped to this bean and server-searched — just apply the sort.
  const list = beanShots.value.slice().sort(byTimestampDesc);
  if (diaryState.sort === 'oldest') list.reverse();
  return list;
});

/** How many shots each bean has, for the bean-list rows — the row can't use
 *  shotsInBean (that's only the bean you've actually drilled INTO, so every
 *  row rendered "0" while still on the list). */
export const shotCountForBean = (bean) => shots.value.filter((s) => shotMatchesBean(s, bean)).length;

/**
 * One entry per profile used with this bean — groups shotsInBean (already
 * sorted/filtered) rather than re-deriving from the raw shot list, so the
 * existing sort/search behavior at level 2 applies here too. Map preserves
 * insertion order, so groups naturally come out "most/least recently used
 * profile first" (matching diaryState.sort) with no extra ordering logic.
 */
export const profileGroupsInBean = computed(() => {
  const byProfile = new Map();
  for (const shot of shotsInBean.value) {
    const title = shotProfile(shot);
    if (!byProfile.has(title)) byProfile.set(title, []);
    byProfile.get(title).push(shot);
  }
  // Each group carries the source shot that a recipe is rebuilt from (its
  // workflow.profile = the real steps actually brewed; its workflow.context =
  // the real dose/grind/yield) — see loadOrCreateRecipeForBeanProfile.
  //
  // The source is the MOST RECENT such shot, picked by timestamp explicitly:
  //  - not list[0] — `list` follows diaryState.sort, so with "oldest first" the
  //    recipe would silently be rebuilt from the oldest shot. Which shot seeds a
  //    recipe must not depend on a UI sort toggle.
  //  - not any shot in the group — shotProfile() groups a shot under EITHER its
  //    own profile.title OR the workflow.profileTitle fallback, so a shot can
  //    land here while its .profile object is something else entirely. Only a
  //    shot whose OWN profile.title equals the group title is a trustworthy
  //    snapshot of "this" profile.
  return [...byProfile.entries()].map(([title, list]) => {
    const source = list
      .filter((s) => s?.workflow?.profile?.title === title)
      .sort(byTimestampDesc)[0] ?? null;
    return {
      title,
      shots: list,
      profile: source?.workflow?.profile ?? null,
      context: source?.workflow?.context ?? null,
    };
  });
});

export function toggleProfileExpanded(title) {
  diaryState.expandedProfile = diaryState.expandedProfile === title ? null : title;
}

/**
 * Per-shot ACTUAL metrics (measured output + brew time + real ratio), keyed by
 * shot id. The list endpoint's lightweight shot carries no measurements, so —
 * exactly like NSX's _loadHistoryShotDurations — these come from fetching the
 * FULL shot (NSXCore.getShotDetails is per-id cached, so revisiting never
 * refetches) and running the shared resolvers over it:
 *   - yield  = resolveActualYield (annotation → volume snapshot → scale sample)
 *   - ratio  = actual dose : actual yield (not the planned recipe targets)
 *   - durationSec = getShotDurationSeconds
 * Actual dose (resolveActualDose) needs no full shot — it reads an annotation
 * with a target fallback — so the view derives it straight from the list shot.
 * Bounded concurrency keeps the flat full-history (up to 200 rows) from firing
 * a request storm on open.
 */
export const shotMetrics = reactive(new Map()); // id -> { yield, yieldUnit, estimated, ratio, durationSec } | null
const _metricsQueued = new Set();
const _metricsQueue = [];
let _metricsActive = 0;
const METRICS_CONCURRENCY = 6;

function _computeMetrics(full) {
  const y = NSXCore.resolveActualYield(full);
  const dose = NSXCore.resolveActualDose(full);
  const ratio = dose && y.value ? NSXCore.calcRatio(dose, y.value) : '—';
  return { yield: y.value, yieldUnit: y.unit, estimated: y.estimated, ratio, durationSec: NSXCore.getShotDurationSeconds(full) };
}

function _pumpMetrics() {
  while (_metricsActive < METRICS_CONCURRENCY && _metricsQueue.length) {
    const id = _metricsQueue.shift();
    _metricsActive += 1;
    NSXCore.getShotDetails(id)
      .then((full) => shotMetrics.set(id, _computeMetrics(full)))
      .catch(() => shotMetrics.set(id, null))
      .finally(() => { _metricsActive -= 1; _pumpMetrics(); });
  }
}

export function ensureShotMetrics(list) {
  for (const shot of list || []) {
    const id = shot?.id;
    if (!id || shotMetrics.has(id) || _metricsQueued.has(id)) continue;
    _metricsQueued.add(id);
    _metricsQueue.push(id);
  }
  _pumpMetrics();
}

/**
 * Tapping a profile entry (not one of its shots) loads the bean+profile as a
 * recipe on the Espresso screen — an EXISTING recipe if one already matches,
 * or a freshly-created one if this profile was only ever brewed some other way
 * (not through Nova's recipe picker, so no persisted entity exists yet).
 * Navigation itself stays in DiaryView.vue; this only loads/creates+loads.
 */
export async function openRecipeForBeanProfile(bean, profileTitle, fallbackProfile = null, fallbackContext = null) {
  await loadOrCreateRecipeForBeanProfile(bean, profileTitle, fallbackProfile, fallbackContext);
}

// The flat full-history list is whatever the current server query returned (a
// plain newest-first page, or a server-side search — see the query watcher
// below); no client-side text filter, so results aren't limited to the loaded
// page. Just apply the sort toggle.
export const fullHistoryShots = computed(() => {
  const list = shots.value.slice().sort(byTimestampDesc);
  if (diaryState.sort === 'oldest') list.reverse();
  return list;
});

/** True when the server reports more shots than are currently loaded — drives the
 *  full-history "Load more" button. */
export const hasMoreShots = computed(() => shots.value.length < shotsTotal.value);

export async function loadMoreFullHistory(pageSize = 20) {
  await loadMoreShots(pageSize, diaryState.query || '');
}

/**
 * Route the search box to the server where the data isn't fully in memory:
 *  - full history view: re-query all shots with the search term
 *  - inside a bean (level 2): re-query that bean's shots with the term
 * The roaster/bean-name levels stay client-side — bean names come from the
 * complete bean cache, so there's nothing more to fetch there.
 */
let _queryTimer = null;
watch(
  () => diaryState.query,
  (q) => {
    clearTimeout(_queryTimer);
    _queryTimer = setTimeout(() => {
      if (diaryState.view === 'full') loadShots(200, 0, q || '');
      else if (diaryState.level === 2 && diaryState.bean) loadBeanShots(diaryState.bean, q || '');
    }, 250);
  }
);

export function enterRoaster(name) {
  diaryState.roasterName = name;
  diaryState.bean = null;
  diaryState.level = 1;
  diaryState.query = '';
}
export function enterBean(bean) {
  diaryState.bean = bean;
  diaryState.level = 2;
  diaryState.query = '';
  diaryState.expandedProfile = null;
  if (diaryState.sort === 'alpha') diaryState.sort = 'newest'; // alpha has no meaning for shots
  loadBeanShots(bean); // fetch ALL of this bean's shots from the server
}
export function goBack() {
  if (diaryState.level === 2) { diaryState.level = 1; diaryState.bean = null; diaryState.expandedProfile = null; }
  else if (diaryState.level === 1) { diaryState.level = 0; diaryState.roasterName = null; }
  diaryState.query = '';
}
export function cycleSort() {
  const shotLevel = diaryState.view === 'full' || diaryState.level === 2;
  const opts = shotLevel ? ['oldest', 'newest'] : ['oldest', 'newest', 'alpha'];
  const i = opts.indexOf(diaryState.sort);
  diaryState.sort = opts[(i + 1) % opts.length];
}
export function setView(view) {
  diaryState.view = view;
  diaryState.query = '';
  if (view === 'full' && diaryState.sort === 'alpha') diaryState.sort = 'newest';
}
export function toggleArchived() {
  diaryState.showArchived = !diaryState.showArchived;
}

/**
 * Diary previously relied entirely on bootCore()'s one-shot `loadShots(200)`
 * (inside a `Promise.allSettled`, so a failed/slow fetch there just left the
 * full-history view silently empty forever, with no retry). Diary now owns
 * its own load, like every other lazily-opened panel already does.
 */
export async function ensureDiaryLoaded() {
  const [shotsResult] = await Promise.allSettled([loadShots(200), loadBatchMap()]);
  // A failed fetch previously left the list silently empty with no signal at
  // all — surface it the same way every other load failure in Nova does.
  if (shotsResult.status === 'rejected') {
    console.error('[Nova] Diary could not load shots', shotsResult.reason);
    NSXCore.emit('toast', `Could not load shot history: ${shotsResult.reason?.message || shotsResult.reason}`);
  }
}
