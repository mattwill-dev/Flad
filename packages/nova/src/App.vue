<script setup>
import { machine } from './composables/useCore.js';
import RegisterRail from './components/RegisterRail.vue';
import StatusIsland from './components/StatusIsland.vue';
import PowerButton from './components/PowerButton.vue';
import Screensaver from './components/Screensaver.vue';
import WheelPicker from './components/WheelPicker.vue';
</script>

<template>
  <div class="stage">
    <RegisterRail side="left" />
    <StatusIsland />
    <PowerButton />
    <main class="pages">
      <RouterView />
    </main>
    <RegisterRail side="right" />

    <!-- The screensaver IS the sleep/off state, not a separate idle timer here —
         it shows exactly when the gateway reports the machine as sleeping. -->
    <Screensaver v-if="machine.state === 'sleeping'" />

    <!-- Single shared instance; any view opens it via useModals.js's openWheel(). -->
    <WheelPicker />
  </div>
</template>
