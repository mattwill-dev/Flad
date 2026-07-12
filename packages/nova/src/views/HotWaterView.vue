<script setup>
import { useI18n } from 'vue-i18n';
import { hotwater } from '../composables/useMachineFunctions.js';
import { openNumberPad } from '../composables/useModals.js';

const { t } = useI18n();
const { NSXCore } = window;

// klein/mittel/gross (Little/Medium/Large) mapped to positions 1/2/3 — the
// real hotwater presets, not invented slots.
const PRESET_KEYS = ['klein', 'mittel', 'gross'];

async function editTemp() {
  const v = await openNumberPad({ title: t('hotwater.temperature'), unit: '°C', value: String(hotwater.temp) });
  if (v == null) return;
  NSXCore.setHotwaterTemp(parseFloat(v));
}
async function editVolume() {
  const v = await openNumberPad({ title: t('hotwater.volume'), unit: 'ml', value: String(hotwater.volume) });
  if (v == null) return;
  NSXCore.setHotwaterVolume(parseFloat(v));
}

// Short tap loads a preset; holding (~600ms) saves the current temp+volume into it.
const holdTimers = {};
function onPresetDown(key) {
  holdTimers[key] = {
    held: false,
    timer: setTimeout(() => {
      holdTimers[key].held = true;
      const next = { ...hotwater.presets, [key]: { ...hotwater.presets[key], temp: hotwater.temp, volume: hotwater.volume } };
      NSXCore.setHotwaterPresets(next);
      NSXCore.selectHotwaterPreset(key);
    }, 600),
  };
}
function onPresetUp(key) {
  const h = holdTimers[key];
  if (!h) return;
  clearTimeout(h.timer);
  if (!h.held) NSXCore.selectHotwaterPreset(key);
  delete holdTimers[key];
}
function onPresetCancel(key) {
  if (holdTimers[key]) { clearTimeout(holdTimers[key].timer); delete holdTimers[key]; }
}
</script>

<template>
  <section class="page">
    <div class="page-title">{{ t('tab.hotwater') }}</div>
    <div class="dials">
      <div class="dial-group">
        <span class="dial-label">{{ t('hotwater.temperature') }}</span>
        <button class="dial big" @click="editTemp">
          <span class="num">{{ hotwater.temp }}</span><span class="unit">°C</span>
        </button>
      </div>

      <div class="dial-group">
        <span class="dial-label">{{ t('hotwater.presets') }}</span>
        <div class="preset-stack">
          <button
            v-for="(key, i) in PRESET_KEYS"
            :key="key"
            class="preset"
            :class="{ selected: hotwater.active === key }"
            @pointerdown="onPresetDown(key)"
            @pointerup="onPresetUp(key)"
            @pointerleave="onPresetCancel(key)"
          >
            {{ i + 1 }}
          </button>
        </div>
        <span class="preset-hint">{{ t('hotwater.holdToSave') }}</span>
      </div>

      <div class="dial-group">
        <span class="dial-label">{{ t('hotwater.volume') }}</span>
        <button class="dial big" @click="editVolume">
          <span class="num">{{ hotwater.volume }}</span><span class="unit">ml</span>
        </button>
      </div>
    </div>
  </section>
</template>
