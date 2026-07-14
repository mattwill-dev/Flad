<script setup>
/**
 * The weekly on/off schedule (enable/days/times) now lives inline on the
 * Settings landing page — see ScheduleWidget.vue, reached by tapping this
 * panel's title. Only night mode doesn't fit in a small card, so it's all
 * that's left here.
 */
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { openWheel } from '../../composables/useModals.js';
import { appSettings, loadAppSettings, saveAppSetting } from '../../composables/useSettings.js';

defineEmits(['close']);
const { t } = useI18n();

onMounted(loadAppSettings);

function pad2(n) { return String(n).padStart(2, '0'); }
function timeValues() {
  const out = [];
  for (let h = 0; h < 24; h++) for (const m of [0, 15, 30, 45]) out.push(`${pad2(h)}:${pad2(m)}`);
  return out;
}

// Night mode (appSettings.nightMode*) is a separate, simpler gateway setting
// from the weekly on/off schedule above — pauses charging overnight rather
// than powering the machine off — stored as minutes-of-day (e.g. 1320 = 22:00).
function minutesToHHMM(mins) {
  const m = ((Number(mins) || 0) % 1440 + 1440) % 1440;
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
}
function hhmmToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
async function editNightTime(key, label) {
  const v = await openWheel({ title: label, values: timeValues(), current: minutesToHHMM(appSettings[key]) });
  if (v == null) return;
  saveAppSetting(key, hhmmToMinutes(v));
}
</script>

<template>
  <div class="overlay-full">
    <div class="ov-top">
      <button class="ov-back" @click="$emit('close')">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>{{ t('settingsPage.back') }}
      </button>
      <span class="ov-title">{{ t('settingsPage.schedule') }}</span>
    </div>

    <div class="settings-scroll">
      <span class="setting-group-label">{{ t('scheduleSettings.nightMode') }}</span>
      <div class="setting-row">
        <span class="sr-main"><span class="sr-name">{{ t('scheduleSettings.nightModeEnabled') }}</span><span class="sr-sub">{{ t('scheduleSettings.nightModeSub') }}</span></span>
        <button class="switch" :class="{ on: appSettings.nightModeEnabled }" role="switch" :aria-checked="!!appSettings.nightModeEnabled" @click="saveAppSetting('nightModeEnabled', !appSettings.nightModeEnabled)"></button>
      </div>
      <template v-if="appSettings.nightModeEnabled">
        <button class="setting-row as-btn" @click="editNightTime('nightModeSleepTime', t('scheduleSettings.nightSleep'))">
          <span class="sr-name">{{ t('scheduleSettings.nightSleep') }}</span>
          <span class="sr-value">{{ minutesToHHMM(appSettings.nightModeSleepTime) }}<span class="sr-chev">›</span></span>
        </button>
        <button class="setting-row as-btn" @click="editNightTime('nightModeMorningTime', t('scheduleSettings.nightWake'))">
          <span class="sr-name">{{ t('scheduleSettings.nightWake') }}</span>
          <span class="sr-value">{{ minutesToHHMM(appSettings.nightModeMorningTime) }}<span class="sr-chev">›</span></span>
        </button>
      </template>
    </div>
  </div>
</template>
