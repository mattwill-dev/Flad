<script setup>
/**
 * Inline weekly on/off schedule, modelled on NSX's schedule-card — flipping it
 * off before a trip shouldn't cost a panel round-trip. Drives the SAME
 * scheduleState/applySchedule() SchedulePanel.vue uses, so there's one source
 * of truth; the panel (reached via the title) only adds night mode.
 */
import { useI18n } from 'vue-i18n';
import { scheduleState, applySchedule } from '../../composables/useSettings.js';

const emit = defineEmits(['openPanel']);
const { t } = useI18n();

const DAYS = [1, 2, 3, 4, 5, 6, 7];
const dayLabel = (d) => t(`scheduleSettings.day${d}`);
const pad2 = (n) => String(n).padStart(2, '0');

function toggleDay(d) {
  const days = scheduleState.days.includes(d)
    ? scheduleState.days.filter((x) => x !== d)
    : [...scheduleState.days, d].sort();
  applySchedule({ days });
}
function step(hourKey, minuteKey, delta) {
  const total = ((scheduleState[hourKey] * 60 + scheduleState[minuteKey]) + delta * 15 + 1440) % 1440;
  applySchedule({ [hourKey]: Math.floor(total / 60), [minuteKey]: total % 60 });
}
</script>

<template>
  <div class="hero-card schedule-widget">
    <div class="sch-header">
      <button class="sch-title-btn" @click="emit('openPanel')">{{ t('scheduleSettings.title') }}</button>
      <button class="switch sm" :class="{ on: scheduleState.enabled }" role="switch" :aria-checked="scheduleState.enabled" @click="applySchedule({ enabled: !scheduleState.enabled })"></button>
    </div>
    <template v-if="scheduleState.enabled">
      <div class="sch-time-row">
        <span class="sch-lbl">{{ t('scheduleSettings.wake') }}</span>
        <div class="sch-controls">
          <button class="sch-btn" @click="step('onHour', 'onMinute', -1)">−</button>
          <span class="sch-val">{{ pad2(scheduleState.onHour) }}:{{ pad2(scheduleState.onMinute) }}</span>
          <button class="sch-btn" @click="step('onHour', 'onMinute', 1)">+</button>
        </div>
      </div>
      <div class="sch-time-row">
        <span class="sch-lbl">{{ t('scheduleSettings.sleep') }}</span>
        <div class="sch-controls">
          <button class="sch-btn" @click="step('offHour', 'offMinute', -1)">−</button>
          <span class="sch-val">{{ pad2(scheduleState.offHour) }}:{{ pad2(scheduleState.offMinute) }}</span>
          <button class="sch-btn" @click="step('offHour', 'offMinute', 1)">+</button>
        </div>
      </div>
      <div class="sch-days">
        <button v-for="d in DAYS" :key="d" class="day-chip sm" :class="{ on: scheduleState.days.includes(d) }" @click="toggleDay(d)">{{ dayLabel(d)[0] }}</button>
      </div>
    </template>
    <div v-else class="sch-disabled-hint">{{ t('scheduleSettings.enabledSub') }}</div>
  </div>
</template>
