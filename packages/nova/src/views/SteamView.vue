<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { steam } from '../composables/useMachineFunctions.js';
import { openNumberPad } from '../composables/useModals.js';
import { useDragDial } from '../composables/useDragDial.js';
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

// NSXCore.setSteamDuration() both updates AND pushes (debounced ~1s
// internally) in one call — a local override drives the live number during
// the drag so the real setter only fires once, on release. See the identical
// note in HotWaterView.vue.
const dragDurationOverride = ref(null);
const durationDrag = useDragDial({
  get: () => dragDurationOverride.value ?? steam.duration,
  set: (v) => { dragDurationOverride.value = v; },
  onCommit: (v) => { NSXCore.setSteamDuration(v); dragDurationOverride.value = null; },
  min: 1, max: 180, step: 1, pxPerUnit: 3,
});
const onDurationClick = durationDrag.guardClick(editDuration);

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
        <button
          class="timer-pod"
          :class="{ off: !steam.enabled, dragging: durationDrag.dragging.value }"
          @click="onDurationClick"
          @pointerdown="durationDrag.onPointerDown"
          @pointermove="durationDrag.onPointerMove"
          @pointerup="durationDrag.onPointerUp"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>
          <span class="num">{{ dragDurationOverride ?? steam.duration }}</span><span class="unit">sec</span>
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
