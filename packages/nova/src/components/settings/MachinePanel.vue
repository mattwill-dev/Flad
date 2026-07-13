<script setup>
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { openNumberPad, openChooser } from '../../composables/useModals.js';
import { machine } from '../../composables/useCore.js';
import {
  devices, loadDevices, scanForDevices, connectToDevice, disconnectDevice,
  appSettings, loadAppSettings, saveAppSetting,
  machineSettings, loadMachineSettings, saveMachineSetting,
  advancedSettings, loadAdvancedSettings, saveAdvancedSetting,
  machineInfo, loadMachineInfo, pushRefillLevel,
} from '../../composables/useSettings.js';

defineEmits(['close']);
const { t } = useI18n();

onMounted(() => {
  loadDevices();
  loadAppSettings();
  loadMachineSettings();
  loadAdvancedSettings();
  loadMachineInfo();
});

function toggleDevice(d) {
  if (d.connected) disconnectDevice(d.id);
  else connectToDevice(d.id);
}

// '' (not null) represents "None" — openChooser resolves null on cancel, so
// null must stay unambiguous as "the user closed this without picking anything".
const noneLabel = () => t('machineSettings.none');
const machineOpts = computed(() => [
  ['', noneLabel()],
  ...devices.value.filter((d) => d.type === 'machine').map((d) => [d.id, d.name]),
]);
const scaleOpts = computed(() => [
  ['', noneLabel()],
  ...devices.value.filter((d) => d.type === 'scale').map((d) => [d.id, d.name]),
]);
const optLabel = (opts, v) => opts.find(([value]) => value === (v || ''))?.[1] ?? noneLabel();
const scalePowerOpts = [
  ['disabled', t('machineSettings.spDisabled')],
  ['displayOff', t('machineSettings.spDisplayOff')],
  ['disconnect', t('machineSettings.spDisconnect')],
];

async function pickPreferredMachine() {
  const v = await openChooser({ title: t('machineSettings.preferredMachine'), options: machineOpts.value, current: appSettings.preferredMachineId || '' });
  if (v != null) saveAppSetting('preferredMachineId', v || null);
}
async function pickPreferredScale() {
  const v = await openChooser({ title: t('machineSettings.preferredScale'), options: scaleOpts.value, current: appSettings.preferredScaleId || '' });
  if (v != null) saveAppSetting('preferredScaleId', v || null);
}
async function pickScalePowerMode() {
  const v = await openChooser({ title: t('machineSettings.scalePower'), options: scalePowerOpts, current: appSettings.scalePowerMode });
  if (v != null) saveAppSetting('scalePowerMode', v);
}

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
      <span class="setting-group-label">{{ t('machineSettings.connections') }}</span>
      <div v-for="d in devices" :key="d.id" class="setting-row">
        <span class="sr-main">
          <span class="sr-name">{{ d.name }}</span>
          <span class="sr-sub">{{ d.type === 'scale' ? t('machineSettings.scale') : t('machineSettings.machine') }}</span>
        </span>
        <button class="switch" :class="{ on: d.connected }" role="switch" :aria-checked="d.connected" @click="toggleDevice(d)"></button>
      </div>
      <button class="setting-row as-btn" @click="scanForDevices">
        <span class="sr-name">{{ t('machineSettings.scan') }}</span>
      </button>
      <button class="setting-row as-btn" @click="pickPreferredMachine">
        <span class="sr-main"><span class="sr-name">{{ t('machineSettings.preferredMachine') }}</span><span class="sr-sub">{{ t('machineSettings.autoConnect') }}</span></span>
        <span class="sr-value">{{ optLabel(machineOpts, appSettings.preferredMachineId) }}<span class="sr-chev">›</span></span>
      </button>
      <button class="setting-row as-btn" @click="pickPreferredScale">
        <span class="sr-main"><span class="sr-name">{{ t('machineSettings.preferredScale') }}</span><span class="sr-sub">{{ t('machineSettings.autoConnect') }}</span></span>
        <span class="sr-value">{{ optLabel(scaleOpts, appSettings.preferredScaleId) }}<span class="sr-chev">›</span></span>
      </button>
      <button class="setting-row as-btn" @click="pickScalePowerMode">
        <span class="sr-main"><span class="sr-name">{{ t('machineSettings.scalePower') }}</span><span class="sr-sub">{{ t('machineSettings.spSub') }}</span></span>
        <span class="sr-value">{{ optLabel(scalePowerOpts, appSettings.scalePowerMode) }}<span class="sr-chev">›</span></span>
      </button>

      <span class="setting-group-label">{{ t('machineSettings.waterTank') }}</span>
      <button class="setting-row as-btn" @click="editRefillLevel">
        <span class="sr-main"><span class="sr-name">{{ t('machineSettings.refillAlert') }}</span><span class="sr-sub">{{ t('machineSettings.refillSub') }}</span></span>
        <span class="sr-value">{{ machine.water.refillLevel ?? '—' }} ml<span class="sr-chev">›</span></span>
      </button>

      <span class="setting-group-label">{{ t('machineSettings.charging') }}</span>
      <div class="setting-row">
        <span class="sr-name">{{ t('machineSettings.usb') }}</span>
        <button class="switch" :class="{ on: machineSettings.usb }" role="switch" :aria-checked="!!machineSettings.usb" @click="saveMachineSetting('usb', !machineSettings.usb)"></button>
      </div>

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
