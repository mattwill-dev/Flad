<script setup>
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { openNumberPad } from '../../composables/useModals.js';
import {
  devices, loadDevices, scanForDevices, connectToDevice, disconnectDevice,
  advancedSettings, loadAdvancedSettings, saveAdvancedSetting,
  machineInfo, loadMachineInfo,
} from '../../composables/useSettings.js';

defineEmits(['close']);
const { t } = useI18n();

onMounted(() => {
  loadDevices();
  loadAdvancedSettings();
  loadMachineInfo();
});

function toggleDevice(d) {
  if (d.connected) disconnectDevice(d.id);
  else connectToDevice(d.id);
}

async function editMultiplier(key, label) {
  const v = await openNumberPad({ title: label, value: advancedSettings[key] ?? 1 });
  if (v != null) saveAdvancedSetting(key, Number(v));
}
async function editHeaterFlow(key, label) {
  const v = await openNumberPad({ title: label, unit: 'ml/s', value: advancedSettings[key] ?? 0 });
  if (v != null) saveAdvancedSetting(key, Number(v));
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

      <span class="setting-group-label">{{ t('machineSettings.calibration') }}</span>
      <button class="setting-row as-btn" @click="editMultiplier('flowEstimationMultiplier', t('machineSettings.flowMult'))">
        <span class="sr-name">{{ t('machineSettings.flowMult') }}</span>
        <span class="sr-value">{{ advancedSettings.flowEstimationMultiplier ?? '—' }}<span class="sr-chev">›</span></span>
      </button>
      <button class="setting-row as-btn" @click="editMultiplier('weightFlowMultiplier', t('machineSettings.weightMult'))">
        <span class="sr-name">{{ t('machineSettings.weightMult') }}</span>
        <span class="sr-value">{{ advancedSettings.weightFlowMultiplier ?? '—' }}<span class="sr-chev">›</span></span>
      </button>
      <button class="setting-row as-btn" @click="editMultiplier('volumeFlowMultiplier', t('machineSettings.volumeMult'))">
        <span class="sr-name">{{ t('machineSettings.volumeMult') }}</span>
        <span class="sr-value">{{ advancedSettings.volumeFlowMultiplier ?? '—' }}<span class="sr-chev">›</span></span>
      </button>
      <button class="setting-row as-btn" @click="editHeaterFlow('heaterPh1Flow', t('machineSettings.heaterPh1'))">
        <span class="sr-name">{{ t('machineSettings.heaterPh1') }}</span>
        <span class="sr-value">{{ advancedSettings.heaterPh1Flow ?? '—' }}<span class="sr-chev">›</span></span>
      </button>
      <button class="setting-row as-btn" @click="editHeaterFlow('heaterPh2Flow', t('machineSettings.heaterPh2'))">
        <span class="sr-name">{{ t('machineSettings.heaterPh2') }}</span>
        <span class="sr-value">{{ advancedSettings.heaterPh2Flow ?? '—' }}<span class="sr-chev">›</span></span>
      </button>

      <span class="setting-group-label">{{ t('machineSettings.info') }}</span>
      <div class="setting-row"><span class="sr-name">{{ t('machineSettings.model') }}</span><span class="sr-value muted">{{ machineInfo?.name ?? '—' }}</span></div>
      <div class="setting-row"><span class="sr-name">{{ t('machineSettings.firmware') }}</span><span class="sr-value muted">{{ machineInfo?.version ?? '—' }}</span></div>
      <div class="setting-row"><span class="sr-name">{{ t('machineSettings.serial') }}</span><span class="sr-value muted">{{ machineInfo?.serial ?? '—' }}</span></div>
    </div>
  </div>
</template>
