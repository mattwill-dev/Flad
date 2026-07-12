<script setup>
/**
 * The sleep/off face — shown by App.vue whenever machine.state === 'sleeping'.
 * Tapping wakes the machine (REST only; see PowerButton.vue for why this isn't
 * an optimistic local state flip).
 */
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { NSXApi } = window;

const now = ref(new Date());
let timer = null;
onMounted(() => { timer = setInterval(() => { now.value = new Date(); }, 15_000); });
onUnmounted(() => clearInterval(timer));

const clockLabel = computed(() => {
  const h = String(now.value.getHours()).padStart(2, '0');
  const m = String(now.value.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
});
const dateLabel = computed(() =>
  now.value.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
);

async function wake() {
  try {
    await NSXApi.setMachineState('idle');
  } catch (err) {
    console.error('[Nova] failed to wake the machine', err);
  }
}
</script>

<template>
  <div class="screensaver" @click="wake">
    <div class="ss-clock">{{ clockLabel }}</div>
    <div class="ss-date">{{ dateLabel }}</div>
    <div class="ss-hint">{{ t('status.sleepHint') }}</div>
  </div>
</template>
