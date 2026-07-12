<script setup>
/**
 * Same construction as NSX's workflow-scale-icon (packages/nsx/src/index.html):
 * an oval rect in currentColor + a darker base band clipped to the same oval.
 * Only shown while a scale is actually connected (see EspressoView.vue).
 */
import { computed } from 'vue';
import { machine } from '../composables/useCore.js';

const weightLabel = computed(() => machine.weight.toFixed(1));
</script>

<template>
  <div class="scale-pod">
    <svg viewBox="0 0 110 70" aria-hidden="true" fill="currentColor">
      <defs>
        <clipPath id="scale-oval-clip"><rect x="0" y="0" width="110" height="70" rx="35" /></clipPath>
      </defs>
      <rect x="0" y="0" width="110" height="70" rx="35" />
      <rect x="0" y="53" width="110" height="17" fill="rgba(0,0,0,0.35)" clip-path="url(#scale-oval-clip)" />
    </svg>
    <span class="w">{{ weightLabel }}<small>g</small></span>
  </div>
</template>
