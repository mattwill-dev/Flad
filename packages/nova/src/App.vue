<script setup>
import { machine } from './composables/useCore.js';
import { phase as liveShotPhase } from './composables/useLiveShot.js';
import RegisterRail from './components/RegisterRail.vue';
import StatusIsland from './components/StatusIsland.vue';
import PowerButton from './components/PowerButton.vue';
import Screensaver from './components/Screensaver.vue';
import WheelPicker from './components/WheelPicker.vue';
import TextFieldModal from './components/TextFieldModal.vue';
import ChooserModal from './components/ChooserModal.vue';
import Toast from './components/Toast.vue';
import LiveShotOverlay from './components/LiveShotOverlay.vue';
import SimpleLiveOverlay from './components/SimpleLiveOverlay.vue';
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

    <!-- Global: a hardware-triggered shot/steam/hot-water can start while the
         user is on any tab, not just its own page — see the design log. -->
    <LiveShotOverlay v-if="liveShotPhase !== 'hidden'" />
    <SimpleLiveOverlay />

    <!-- The screensaver IS the sleep/off state, not a separate idle timer here —
         it shows exactly when the gateway reports the machine as sleeping. -->
    <Screensaver v-if="machine.state === 'sleeping'" />

    <!-- Single shared instances; any view opens these via useModals.js. -->
    <WheelPicker />
    <TextFieldModal />
    <ChooserModal />
    <Toast />
  </div>
</template>
