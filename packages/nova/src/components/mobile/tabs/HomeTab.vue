<script setup>
/**
 * Phone "Home" — a glance at machine state plus a wake/sleep toggle (the one
 * piece of live control the phone companion keeps — see SettingsView.vue's
 * machine tile for the same on/off pattern), and the most recent shot.
 */
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { machine } from '../../../composables/useCore.js';
import { fullHistoryShots, ensureDiaryLoaded } from '../../../composables/useDiary.js';
import { skinSettings } from '../../../composables/useSettings.js';
import { formatWaterLevel } from '../../../utils/water.js';
import { showToast } from '../../../composables/useToast.js';
import { openHistoryAt } from '../../../composables/useLiveShot.js';

const { t } = useI18n();
const { NSXApi } = window;

onMounted(ensureDiaryLoaded);

const statusLabel = computed(() => {
  if (!machine.connected) return t('status.noMachine');
  const key = machine.state === 'idle' ? 'ready' : machine.state;
  return t(`status.${key}`);
});
const waterLabel = computed(() => formatWaterLevel(machine.water.currentLevel, skinSettings.waterUnit));

const machineOn = computed(() => machine.state !== 'sleeping');
const machineBusy = ref(false);
async function toggleMachine() {
  if (machineBusy.value) return;
  machineBusy.value = true;
  try {
    await NSXApi.setMachineState(machineOn.value ? 'sleeping' : 'idle');
  } catch (err) {
    showToast(t('toast.controlFailed') + ': ' + err.message);
  } finally {
    machineBusy.value = false;
  }
}

const lastShot = computed(() => fullHistoryShots.value[0] || null);
const lastShotFacts = computed(() => (lastShot.value ? window.NSXCore.mapShotToWorkflow(lastShot.value) : null));
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
}
</script>

<template>
  <section class="phone-page">
    <h1 class="phone-title">{{ t('phone.home') }}</h1>

    <div class="phone-card">
      <div class="phone-status-row">
        <span class="phone-status-dot" :class="{ on: machine.connected && machine.state !== 'sleeping' }"></span>
        <span class="phone-status-label">{{ statusLabel }}</span>
        <button
          class="switch phone-machine-switch"
          :class="{ on: machineOn }"
          role="switch"
          :aria-checked="machineOn"
          :disabled="machineBusy || !machine.connected"
          @click="toggleMachine"
        ></button>
      </div>
      <div v-if="machine.water.currentLevel != null" class="phone-status-sub">{{ t('machineSettings.waterTank') }}: {{ waterLabel }}</div>
    </div>

    <div class="phone-card" v-if="lastShotFacts">
      <div class="phone-card-title">{{ t('diary.shots') }}</div>
      <button class="phone-list-item" @click="openHistoryAt([lastShot], lastShot)">
        <span class="fact"><b>{{ fmtDate(lastShot.timestamp) }}</b></span>
        <span class="fact">{{ lastShotFacts.coffeeRoaster }} — {{ lastShotFacts.coffeeName }}</span>
        <span class="fact">{{ lastShotFacts.profileTitle }}</span>
      </button>
    </div>
  </section>
</template>
