<script setup>
import { toastState } from '../composables/useToast.js';
</script>

<template>
  <div v-if="toastState.visible" class="toast">{{ toastState.message }}</div>
</template>
