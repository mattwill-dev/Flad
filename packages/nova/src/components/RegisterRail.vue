<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { TABS } from '../router/index.js';

const props = defineProps({
  side: { type: String, required: true }, // 'left' | 'right'
});

const route = useRoute();
const tabs = computed(() => TABS.filter((t) => t.side === props.side));
</script>

<template>
  <nav :class="['rail', `rail-${side}`]" :aria-label="`Main navigation ${side}`">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.name"
      :to="tab.path"
      custom
      v-slot="{ navigate, isActive }"
    >
      <button
        class="tab"
        :class="{ active: isActive }"
        :style="{ '--accent': tab.accent }"
        :aria-label="$t(`tab.${tab.name}`)"
        :title="$t(`tab.${tab.name}`)"
        @click="navigate"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" v-html="tab.icon"></svg>
      </button>
    </RouterLink>
  </nav>
</template>
