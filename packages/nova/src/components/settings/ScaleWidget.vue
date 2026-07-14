<script setup>
/**
 * NSX's scale-plate behaviour: disconnected -> tap connects; connected -> tap
 * tares. Shows live weight so this doubles as a "is the scale even on" check.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { machine } from '../../composables/useCore.js';
import { showToast } from '../../composables/useToast.js';

const { t } = useI18n();
const { NSXApi } = window;

const statusLabel = computed(() => machine.scaleConnected ? t('settingsPage.connected') : t('settingsPage.disconnected'));

async function onTap() {
  if (!machine.scaleConnected) {
    try {
      await NSXApi.initiateScaleConnect();
      showToast(t('toast.scaleConnecting'));
    } catch (err) {
      console.error('[Nova] scale connect failed', err);
    }
    return;
  }
  try {
    await NSXApi.tareScale();
    showToast(t('toast.scaleTared'));
  } catch (err) {
    showToast(t('toast.tareFailed') + ': ' + err.message);
  }
}
</script>

<template>
  <div class="hero-card scale-widget">
    <button class="hero-glyph" :class="{ dim: !machine.scaleConnected }" @click="onTap">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="9" width="16" height="11" rx="2" />
        <path d="M8 9a4 4 0 0 1 8 0" />
      </svg>
    </button>
    <div class="hero-main">
      <span class="hero-title">{{ t('machineSettings.scale') }}</span>
      <span class="hero-status" :class="{ ready: machine.scaleConnected }">
        {{ machine.scaleConnected ? `${machine.weight ?? 0} g` : statusLabel }}
      </span>
    </div>
  </div>
</template>
