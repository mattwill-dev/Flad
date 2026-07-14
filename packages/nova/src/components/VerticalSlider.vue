<script setup>
/**
 * A vertical fill slider driven by pointer events, not <input type="range">:
 * the vertical range variants (`appearance: slider-vertical`, `writing-mode:
 * vertical-lr`) are respectively deprecated and Chromium-120+ only — not a bet
 * worth making on the DE1 tablet's WebView.
 */
import { computed, ref } from 'vue';

const props = defineProps({
  modelValue: { type: Number, required: true },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
});
const emit = defineEmits(['update:modelValue']);

const track = ref(null);
const dragging = ref(false);

const pct = computed(() => {
  const span = props.max - props.min;
  return span <= 0 ? 0 : ((props.modelValue - props.min) / span) * 100;
});

function valueFromEvent(evt) {
  const rect = track.value.getBoundingClientRect();
  const ratio = 1 - Math.min(1, Math.max(0, (evt.clientY - rect.top) / rect.height));
  return Math.round(props.min + ratio * (props.max - props.min));
}

function onPointerDown(evt) {
  dragging.value = true;
  track.value.setPointerCapture(evt.pointerId);
  emit('update:modelValue', valueFromEvent(evt));
}
function onPointerMove(evt) {
  if (!dragging.value) return;
  emit('update:modelValue', valueFromEvent(evt));
}
function onPointerUp(evt) {
  dragging.value = false;
  track.value.releasePointerCapture(evt.pointerId);
}
</script>

<template>
  <div
    ref="track"
    class="vslider"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
  >
    <div class="vslider-fill" :style="{ height: pct + '%' }"></div>
    <span class="vslider-label">{{ Math.round(modelValue) }}%</span>
  </div>
</template>
