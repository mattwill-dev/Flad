<script setup>
/**
 * The lock face — shown by App.vue whenever `locked` is true (see
 * useScreensaver.js). Tapping unlocks; whether that also wakes the DE1 depends
 * on the "wake DE1 on unlock" skin setting.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { unlock } from '../composables/useScreensaver.js';
import { formatClock } from '../utils/clock.js';

const { t } = useI18n();

const now = ref(new Date());
let timer = null;
onMounted(() => { timer = setInterval(() => { now.value = new Date(); }, 15_000); });
onUnmounted(() => clearInterval(timer));

const clockLabel = computed(() => formatClock(now.value));
const dateLabel = computed(() =>
  now.value.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
);

</script>

<template>
  <div class="screensaver" @click="unlock">
    <div class="ss-clock">{{ clockLabel }}</div>
    <div class="ss-date">{{ dateLabel }}</div>
    <div class="ss-hint">{{ t('status.sleepHint') }}</div>
  </div>
</template>
