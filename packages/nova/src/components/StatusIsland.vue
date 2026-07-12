<script setup>
/**
 * The status island: machine state, clock, water level, scale indicator, and a
 * heating progress ring drawn around the pill's own border.
 *
 * The ring is driven by real data (NSXCore's "timeToReady" event -> machine.
 * timeToReadyMs), not a decorative timer: the first remainingMs sample seen
 * after the machine enters "heating" becomes the 100% baseline, and the ring
 * fills as remainingMs counts down toward 0. It disappears the moment the
 * state leaves "heating" — it never gets stuck showing a stale percentage.
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { machine } from '../composables/useCore.js';

const { t } = useI18n();

const ICONS = {
  water: '<path d="M12 3.5s5.5 6.3 5.5 10a5.5 5.5 0 0 1-11 0c0-3.7 5.5-10 5.5-10z"/><path d="M9.5 14.5a2.8 2.8 0 0 0 2.3 2.7"/>',
  scale: '<rect x="5" y="4" width="14" height="16" rx="3"/><path d="M9 8a3.5 3.5 0 0 0 6 0"/>',
};

const HEATING_STATES = new Set(['heating', 'preheating']);
const ALERT_STATES = new Set(['needsWater', 'error']);

const statusClass = computed(() => {
  if (machine.state === 'idle') return 'ready';
  if (HEATING_STATES.has(machine.state)) return 'heating';
  if (ALERT_STATES.has(machine.state)) return 'alert';
  return '';
});

const statusLabel = computed(() => {
  const key = machine.state === 'idle' ? 'ready' : machine.state;
  return t(`status.${key}`);
});

// ── Heating ring: baseline captured from the first real sample, not assumed ──
const heatingBaselineMs = ref(null);
watch(
  () => machine.state,
  (state) => { if (!HEATING_STATES.has(state)) heatingBaselineMs.value = null; }
);
watch(
  () => machine.timeToReadyMs,
  (ms) => {
    if (HEATING_STATES.has(machine.state) && ms != null && heatingBaselineMs.value == null) {
      heatingBaselineMs.value = ms || 1; // avoid a zero baseline (instant division)
    }
  }
);

const heatingPct = computed(() => {
  if (!HEATING_STATES.has(machine.state)) return null;
  if (heatingBaselineMs.value == null || machine.timeToReadyMs == null) return null;
  const pct = 100 * (1 - machine.timeToReadyMs / heatingBaselineMs.value);
  return Math.max(0, Math.min(100, pct));
});

// ── Clock: minute resolution, so a 15s tick is plenty ──
const now = ref(new Date());
let clockTimer = null;
onMounted(() => { clockTimer = setInterval(() => { now.value = new Date(); }, 15_000); });
onUnmounted(() => clearInterval(clockTimer));

const clockLabel = computed(() => {
  const h = String(now.value.getHours()).padStart(2, '0');
  const m = String(now.value.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
});
</script>

<template>
  <div class="status-island">
    <svg v-if="heatingPct != null" class="heat-ring" viewBox="0 0 600 30" preserveAspectRatio="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="597" height="27" rx="14" pathLength="100" :style="{ strokeDashoffset: 100 - heatingPct }" />
    </svg>

    <span class="st-left" :class="statusClass">
      <span class="st-dot" :class="statusClass"></span>
      {{ statusLabel }}<template v-if="heatingPct != null"> {{ Math.round(heatingPct) }}%</template>
    </span>

    <span class="st-mid">{{ clockLabel }}</span>

    <span class="st-right">
      <span v-if="machine.water.currentLevel != null" class="st-item">
        <svg viewBox="0 0 24 24" aria-hidden="true" v-html="ICONS.water"></svg>{{ machine.water.currentLevel }}
      </span>
      <span class="st-item" :class="{ off: !machine.scaleConnected }">
        <svg viewBox="0 0 24 24" aria-hidden="true" v-html="ICONS.scale"></svg>
      </span>
    </span>
  </div>
</template>
