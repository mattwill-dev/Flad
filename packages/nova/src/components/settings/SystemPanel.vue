<script setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { openChooser } from '../../composables/useModals.js';
import { appSettings, loadAppSettings, saveAppSetting, loadPlugins, visualizerPlugin } from '../../composables/useSettings.js';
import VisualizerPanel from './VisualizerPanel.vue';

defineEmits(['close']);
const { t } = useI18n();

onMounted(() => {
  loadAppSettings();
  loadPlugins();
});

const gmOpts = [['disabled', t('systemSettings.gmDisabled')], ['tracking', t('systemSettings.gmTracking')], ['full', t('systemSettings.gmFull')]];
const logOpts = ['INFO', 'WARNING', 'SEVERE', 'FINE', 'FINER', 'FINEST', 'ALL', 'OFF'].map((v) => [v, v]);
const optLabel = (opts, v) => opts.find(([value]) => value === v)?.[1] ?? '';

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
      <span class="ov-title">{{ t('settingsPage.system') }}</span>
    </div>

    <div class="settings-scroll">
      <span class="setting-group-label">{{ t('systemSettings.advanced') }}</span>
      <button class="setting-row as-btn" @click="pickGatewayMode">
        <span class="sr-name">{{ t('systemSettings.gatewayMode') }}</span>
        <span class="sr-value">{{ optLabel(gmOpts, appSettings.gatewayMode) }}<span class="sr-chev">›</span></span>
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
