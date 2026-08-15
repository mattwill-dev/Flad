<script setup>
import { useI18n } from 'vue-i18n';

const props = defineProps({ modelValue: { type: String, required: true } });
const emit = defineEmits(['update:modelValue']);
const { t } = useI18n();

// Icon paths reused from router/index.js's TABS where the concept already
// exists (diary/settings); home/shots get their own.
const TABS = [
  { id: 'home', label: 'phone.home', icon: '<path d="M4 11.5L12 4l8 7.5"/><path d="M6 10v9h12v-9"/>' },
  { id: 'diary', label: 'tab.diary', icon: '<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15.5H7.5A2.5 2.5 0 0 0 5 21V5.5z"/><path d="M5 18.5A2.5 2.5 0 0 1 7.5 16H19"/><path d="M9.5 7.5h5.5M9.5 10.5h4"/>' },
  { id: 'shots', label: 'phone.shots', icon: '<path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="9"/>' },
  { id: 'settings', label: 'tab.settings', icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.3 1a7.7 7.7 0 0 0-2.6-1.5L14 2.6h-4l-.5 2.5a7.7 7.7 0 0 0-2.6 1.5l-2.3-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.3-1a7.7 7.7 0 0 0 2.6 1.5l.5 2.5h4l.5-2.5a7.7 7.7 0 0 0 2.6-1.5l2.3 1 2-3.4-2-1.5z"/>' },
];
</script>

<template>
  <nav class="phone-tabs" aria-label="Nova mobile navigation">
    <button
      v-for="tab in TABS"
      :key="tab.id"
      class="phone-tab"
      :class="{ active: modelValue === tab.id }"
      :aria-pressed="modelValue === tab.id"
      :aria-label="t(tab.label)"
      @click="emit('update:modelValue', tab.id)"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" v-html="tab.icon"></svg>
      <span>{{ t(tab.label) }}</span>
    </button>
  </nav>
</template>
