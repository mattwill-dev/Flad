<script setup>
/**
 * The DE1 at a glance: state + on/off. Modelled on NSX's machine widget
 * (status-card-connection), but drawn as an inline SVG glyph rather than
 * porting NSX's raster PNG — every other Nova icon is line-art, and this is
 * the first settings tile a user sees.
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { machine } from '../../composables/useCore.js';
import { showToast } from '../../composables/useToast.js';

const { t } = useI18n();
const { NSXApi } = window;

const busy = ref(false);
const isOn = computed(() => machine.state !== 'sleeping');

const statusLabel = computed(() => {
  if (!machine.connected) return t('status.noMachine');
  return t(`status.${machine.state === 'idle' ? 'ready' : machine.state}`);
});

async function toggle() {
  if (busy.value) return;
  const target = isOn.value ? 'sleeping' : 'idle';
  busy.value = true;
  try {
    await NSXApi.setMachineState(target);
  } catch (err) {
    showToast(t('toast.controlFailed') + ': ' + err.message);
  } finally {
    busy.value = false;
  }
}

async function reconnect() {
  try {
    await NSXApi.initiateDE1Connect();
  } catch (err) {
    console.error('[Nova] DE1 connect failed', err);
  }
}
</script>

<template>
  <div class="hero-card machine-widget">
    <button
      class="hero-glyph"
      :class="{ dim: !machine.connected }"
      :disabled="machine.connected"
      :aria-label="machine.connected ? undefined : t('machineSettings.machine')"
      @click="reconnect"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9z" />
        <path d="M7 10V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4" />
        <path d="M9 14h6M9 17h3" />
      </svg>
    </button>
    <div class="hero-main">
      <span class="hero-title">{{ t('machineSettings.machine') }}</span>
      <span class="hero-status" :class="{ ready: isOn && machine.connected }">{{ statusLabel }}</span>
    </div>
    <button class="switch" :class="{ on: isOn }" role="switch" :aria-checked="isOn" :disabled="busy" @click="toggle"></button>
  </div>
</template>
