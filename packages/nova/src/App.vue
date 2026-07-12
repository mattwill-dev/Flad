<script setup>
/**
 * Shell. For now it only proves the core is wired: the register rails, status
 * island, power button and screensaver land here in Phase 2.
 */
import { machine, boot } from './composables/useCore.js';
</script>

<template>
  <div class="stage">
    <main class="pages">
      <RouterView />
    </main>

    <!-- Temporary boot readout (Phase 0 verification). Replaced by the status
         island in Phase 2. -->
    <div class="boot-probe">
      <span :class="['dot', machine.connected ? 'ok' : 'alert']"></span>
      <span>{{ boot.done ? 'core booted' : 'booting…' }}</span>
      <span>· state: {{ machine.state }}</span>
      <span>· machine: {{ machine.connected ? 'connected' : 'offline' }}</span>
      <span>· scale: {{ machine.scaleConnected ? `${machine.weight.toFixed(1)} g` : 'offline' }}</span>
      <span v-if="machine.water.currentLevel != null">· water: {{ machine.water.currentLevel }}</span>
    </div>
  </div>
</template>

<style scoped>
.boot-probe {
  position: absolute;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  border-radius: 999px;
  background: #07090c;
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); }
.dot.ok { background: var(--ok); }
.dot.alert { background: var(--alert); }
</style>
