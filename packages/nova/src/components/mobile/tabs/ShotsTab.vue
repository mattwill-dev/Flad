<script setup>
/**
 * Phone "Shots" — the flat all-beans shot history (DiaryView.vue's "full
 * history" toggle), broken out as its own tab so it doesn't compete with the
 * Diary's browse drill-down on a narrow screen.
 */
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  fullHistoryShots, hasMoreShots, loadMoreFullHistory, ensureDiaryLoaded,
  ensureShotMetrics, shotMetrics,
} from '../../../composables/useDiary.js';
import { singleGrinder } from '../../../composables/useCore.js';
import { openHistoryAt } from '../../../composables/useLiveShot.js';

const { t } = useI18n();

onMounted(ensureDiaryLoaded);
watch(fullHistoryShots, (list) => ensureShotMetrics(list), { immediate: true });

const loadingMore = ref(false);
async function onLoadMore() {
  if (loadingMore.value) return;
  loadingMore.value = true;
  try { await loadMoreFullHistory(20); } finally { loadingMore.value = false; }
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
</script>

<template>
  <section class="phone-page">
    <h1 class="phone-title">{{ t('diary.fullHistory') }}</h1>

    <div class="phone-list">
      <button
        v-for="shot in fullHistoryShots"
        :key="shot.id"
        class="phone-shot-row"
        @click="openHistoryAt(fullHistoryShots, shot)"
      >
        <span class="shot-facts">
          <span class="fact"><b>{{ fmtDate(shot.timestamp) }}</b></span>
          <span class="fact">{{ factsFor(shot).coffeeRoaster }} — {{ factsFor(shot).coffeeName }}</span>
          <span class="fact">{{ factsFor(shot).profileTitle }}</span>
          <span class="fact" v-if="!singleGrinder"><b>{{ factsFor(shot).grinderModel }}</b></span>
          <span class="fact">
            <b>{{ actualDose(shot)?.toFixed(1) ?? '—' }}</b>g<template v-if="metricsFor(shot)"> → <b>{{ metricsFor(shot).yield?.toFixed(1) ?? '—' }}</b>{{ metricsFor(shot).yieldUnit }} (<b>{{ metricsFor(shot).ratio }}</b>)</template>
          </span>
        </span>
        <span class="stars">
          <svg v-for="n in 5" :key="n" viewBox="0 0 24 24" :class="{ on: n <= starLevel(shot) }" aria-hidden="true">
            <path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3-5.6-3.3-5.6 3.3 1.4-6.3-4.8-4.3 6.4-.6z" />
          </svg>
        </span>
      </button>
      <div v-if="!fullHistoryShots.length" class="phone-empty">{{ t('diary.noResults') }}</div>
      <button v-if="hasMoreShots" class="phone-load-more" :disabled="loadingMore" @click="onLoadMore">
        {{ loadingMore ? t('diary.loading') : t('diary.loadMore', { n: 20 }) }}
      </button>
    </div>
  </section>
</template>
