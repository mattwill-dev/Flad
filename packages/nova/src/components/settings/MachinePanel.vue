<script setup>
/**
 * Settings that belong to the DE1 itself — things that would survive swapping
 * the tablet. BLE/gateway concerns (connections, charging, updates) live in
 * AppPanel.vue instead; see the design log for why the split is drawn there.
 */
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { openNumberPad, openChooser } from '../../composables/useModals.js';
import { machine } from '../../composables/useCore.js';
import {
  appSettings, loadAppSettings, saveAppSetting,
  machineSettings, loadMachineSettings, saveMachineSetting,
  advancedSettings, loadAdvancedSettings, saveAdvancedSetting,
  machineInfo, loadMachineInfo, pushRefillLevel,
  presenceSettings, loadPresenceSettings, savePresenceSetting,
} from '../../composables/useSettings.js';

defineEmits(['close']);
const { t } = useI18n();

onMounted(() => {
  loadAppSettings();
  loadMachineSettings();
  loadAdvancedSettings();
  loadMachineInfo();
  loadPresenceSettings();
});

async function editRefillLevel() {
  const v = await openNumberPad({ title: t('machineSettings.refillAlert'), unit: 'ml', value: machine.water.refillLevel ?? '' });
  if (v != null) pushRefillLevel(Number(v));
}

// Flow multipliers are real app-level settings (POST /settings), not
// machine-advanced ones, despite the name — see NSX's settings.js: they're
// saveRea, not saveDe1Adv. Only the heater/fan fields below are actually
// machine-advanced / machine-level.
async function editAppMultiplier(key, label) {
  const v = await openNumberPad({ title: label, value: appSettings[key] ?? 1 });
  if (v != null) saveAppSetting(key, Number(v));
}
async function editHeaterFlow(key, label) {
  const v = await openNumberPad({ title: label, unit: 'ml/s', value: advancedSettings[key] ?? 0 });
  if (v != null) saveAdvancedSetting(key, Number(v));
}
async function editFanThreshold() {
  const v = await openNumberPad({ title: t('machineSettings.fanThreshold'), unit: '°C', value: machineSettings.fan ?? 0 });
  if (v != null) saveMachineSetting('fan', Number(v));
}

async function editSleepTimeout() {
  const v = await openNumberPad({ title: t('machineSettings.autoSleepTimeout'), unit: 'min', value: presenceSettings.sleepTimeoutMinutes ?? 30 });
  if (v != null) savePresenceSetting('sleepTimeoutMinutes', Math.max(15, Math.min(120, Number(v))));
}
async function editFlushTemp() {
  const v = await openNumberPad({ title: t('machineSettings.flushTemp'), unit: '°C', value: machineSettings.flushTemp ?? 80 });
  if (v != null) saveMachineSetting('flushTemp', Number(v));
}
async function editFlushTimeout() {
  const v = await openNumberPad({ title: t('machineSettings.flushTimeout'), unit: 's', value: machineSettings.flushTimeout ?? 10 });
  if (v != null) saveMachineSetting('flushTimeout', Number(v));
}
const purgeOpts = [[0, t('machineSettings.spAutoPurge')], [1, t('machineSettings.spTwoTap')]];
async function pickSteamPurgeMode() {
  const v = await openChooser({ title: t('machineSettings.steamPurgeMode'), options: purgeOpts, current: machineSettings.steamPurgeMode ?? 0 });
  if (v != null) saveMachineSetting('steamPurgeMode', Number(v));
}
const purgeLabel = () => purgeOpts.find(([value]) => value === (machineSettings.steamPurgeMode ?? 0))?.[1] ?? '';
</script>

<template>
  <div class="overlay-full">
    <div class="ov-top">
      <button class="ov-back" @click="$emit('close')">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>{{ t('settingsPage.back') }}
      </button>
      <span class="ov-title">{{ t('settingsPage.machine') }}</span>
    </div>

    <div class="settings-scroll">
      <span class="setting-group-label">{{ t('machineSettings.autoSleep') }}</span>
      <div class="setting-row">
        <span class="sr-main"><span class="sr-name">{{ t('machineSettings.autoSleepEnabled') }}</span><span class="sr-sub">{{ t('machineSettings.autoSleepSub') }}</span></span>
        <button class="switch" :class="{ on: presenceSettings.userPresenceEnabled }" role="switch" :aria-checked="!!presenceSettings.userPresenceEnabled" @click="savePresenceSetting('userPresenceEnabled', !presenceSettings.userPresenceEnabled)"></button>
      </div>
      <button v-if="presenceSettings.userPresenceEnabled" class="setting-row as-btn" @click="editSleepTimeout">
        <span class="sr-name">{{ t('machineSettings.autoSleepTimeout') }}</span>
        <span class="sr-value">{{ presenceSettings.sleepTimeoutMinutes }} min<span class="sr-chev">›</span></span>
      </button>

      <span class="setting-group-label">{{ t('machineSettings.waterTank') }}</span>
      <button class="setting-row as-btn" @click="editRefillLevel">
        <span class="sr-main"><span class="sr-name">{{ t('machineSettings.refillAlert') }}</span><span class="sr-sub">{{ t('machineSettings.refillSub') }}</span></span>
        <span class="sr-value">{{ machine.water.refillLevel ?? '—' }} ml<span class="sr-chev">›</span></span>
      </button>

      <span class="setting-group-label">{{ t('machineSettings.steamFlush') }}</span>
      <button class="setting-row as-btn" @click="pickSteamPurgeMode">
        <span class="sr-name">{{ t('machineSettings.steamPurgeMode') }}</span>
        <span class="sr-value">{{ purgeLabel() }}<span class="sr-chev">›</span></span>
      </button>
      <button class="setting-row as-btn" @click="editFlushTemp">
        <span class="sr-name">{{ t('machineSettings.flushTemp') }}</span>
        <span class="sr-value">{{ machineSettings.flushTemp ?? '—' }}°C<span class="sr-chev">›</span></span>
      </button>
      <button class="setting-row as-btn" @click="editFlushTimeout">
        <span class="sr-name">{{ t('machineSettings.flushTimeout') }}</span>
        <span class="sr-value">{{ machineSettings.flushTimeout ?? '—' }} s<span class="sr-chev">›</span></span>
      </button>

      <span class="setting-group-label">{{ t('machineSettings.calibration') }}</span>
      <button class="setting-row as-btn" @click="editAppMultiplier('flowEstimationMultiplier', t('machineSettings.flowMult'))">
        <span class="sr-name">{{ t('machineSettings.flowMult') }}</span>
        <span class="sr-value">{{ appSettings.flowEstimationMultiplier ?? '—' }}<span class="sr-chev">›</span></span>
      </button>
      <button class="setting-row as-btn" @click="editAppMultiplier('weightFlowMultiplier', t('machineSettings.weightMult'))">
        <span class="sr-name">{{ t('machineSettings.weightMult') }}</span>
        <span class="sr-value">{{ appSettings.weightFlowMultiplier ?? '—' }}<span class="sr-chev">›</span></span>
      </button>
      <button class="setting-row as-btn" @click="editAppMultiplier('volumeFlowMultiplier', t('machineSettings.volumeMult'))">
        <span class="sr-name">{{ t('machineSettings.volumeMult') }}</span>
        <span class="sr-value">{{ appSettings.volumeFlowMultiplier ?? '—' }}<span class="sr-chev">›</span></span>
      </button>
      <button class="setting-row as-btn" @click="editFanThreshold">
        <span class="sr-name">{{ t('machineSettings.fanThreshold') }}</span>
        <span class="sr-value">{{ machineSettings.fan ?? '—' }}<span class="sr-chev">›</span></span>
      </button>
      <button class="setting-row as-btn" @click="editHeaterFlow('heaterIdleTemp', t('machineSettings.heaterIdle'))">
        <span class="sr-name">{{ t('machineSettings.heaterIdle') }}</span>
        <span class="sr-value">{{ advancedSettings.heaterIdleTemp ?? '—' }}<span class="sr-chev">›</span></span>
      </button>
      <button class="setting-row as-btn" @click="editHeaterFlow('heaterPh1Flow', t('machineSettings.heaterPh1'))">
        <span class="sr-name">{{ t('machineSettings.heaterPh1') }}</span>
        <span class="sr-value">{{ advancedSettings.heaterPh1Flow ?? '—' }}<span class="sr-chev">›</span></span>
      </button>
      <button class="setting-row as-btn" @click="editHeaterFlow('heaterPh2Flow', t('machineSettings.heaterPh2'))">
        <span class="sr-name">{{ t('machineSettings.heaterPh2') }}</span>
        <span class="sr-value">{{ advancedSettings.heaterPh2Flow ?? '—' }}<span class="sr-chev">›</span></span>
      </button>
      <button class="setting-row as-btn" @click="editHeaterFlow('heaterPh2Timeout', t('machineSettings.heaterPh2Timeout'))">
        <span class="sr-name">{{ t('machineSettings.heaterPh2Timeout') }}</span>
        <span class="sr-value">{{ advancedSettings.heaterPh2Timeout ?? '—' }}<span class="sr-chev">›</span></span>
      </button>

      <span class="setting-group-label">{{ t('machineSettings.info') }}</span>
      <div class="setting-row"><span class="sr-name">{{ t('machineSettings.model') }}</span><span class="sr-value muted">{{ machineInfo?.name ?? '—' }}</span></div>
      <div class="setting-row"><span class="sr-name">{{ t('machineSettings.firmware') }}</span><span class="sr-value muted">{{ machineInfo?.version ?? '—' }}</span></div>
      <div class="setting-row"><span class="sr-name">{{ t('machineSettings.serial') }}</span><span class="sr-value muted">{{ machineInfo?.serial ?? '—' }}</span></div>
    </div>
  </div>
</template>
