<script setup>
/**
 * Phone "Diary" — the same roaster -> bean -> profile -> shot drill-down as
 * DiaryView.vue (same composable, same state), reflowed into a single
 * scrolling column instead of the tablet's fixed page chrome. Recipe
 * creation/loading is left to the tablet: this is a browse-only companion
 * (see useLayout.js), and "load recipe" would push a workflow onto the
 * machine, which is exactly the live-control this shell deliberately omits.
 */
import { computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  diaryState, roasterGroups, beansInRoaster,
  enterRoaster, enterBean, goBack, ensureDiaryLoaded, shotCountForBean,
  profileGroupsInBean, toggleProfileExpanded,
  shotMetrics, ensureShotMetrics,
} from '../../../composables/useDiary.js';
import { openTextField } from '../../../composables/useModals.js';
import { openHistoryAt } from '../../../composables/useLiveShot.js';

const { t } = useI18n();

onMounted(ensureDiaryLoaded);

const crumb = computed(() => {
  if (diaryState.level === 0) return t('diary.roasters');
  if (diaryState.level === 1) return diaryState.roasterName;
  return `${diaryState.roasterName} › ${diaryState.bean?.name ?? ''}`;
});

async function openSearch() {
  const placeholder = [t('diary.searchRoaster'), t('diary.searchBean'), t('diary.searchProfile')][diaryState.level];
  const value = await openTextField({ title: t('diary.search'), value: diaryState.query, placeholder });
  if (value !== null) diaryState.query = value;
}

const starLevel = (shot) => window.NSXCore.enjoymentToStars(shot?.annotations?.enjoyment);
const factsFor = (shot) => window.NSXCore.mapShotToWorkflow(shot);
const actualDose = (shot) => window.NSXCore.resolveActualDose(shot);
const metricsFor = (shot) => shotMetrics.get(shot.id) || null;

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
}

function onEnterBean(bean) {
  enterBean(bean);
}
// Metrics for whatever's expanded once a bean is drilled into.
watch(
  () => diaryState.expandedProfile,
  (title) => {
    if (!title) return;
    const group = profileGroupsInBean.value.find((g) => g.title === title);
    if (group) ensureShotMetrics(group.shots);
  }
);
</script>

<template>
  <section class="phone-page">
    <div class="phone-head">
      <button v-if="diaryState.level > 0" class="phone-back" @click="goBack">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <span class="phone-crumb">{{ crumb }}</span>
      <button class="phone-icon-btn" :aria-label="t('diary.search')" @click="openSearch">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></svg>
      </button>
    </div>

    <button v-if="diaryState.query" class="phone-filter-chip" @click="diaryState.query = ''">
      {{ t('diary.filteredBy', { q: diaryState.query }) }} <span class="x">×</span>
    </button>

    <!-- Roasters -->
    <div v-if="diaryState.level === 0" class="phone-list">
      <button v-for="g in roasterGroups" :key="g.name" class="phone-list-row" @click="enterRoaster(g.name)">
        <span class="rmeta">{{ g.name }}<span class="rsub">{{ g.beans.length }} bean{{ g.beans.length !== 1 ? 's' : '' }}</span></span>
        <span class="chev">›</span>
      </button>
      <div v-if="!roasterGroups.length" class="phone-empty">{{ t('diary.noResults') }}</div>
    </div>

    <!-- Beans in a roaster -->
    <div v-else-if="diaryState.level === 1" class="phone-list">
      <button v-for="bean in beansInRoaster" :key="bean.id" class="phone-list-row" @click="onEnterBean(bean)">
        <span class="rmeta">{{ bean.name }}<span class="rsub">{{ shotCountForBean(bean) }}</span></span>
        <span class="chev">›</span>
      </button>
      <div v-if="!beansInRoaster.length" class="phone-empty">{{ t('diary.noResults') }}</div>
    </div>

    <!-- Profiles used with this bean -->
    <div v-else class="phone-list">
      <template v-for="group in profileGroupsInBean" :key="group.title">
        <button class="phone-list-row" @click="toggleProfileExpanded(group.title)">
          <span class="rmeta">{{ group.title }}<span class="rsub">{{ group.shots.length }} shot{{ group.shots.length !== 1 ? 's' : '' }}</span></span>
          <span class="chev" :class="{ open: diaryState.expandedProfile === group.title }">›</span>
        </button>
        <div v-if="diaryState.expandedProfile === group.title" class="phone-sublist">
          <button
            v-for="shot in group.shots"
            :key="shot.id"
            class="phone-shot-row"
            @click="openHistoryAt(group.shots, shot)"
          >
            <span class="shot-facts">
              <span class="fact"><b>{{ fmtDate(shot.timestamp) }}</b></span>
              <span class="fact"><b>{{ actualDose(shot)?.toFixed(1) ?? '—' }}</b>g<template v-if="metricsFor(shot)"> → <b>{{ metricsFor(shot).yield?.toFixed(1) ?? '—' }}</b>{{ metricsFor(shot).yieldUnit }}</template></span>
            </span>
            <span class="stars">
              <svg v-for="n in 5" :key="n" viewBox="0 0 24 24" :class="{ on: n <= starLevel(shot) }" aria-hidden="true">
                <path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3-5.6-3.3-5.6 3.3 1.4-6.3-4.8-4.3 6.4-.6z" />
              </svg>
            </span>
          </button>
        </div>
      </template>
      <div v-if="!profileGroupsInBean.length" class="phone-empty">{{ t('diary.noShotsYet') }}</div>
    </div>
  </section>
</template>
