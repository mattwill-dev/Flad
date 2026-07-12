<!-- Deliberately smaller than the design-prototype mock-up: theme, lockscreen and
     auto-sleep have no real backing feature in Nova yet (no theme variants, no
     lockscreen, no idle timer) — wiring settings for a feature that doesn't exist
     would just be dead UI. Brightness is the one control here with a real gateway
     effect (NSXApi.setDisplayBrightness — the DE1 touchscreen's own brightness). -->
<script setup>
import { useI18n } from 'vue-i18n';
import { openNumberPad } from '../../composables/useModals.js';
import { displayBrightness, setBrightness } from '../../composables/useSettings.js';

defineEmits(['close']);
const { t } = useI18n();

async function editBrightness() {
  const v = await openNumberPad({ title: t('skinSettings.brightness'), unit: '%', value: displayBrightness.value });
  if (v != null) setBrightness(Number(v));
}
</script>

<template>
  <div class="overlay-full">
    <div class="ov-top">
      <button class="ov-back" @click="$emit('close')">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>{{ t('settingsPage.back') }}
      </button>
      <span class="ov-title">{{ t('settingsPage.skin') }}</span>
    </div>

    <div class="settings-scroll">
      <span class="setting-group-label">{{ t('skinSettings.general') }}</span>
      <button class="setting-row as-btn" @click="editBrightness">
        <span class="sr-name">{{ t('skinSettings.brightness') }}</span>
        <span class="sr-value">{{ displayBrightness }}%<span class="sr-chev">›</span></span>
      </button>
    </div>
  </div>
</template>
