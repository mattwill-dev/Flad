<script setup>
/**
 * Puts the machine to sleep AND locks the screen — see useScreensaver.js for why
 * these are two separate things everywhere else. The REST call is a one-way
 * trigger, not an optimistic local flip; machine.state itself is set only by the
 * gateway's own machineState stream (see useCore.js).
 */
import { lock } from '../composables/useScreensaver.js';

const { NSXApi } = window;

async function sleep() {
  try {
    await NSXApi.setMachineState('sleeping');
    lock();
  } catch (err) {
    console.error('[Nova] failed to put the machine to sleep', err);
  }
}
</script>

<template>
  <button class="power-btn" aria-label="Power" @click="sleep">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v9" /><path d="M6.8 6.8a8 8 0 1 0 10.4 0" />
    </svg>
  </button>
</template>
