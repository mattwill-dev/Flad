<script setup>
/**
 * Settings that belong to the Streamline-Bridge gateway, not the DE1 itself —
 * BLE devices, charging, the update checker, plugins. See MachinePanel.vue for
 * the DE1-only half of what used to be one grab-bag "Machine" tile.
 */
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { openChooser } from '../../composables/useModals.js';
import {
  devices, loadDevices, scanForDevices, connectToDevice, disconnectDevice,
  appSettings, loadAppSettings, saveAppSetting,
  machineSettings, loadMachineSettings, saveMachineSetting,
  loadPlugins, visualizerPlugin,
} from '../../composables/useSettings.js';
import VisualizerPanel from './VisualizerPanel.vue';

defineEmits(['close']);
const { t } = useI18n();

onMounted(() => {
  loadDevices();
  loadAppSettings();
  loadMachineSettings();
  loadPlugins();
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
const chargingOpts = [
  ['disabled', t('appSettings.chargingDisabled')],
  ['longevity', t('appSettings.chargingLongevity')],
  ['balanced', t('appSettings.chargingBalanced')],
  ['highAvailability', t('appSettings.chargingHighAvailability')],
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
async function pickChargingMode() {
  const v = await openChooser({ title: t('appSettings.chargingMode'), options: chargingOpts, current: appSettings.chargingMode });
  if (v != null) saveAppSetting('chargingMode', v);
}

const gmOpts = [['disabled', t('systemSettings.gmDisabled')], ['tracking', t('systemSettings.gmTracking')], ['full', t('systemSettings.gmFull')]];
const logOpts = ['INFO', 'WARNING', 'SEVERE', 'FINE', 'FINER', 'FINEST', 'ALL', 'OFF'].map((v) => [v, v]);
const optLabelSimple = (opts, v) => opts.find(([value]) => value === v)?.[1] ?? '';
async function pickGatewayMode() {
  const v = await openChooser({ title: t('systemSettings.gatewayMode'), options: gmOpts, current: appSettings.gatewayMode });
  if (v != null) saveAppSetting('gatewayMode', v);
}
async function pickLogLevel() {
  const v = await openChooser({ title: t('systemSettings.logLevel'), options: logOpts, current: appSettings.logLevel });
  if (v != null) saveAppSetting('logLevel', v);
}

const showVisualizer = ref(false);
</script>

<template>
  <div class="overlay-full">
    <div class="ov-top">
      <button class="ov-back" @click="$emit('close')">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>{{ t('settingsPage.back') }}
      </button>
      <span class="ov-title">{{ t('settingsPage.app') }}</span>
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

      <span class="setting-group-label">{{ t('appSettings.powerCharging') }}</span>
      <button class="setting-row as-btn" @click="pickChargingMode">
        <span class="sr-name">{{ t('appSettings.chargingMode') }}</span>
        <span class="sr-value">{{ optLabelSimple(chargingOpts, appSettings.chargingMode) }}<span class="sr-chev">›</span></span>
      </button>
      <div class="setting-row">
        <span class="sr-name">{{ t('machineSettings.usb') }}</span>
        <button class="switch" :class="{ on: machineSettings.usb }" role="switch" :aria-checked="!!machineSettings.usb" @click="saveMachineSetting('usb', !machineSettings.usb)"></button>
      </div>
      <div class="setting-row">
        <span class="sr-main"><span class="sr-name">{{ t('appSettings.lowBatteryBrightnessLimit') }}</span><span class="sr-sub">{{ t('appSettings.lowBatteryBrightnessLimitSub') }}</span></span>
        <button class="switch" :class="{ on: appSettings.lowBatteryBrightnessLimit }" role="switch" :aria-checked="!!appSettings.lowBatteryBrightnessLimit" @click="saveAppSetting('lowBatteryBrightnessLimit', !appSettings.lowBatteryBrightnessLimit)"></button>
      </div>

      <span class="setting-group-label">{{ t('systemSettings.advanced') }}</span>
      <button class="setting-row as-btn" @click="pickGatewayMode">
        <span class="sr-name">{{ t('systemSettings.gatewayMode') }}</span>
        <span class="sr-value">{{ optLabelSimple(gmOpts, appSettings.gatewayMode) }}<span class="sr-chev">›</span></span>
      </button>
      <button class="setting-row as-btn" @click="pickLogLevel">
        <span class="sr-name">{{ t('systemSettings.logLevel') }}</span>
        <span class="sr-value">{{ appSettings.logLevel }}<span class="sr-chev">›</span></span>
      </button>
      <div class="setting-row">
        <span class="sr-name">{{ t('systemSettings.autoUpdate') }}</span>
        <button class="switch" :class="{ on: appSettings.automaticUpdateCheck }" role="switch" :aria-checked="!!appSettings.automaticUpdateCheck" @click="saveAppSetting('automaticUpdateCheck', !appSettings.automaticUpdateCheck)"></button>
      </div>

      <span class="setting-group-label">{{ t('systemSettings.integrations') }}</span>
      <button class="setting-row as-btn" @click="showVisualizer = true">
        <span class="sr-name">{{ t('systemSettings.visualizer') }}</span>
        <span class="sr-value muted">{{ visualizerPlugin()?.loaded ? t('settingsPage.connected') : '' }}<span class="sr-chev">›</span></span>
      </button>
    </div>

    <VisualizerPanel v-if="showVisualizer" @close="showVisualizer = false" />
  </div>
</template>
