<script setup>
/**
 * Guided backflush/descale: prep instructions -> on-screen Start (the one
 * other on-screen-start exception besides Skip, per the design log — this is
 * supervised maintenance, not a drink) -> watches the real machine state for
 * the maintenance state, then auto-closes once it returns to idle.
 *
 * There is no real progress feed for cleaning/descaling (unlike heating's
 * time-to-ready) — the bar is honestly indeterminate, not a fabricated percent.
 */
import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { machine } from '../composables/useCore.js';
import { showToast } from '../composables/useToast.js';

const props = defineProps({ mode: { type: String, required: true } }); // 'backflush' | 'descale'
const emit = defineEmits(['close']);
const { t } = useI18n();
const { NSXApi, NSXCore } = window;

const targetState = computed(() => (props.mode === 'backflush' ? 'cleaning' : 'descaling'));
const running = computed(() => machine.state === targetState.value);

const ICONS = {
  backflush: '<path d="M4 12a8 8 0 0 1 14-5m2-3v5h-5"/><path d="M20 12a8 8 0 0 1-14 5m-2 3v-5h5"/>',
  descale: '<path d="M12 3.5s5.5 6.3 5.5 10a5.5 5.5 0 0 1-11 0c0-3.7 5.5-10 5.5-10z"/><path d="M8 13l8-.01M10 16l4-.01"/>',
};

// Auto-close shortly after the machine reports it's done (idle again) —
// running -> not-running is the real completion signal, not a timer.
let wasRunning = false;
watch(
  () => running.value,
  (isRunning) => {
    if (wasRunning && !isRunning) setTimeout(() => emit('close'), 900);
    wasRunning = isRunning;
  }
);

async function start() {
  // setState is disallowed only while an espresso shot is hardware-running
  // (ALLOWED_OPERATIONS in machine.js) — the template's `!running` guard alone
  // doesn't cover that case.
  if (!NSXCore.canExecuteOperation('setState')) {
    showToast(t('cleaning.blockedByShot'));
    return;
  }
  await NSXApi.setMachineState(targetState.value);
}
</script>

<template>
  <div class="overlay-full">
    <div class="ov-top">
      <button v-if="!running" class="ov-back" @click="emit('close')">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>{{ t('common.cancel') }}
      </button>
      <span class="ov-title">{{ t(`cleaning.${mode}`) }}</span>
    </div>

    <div class="assist-body">
      <span class="bigicon"><svg viewBox="0 0 24 24" aria-hidden="true" v-html="ICONS[mode]"></svg></span>
      <div v-if="!running">
        <div class="assist-step">{{ t('cleaning.step1') }}</div>
        <p class="assist-text">{{ t(`cleaning.${mode}Prep`) }}</p>
      </div>
      <div v-else>
        <div class="assist-step">{{ t('cleaning.step2') }}</div>
        <p class="assist-text">{{ t('cleaning.running') }}</p>
        <div class="progress" style="margin-top: 18px"><div class="bar indeterminate"></div></div>
      </div>
    </div>

    <div v-if="!running" class="ov-bottom"><button class="rate-btn" :disabled="machine.state === 'espresso'" @click="start">{{ t('common.start') }}</button></div>
  </div>
</template>

<style scoped>
.bar.indeterminate {
  width: 40%;
  animation: indeterminate 1.2s ease-in-out infinite;
}
@keyframes indeterminate {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(250%); }
}
@media (prefers-reduced-motion: reduce) {
  .bar.indeterminate { animation: none; width: 100%; opacity: 0.5; }
}
</style>
