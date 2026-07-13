<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { phase, series, historyShots, historyIndex, currentFullShot, skipShot, closeHistory, olderShot, newerShot, rateShot, setActualDose } from '../composables/useLiveShot.js';
import { recipe } from '../composables/useRecipe.js';
import { machine } from '../composables/useCore.js';
import { openNumberPad } from '../composables/useModals.js';
import ShotGraph from './ShotGraph.vue';

const { t } = useI18n();
const { NSXCore } = window;

const LIVE_COLORS = { temp: '#e8846f', pressure: '#c98a4b', flow: '#7fa8c9', wflow: '#5fb8a5' };

// ── Live ──
const liveSeries = computed(() => [
  { label: t('liveShot.mTemp'), color: LIVE_COLORS.temp, values: series.temperature, scale: 'temp' },
  { label: t('liveShot.mWflow'), color: LIVE_COLORS.wflow, values: series.weightFlow },
  { label: t('liveShot.mFlow'), color: LIVE_COLORS.flow, values: series.flow },
  { label: t('liveShot.mPressure'), color: LIVE_COLORS.pressure, values: series.pressure },
]);
const liveElapsedLabel = computed(() => {
  const s = series.elapsed.at(-1) ?? 0;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
});
function last(arr, dec = 1) { return arr.length ? arr.at(-1).toFixed(dec) : '0.0'; }
const weightPct = computed(() =>
  recipe.targetYield > 0 ? Math.max(0, Math.min(100, (machine.weight / recipe.targetYield) * 100)) : 0
);

// ── History ──
// historyShots only carries the lightweight list-endpoint shot (no
// measurements) — the graph, duration, actual dose/yield, and ratio all need
// the FULL record useLiveShot.js fetches into currentFullShot whenever the
// selection changes. currentShot stays around for fields the list item
// already has (timestamp, grinder setting) so those render instantly instead
// of waiting on the extra fetch.
const currentShot = computed(() => historyShots.value[historyIndex.value] ?? null);
const shotSeries = computed(() => {
  if (!currentFullShot.value) return null;
  return NSXCore.normalizeShotData(currentFullShot.value);
});
const historyGraphSeries = computed(() => {
  const s = shotSeries.value;
  if (!s) return [];
  return [
    { label: t('liveShot.mTemp'), color: LIVE_COLORS.temp, values: s.temperature, scale: 'temp' },
    { label: t('liveShot.mWflow'), color: LIVE_COLORS.wflow, values: s.scaleRate },
    { label: t('liveShot.mFlow'), color: LIVE_COLORS.flow, values: s.flow },
    { label: t('liveShot.mPressure'), color: LIVE_COLORS.pressure, values: s.pressure },
  ];
});
const dateLabel = computed(() => {
  const shot = currentShot.value;
  if (!shot?.timestamp) return '—';
  const d = new Date(shot.timestamp);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
});
const durationLabel = computed(() => {
  if (!currentFullShot.value) return '—';
  const secs = NSXCore.getShotDurationSeconds(currentFullShot.value);
  return secs != null ? Math.round(secs) : '—';
});
// The DE1/scale only ever measures OUTPUT weight — dose-in is an editable
// annotation (defaulting to the recipe's planned dose), same ceiling NSX's
// own shot review has. Ratio is actual-output ÷ that dose, not the two
// planned recipe targets.
const actualDose = computed(() => (currentFullShot.value ? NSXCore.resolveActualDose(currentFullShot.value) : null));
const actualYield = computed(() => (currentFullShot.value ? NSXCore.resolveActualYield(currentFullShot.value) : { value: null, unit: 'g', estimated: false }));
const ratioLabel = computed(() => {
  const dose = actualDose.value;
  const yieldW = actualYield.value.value;
  return dose && yieldW ? NSXCore.calcRatio(dose, yieldW) : '—';
});
// 0-100 enjoyment -> the 0-5 stars this screen renders (see mapping.js).
const rating = computed(() => NSXCore.enjoymentToStars(currentShot.value?.annotations?.enjoyment));

function setRating(n) {
  if (currentShot.value) rateShot(currentShot.value, n);
}

async function editActualDose() {
  const v = await openNumberPad({ title: t('liveShot.mIn'), unit: 'g', value: actualDose.value ?? '' });
  if (v != null) setActualDose(parseFloat(v));
}
</script>

<template>
  <div v-if="phase === 'live'" class="overlay-full">
    <div class="live-top">
      <span class="live-title">{{ t('liveShot.title') }}</span>
      <div class="wbar">
        <span class="wbar-label"><b>{{ machine.weight.toFixed(0) }}</b> / {{ recipe.targetYield.toFixed(0) }} g</span>
        <div class="wbar-track">
          <div class="wbar-fill" :style="{ width: `${weightPct}%` }"></div>
        </div>
      </div>
      <span style="min-width: 60px; text-align: right; font-variant-numeric: tabular-nums; color: var(--accent); font-weight: 700">{{ liveElapsedLabel }}</span>
    </div>
    <div class="shot-graph"><ShotGraph :elapsed="series.elapsed" :series="liveSeries" /></div>
    <div class="glabel">
      <i><span class="sw" :style="{ background: LIVE_COLORS.pressure }"></span>{{ t('liveShot.mPressure') }}</i>
      <i><span class="sw" :style="{ background: LIVE_COLORS.flow }"></span>{{ t('liveShot.mFlow') }}</i>
      <i><span class="sw" :style="{ background: LIVE_COLORS.wflow }"></span>{{ t('liveShot.mWflow') }}</i>
      <i><span class="sw" :style="{ background: LIVE_COLORS.temp }"></span>{{ t('liveShot.mTemp') }}</i>
    </div>
    <div class="live-metrics">
      <div class="metric"><div class="ml" :style="{ color: LIVE_COLORS.temp }">{{ t('liveShot.mTemp') }}</div><div class="mv">{{ last(series.temperature, 0) }}<small>°C</small></div></div>
      <div class="metric"><div class="ml" :style="{ color: LIVE_COLORS.pressure }">{{ t('liveShot.mPressure') }}</div><div class="mv">{{ last(series.pressure) }}<small>bar</small></div></div>
      <div class="metric"><div class="ml" :style="{ color: LIVE_COLORS.flow }">{{ t('liveShot.mFlow') }}</div><div class="mv">{{ last(series.flow) }}<small>ml/s</small></div></div>
      <div class="metric"><div class="ml" :style="{ color: LIVE_COLORS.wflow }">{{ t('liveShot.mWflow') }}</div><div class="mv">{{ last(series.weightFlow) }}<small>g/s</small></div></div>
      <div class="metric"><div class="ml">{{ t('liveShot.mTime') }}</div><div class="mv">{{ liveElapsedLabel }}</div></div>
    </div>
    <div class="live-bottom"><button class="skip-btn" @click="skipShot">{{ t('liveShot.skip') }}</button></div>
  </div>

  <div v-else-if="phase === 'history'" class="overlay-full">
    <div class="ov-top">
      <button class="ov-back" @click="closeHistory">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>{{ t('liveShot.back') }}
      </button>
      <span class="ov-title">{{ t('liveShot.historyTitle') }}</span>
      <div class="date-nav">
        <button :disabled="historyIndex >= historyShots.length - 1" @click="olderShot">‹</button>
        <span class="date">{{ dateLabel }}</span>
        <button :disabled="historyIndex <= 0" @click="newerShot">›</button>
      </div>
    </div>

    <template v-if="currentShot">
      <div class="shot-graph"><ShotGraph :elapsed="shotSeries?.elapsed ?? []" :series="historyGraphSeries" /></div>
      <div class="glabel">
        <i><span class="sw" :style="{ background: LIVE_COLORS.pressure }"></span>{{ t('liveShot.mPressure') }}</i>
        <i><span class="sw" :style="{ background: LIVE_COLORS.flow }"></span>{{ t('liveShot.mFlow') }}</i>
        <i><span class="sw" :style="{ background: LIVE_COLORS.wflow }"></span>{{ t('liveShot.mWflow') }}</i>
        <i><span class="sw" :style="{ background: LIVE_COLORS.temp }"></span>{{ t('liveShot.mTemp') }}</i>
      </div>
      <div class="shot-metrics">
        <div class="metric"><div class="ml">{{ t('liveShot.mGrind') }}</div><div class="mv">{{ currentShot.workflow?.context?.grinderSetting ?? '—' }}</div></div>
        <button class="metric as-btn" @click="editActualDose">
          <div class="ml">{{ t('liveShot.mIn') }}</div><div class="mv">{{ actualDose ?? '—' }}<small>g</small></div>
        </button>
        <div class="metric"><div class="ml">{{ t('liveShot.mOut') }}</div><div class="mv">{{ actualYield.value ?? '—' }}<small>{{ actualYield.unit }}{{ actualYield.estimated ? '*' : '' }}</small></div></div>
        <div class="metric"><div class="ml">{{ t('liveShot.mRatio') }}</div><div class="mv">{{ ratioLabel }}</div></div>
        <div class="metric"><div class="ml">{{ t('liveShot.mTime') }}</div><div class="mv">{{ durationLabel }}<small>s</small></div></div>
      </div>
      <div class="shot-done">
        <div class="rate-stars">
          <button v-for="n in 5" :key="n" class="star" :class="{ on: n <= rating }" @click="setRating(n)">{{ n <= rating ? '★' : '☆' }}</button>
        </div>
      </div>
    </template>
    <div v-else class="list"><div class="list-row"><span class="rsub">{{ t('liveShot.noShotsYet') }}</span></div></div>
  </div>
</template>
