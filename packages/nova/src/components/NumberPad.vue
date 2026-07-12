<script setup>
/**
 * A single shared instance (mounted once in App.vue), driven by useModals.js's
 * numberPadState — see openNumberPad() for how views open it. Replaces the
 * scroll-wheel for genuine free numeric entry (dose, grind, yield, temp,
 * calibration values, brightness, …), matching NSX's real numeric keyboard
 * (openFieldPicker with inputMode: 'numeric') rather than its drum-wheel
 * openNumberPicker, which Nova's WheelPicker already covers for discrete
 * value lists (e.g. schedule time-of-day).
 */
import { useI18n } from 'vue-i18n';
import { numberPadState, resolveNumberPad } from '../composables/useModals.js';

const { t } = useI18n();

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'];

function press(key) {
  if (key === 'back') { numberPadState.value = numberPadState.value.slice(0, -1); return; }
  if (key === '.' && numberPadState.value.includes('.')) return;
  if (key === '.' && numberPadState.value === '') { numberPadState.value = '0.'; return; }
  numberPadState.value += key;
}
function cancel() { resolveNumberPad(null); }
function confirm() { resolveNumberPad(numberPadState.value === '' ? null : numberPadState.value); }
</script>

<template>
  <div v-if="numberPadState.open" class="scrim" @click.self="cancel">
    <div class="modal">
      <span class="m-title">{{ numberPadState.title }}</span>
      <div class="npad-display">{{ numberPadState.value || '0' }}<span v-if="numberPadState.unit" class="u">{{ numberPadState.unit }}</span></div>
      <div class="npad-grid">
        <button v-for="k in KEYS" :key="k" class="npad-key" :class="{ back: k === 'back' }" @click="press(k)">
          <svg v-if="k === 'back'" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 4H8l-6 8 6 8h13a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1z" /><path d="M18 9l-6 6M12 9l6 6" /></svg>
          <template v-else>{{ k }}</template>
        </button>
      </div>
      <div class="modal-actions">
        <button class="cancel" @click="cancel">{{ t('common.cancel') }}</button>
        <button class="confirm" @click="confirm">{{ t('common.confirm') }}</button>
      </div>
    </div>
  </div>
</template>
