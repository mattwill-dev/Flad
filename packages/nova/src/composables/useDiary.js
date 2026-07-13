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
import { beans, shots, loadShots } from './useCore.js';

const { NSXApi } = window;

export const diaryState = reactive({
  level: 0, // 0 = roasters, 1 = beans, 2 = shots
  roasterName: null,
  bean: null,
  sort: 'oldest', // 'oldest' | 'newest' | 'alpha' (shots: no 'alpha')
  view: 'browse', // 'browse' | 'full' (flat, all shots)
  query: '',
  searchOpen: false,
});

function sortByNameOrder(items, sort, nameKey = 'name') {
  const arr = items.slice();
  if (sort === 'alpha') arr.sort((a, b) => (a[nameKey] || '').localeCompare(b[nameKey] || ''));
  else if (sort === 'newest') arr.reverse();
  return arr; // 'oldest' = API array order, unchanged
}

const matches = (text, q) => (text || '').toLowerCase().includes(q.trim().toLowerCase());

// bean.js's cache always includes archived beans (it also serves autocomplete) —
// browsing/picking is the skin's concern, so archived beans are hidden here.
const activeBeans = computed(() => beans.value.filter((b) => !b.archived));

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

export const shotsInBean = computed(() => {
  if (!diaryState.bean) return [];
  let list = shots.value.filter((s) => shotMatchesBean(s, diaryState.bean)).sort(byTimestampDesc);
  if (diaryState.query) list = list.filter((s) => matches(shotProfile(s), diaryState.query));
  if (diaryState.sort === 'oldest') list = list.slice().reverse();
  return list;
});

export const fullHistoryShots = computed(() => {
  let list = shots.value.slice().sort(byTimestampDesc);
  if (diaryState.query) list = list.filter((s) => matches(shotProfile(s), diaryState.query));
  if (diaryState.sort === 'oldest') list = list.slice().reverse();
  return list;
});

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
  if (diaryState.sort === 'alpha') diaryState.sort = 'oldest'; // alpha has no meaning for shots
}
export function goBack() {
  if (diaryState.level === 2) { diaryState.level = 1; diaryState.bean = null; }
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
  if (view === 'full' && diaryState.sort === 'alpha') diaryState.sort = 'oldest';
}

/**
 * Diary previously relied entirely on bootCore()'s one-shot `loadShots(200)`
 * (inside a `Promise.allSettled`, so a failed/slow fetch there just left the
 * full-history view silently empty forever, with no retry). Diary now owns
 * its own load, like every other lazily-opened panel already does.
 */
export async function ensureDiaryLoaded() {
  await Promise.allSettled([loadShots(200), loadBatchMap()]);
}
