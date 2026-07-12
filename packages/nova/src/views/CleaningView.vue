<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { flush } from '../composables/useMachineFunctions.js';
import IntensitySelector from '../components/IntensitySelector.vue';
import CleaningAssistant from '../components/CleaningAssistant.vue';

const { t } = useI18n();
const { NSXCore } = window;

// kurz/normal/lang (Short/Normal/Long) are the real flush presets.
const LEVEL_KEYS = ['kurz', 'normal', 'lang'];
const levels = computed(() =>
  LEVEL_KEYS.map((key) => ({ key, label: (flush.presets[key]?.name || key).toUpperCase() }))
);

function selectRinse(key) { NSXCore.selectFlushPreset(key); }

const assistantMode = ref(null); // null | 'backflush' | 'descale'
</script>

<template>
  <section class="page">
    <div class="page-title">{{ t('tab.cleaning') }}</div>
    <div class="dials">
      <div class="dial-group">
        <span class="dial-label">{{ t('cleaning.rinse') }}</span>
        <IntensitySelector :levels="levels" :active-key="flush.active" @select="selectRinse" />
      </div>
    </div>
    <div class="prep-bottom" style="justify-content: center; gap: 24px">
      <button class="btn" @click="assistantMode = 'backflush'">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 12a8 8 0 0 1 14-5m2-3v5h-5" /><path d="M20 12a8 8 0 0 1-14 5m-2 3v-5h5" />
        </svg>
        {{ t('cleaning.backflush') }}
      </button>
      <button class="btn" @click="assistantMode = 'descale'">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3.5s5.5 6.3 5.5 10a5.5 5.5 0 0 1-11 0c0-3.7 5.5-10 5.5-10z" /><path d="M8 13l8-.01M10 16l4-.01" />
        </svg>
        {{ t('cleaning.descale') }}
      </button>
    </div>

    <CleaningAssistant v-if="assistantMode" :mode="assistantMode" @close="assistantMode = null" />
  </section>
</template>
