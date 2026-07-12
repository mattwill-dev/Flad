<script setup>
/**
 * Inline 3-step selector — no modal, tap a level or scroll through them. Used
 * for Steam's intensity and Cleaning's Rinse duration, both of which map to a
 * real 3-key preset object (schwach/normal/stark, kurz/normal/lang) rather
 * than an arbitrary range, so a wheel picker would be the wrong tool here.
 */
const props = defineProps({
  levels: { type: Array, required: true }, // [{ key, label }]
  activeKey: { type: String, default: null },
});
const emit = defineEmits(['select']);

function step(dir) {
  const idx = props.levels.findIndex((l) => l.key === props.activeKey);
  const next = Math.max(0, Math.min(props.levels.length - 1, (idx < 0 ? 0 : idx) + dir));
  emit('select', props.levels[next].key);
}
function onWheel(e) {
  e.preventDefault();
  step(e.deltaY > 0 ? 1 : -1);
}
</script>

<template>
  <div class="dial big intensity" @wheel="onWheel">
    <button
      v-for="level in levels"
      :key="level.key"
      class="lvl"
      :class="{ cur: level.key === activeKey }"
      @click="emit('select', level.key)"
    >
      {{ level.label }}
    </button>
  </div>
</template>
