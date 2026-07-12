<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { steam } from '../composables/useMachineFunctions.js';
import { openNumberPad } from '../composables/useModals.js';
import IntensitySelector from '../components/IntensitySelector.vue';

const { t } = useI18n();
const { NSXCore } = window;

// schwach/normal/stark (Weak/Normal/Strong) are the real steam presets — the
// "3-step intensity" design maps directly onto them, nothing invented.
const LEVEL_KEYS = ['schwach', 'normal', 'stark'];
const levels = computed(() =>
  LEVEL_KEYS.map((key) => ({ key, label: (steam.presets[key]?.name || key).toUpperCase() }))
);

function selectIntensity(key) { NSXCore.selectSteamPreset(key); }

async function editDuration() {
  const v = await openNumberPad({ title: t('steam.timer'), unit: 'sec', value: String(steam.duration) });
  if (v == null) return;
  NSXCore.setSteamDuration(parseFloat(v));
}

function toggleEnabled() { NSXCore.setSteamEnabled(!steam.enabled); }
</script>

<template>
  <section class="page">
    <div class="page-title">{{ t('tab.steam') }}</div>
    <div class="dials">
      <div class="dial-group">
        <span class="dial-label">{{ t('steam.intensity') }}</span>
        <IntensitySelector :levels="levels" :active-key="steam.active" @select="selectIntensity" />
      </div>
      <div class="dial-group">
        <span class="dial-label">{{ t('steam.timer') }}</span>
        <button class="timer-pod" :class="{ off: !steam.enabled }" @click="editDuration">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>
          <span class="num">{{ steam.duration }}</span><span class="unit">sec</span>
        </button>
        <button
          class="switch"
          :class="{ on: steam.enabled }"
          role="switch"
          :aria-checked="steam.enabled"
          :aria-label="t('steam.enabled')"
          style="margin-top: 14px"
          @click="toggleEnabled"
        ></button>
      </div>
    </div>
  </section>
</template>
