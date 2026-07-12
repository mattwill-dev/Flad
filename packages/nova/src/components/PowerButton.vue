<script setup>
/**
 * Puts the machine to sleep. This is a REST call only — machine.state is not
 * set locally here. The gateway's own machine-state stream (bridged through
 * NSXCore's "machineState" event, see useCore.js) is the single source of
 * truth; sleeping is a one-way trigger, not an optimistic local flip.
 */
const { NSXApi } = window;

async function sleep() {
  try {
    await NSXApi.setMachineState('sleeping');
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
