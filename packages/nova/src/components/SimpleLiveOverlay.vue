<script setup>
/**
 * Steam/hot-water's live view: a simple elapsed timer + stop, not the full
 * pressure/flow/temp graph — that's reserved for espresso (see the design log:
 * "Steam/Hotwater-Live: schlichter Fortschritt/Timer"). Global overlay, same
 * reasoning as LiveShotOverlay: a hardware-triggered dispense can start from
 * any tab.
 */
import { computed, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { machine } from '../composables/useCore.js';

const { t } = useI18n();
const { NSXCore, NSXApi } = window;

const LIVE_STATES = { steam: 'tab.steam', hotWater: 'tab.hotwater' };
const visible = computed(() => machine.state in LIVE_STATES);
const title = computed(() => (machine.state in LIVE_STATES ? t(LIVE_STATES[machine.state]) : ''));

let startMs = 0;
let timer = null;
const elapsedLabel = ref('0:00');

function tick() {
  const s = Math.floor((Date.now() - startMs) / 1000);
  elapsedLabel.value = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

watch(
  () => machine.state,
  (state, prev) => {
    const entering = state in LIVE_STATES && !(prev in LIVE_STATES);
    const leaving = !(state in LIVE_STATES) && prev in LIVE_STATES;
    if (entering) {
      startMs = Date.now();
      tick();
      timer = setInterval(tick, 1000);
    } else if (leaving && timer) {
      clearInterval(timer);
      timer = null;
    }
  }
);
onUnmounted(() => { if (timer) clearInterval(timer); });

async function stop() {
  if (!NSXCore.canExecuteOperation('setState', machine.state)) return;
  await NSXApi.setMachineState('idle');
}
</script>

<template>
  <div v-if="visible" class="overlay-full">
    <div class="assist-body">
      <span class="bigicon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" />
        </svg>
      </span>
      <div class="live-title">{{ title }}</div>
      <div class="assist-text" style="font-size: 2.5rem; font-variant-numeric: tabular-nums">{{ elapsedLabel }}</div>
    </div>
    <div class="ov-bottom"><button class="rate-btn" @click="stop">{{ t('common.stop') }}</button></div>
  </div>
</template>
