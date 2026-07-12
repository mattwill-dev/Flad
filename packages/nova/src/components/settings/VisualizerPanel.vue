<script setup>
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { openTextField, openWheel } from '../../composables/useModals.js';
import { range } from '../../utils/range.js';
import {
  visualizerSettings, loadVisualizerSettings, saveVisualizerSetting,
  visualizerPlugin, setPluginEnabled,
} from '../../composables/useSettings.js';

defineEmits(['close']);
const { t } = useI18n();

onMounted(loadVisualizerSettings);

function toggleEnabled() {
  const plugin = visualizerPlugin();
  if (plugin) setPluginEnabled(plugin.id, !plugin.loaded);
}
async function editUser() {
  const v = await openTextField({ title: t('systemSettings.vizUser'), value: visualizerSettings.username });
  if (v != null) saveVisualizerSetting('username', v);
}
async function editPass() {
  const v = await openTextField({ title: t('systemSettings.vizPass'), value: visualizerSettings.password });
  if (v != null) saveVisualizerSetting('password', v);
}
async function editMinShot() {
  const v = await openWheel({ title: t('systemSettings.vizMinShot'), unit: 's', values: range(0, 120, 5, 0), current: visualizerSettings.minShotDuration });
  if (v != null) saveVisualizerSetting('minShotDuration', Number(v));
}
</script>

<template>
  <div class="overlay-full">
    <div class="ov-top">
      <button class="ov-back" @click="$emit('close')">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>{{ t('systemSettings.integrations') }}
      </button>
      <span class="ov-title">{{ t('systemSettings.visualizer') }}</span>
    </div>

    <div class="settings-scroll">
      <div class="setting-row">
        <span class="sr-name">{{ t('systemSettings.vizEnabled') }}</span>
        <button class="switch" :class="{ on: visualizerPlugin()?.loaded }" role="switch" :aria-checked="!!visualizerPlugin()?.loaded" @click="toggleEnabled"></button>
      </div>
      <button class="setting-row as-btn" @click="editUser">
        <span class="sr-name">{{ t('systemSettings.vizUser') }}</span>
        <span class="sr-value" :class="{ muted: !visualizerSettings.username }">{{ visualizerSettings.username || t('systemSettings.notSet') }}<span class="sr-chev">›</span></span>
      </button>
      <button class="setting-row as-btn" @click="editPass">
        <span class="sr-name">{{ t('systemSettings.vizPass') }}</span>
        <span class="sr-value" :class="{ muted: !visualizerSettings.password }">{{ visualizerSettings.password ? '••••••' : t('systemSettings.notSet') }}<span class="sr-chev">›</span></span>
      </button>
      <div class="setting-row">
        <span class="sr-name">{{ t('systemSettings.vizAutoUpload') }}</span>
        <button class="switch" :class="{ on: visualizerSettings.autoUpload }" role="switch" :aria-checked="visualizerSettings.autoUpload" @click="saveVisualizerSetting('autoUpload', !visualizerSettings.autoUpload)"></button>
      </div>
      <button class="setting-row as-btn" @click="editMinShot">
        <span class="sr-name">{{ t('systemSettings.vizMinShot') }}</span>
        <span class="sr-value">{{ visualizerSettings.minShotDuration }} s<span class="sr-chev">›</span></span>
      </button>
      <div class="setting-row">
        <span class="sr-name">{{ t('systemSettings.vizExtended') }}</span>
        <button class="switch" :class="{ on: visualizerSettings.extendedMetadata }" role="switch" :aria-checked="visualizerSettings.extendedMetadata" @click="saveVisualizerSetting('extendedMetadata', !visualizerSettings.extendedMetadata)"></button>
      </div>
    </div>
  </div>
</template>
