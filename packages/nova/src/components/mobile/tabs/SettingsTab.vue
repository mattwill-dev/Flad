<script setup>
/**
 * Phone "Settings" — same tile set and same panel components as
 * SettingsView.vue (which are already `position:fixed inset:0` full-screen
 * overlays, see app.css), just triggered from a single-column tile list
 * instead of the tablet's 3x2 grid + brightness slider.
 */
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import GrinderPanel from '../../settings/GrinderPanel.vue';
import MachinePanel from '../../settings/MachinePanel.vue';
import SkinPanel from '../../settings/SkinPanel.vue';
import AppPanel from '../../settings/AppPanel.vue';
import SchedulePanel from '../../settings/SchedulePanel.vue';

const { t } = useI18n();

const TILES = [
  { id: 'machine', label: 'settingsPage.machine', icon: 'M8 7h8M9 11h6a3 3 0 0 1-3 3 3 3 0 0 1-3-3z' },
  { id: 'app', label: 'settingsPage.app', icon: 'M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.3 1a7.7 7.7 0 0 0-2.6-1.5L14 2.6h-4l-.5 2.5a7.7 7.7 0 0 0-2.6 1.5l-2.3-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.3-1a7.7 7.7 0 0 0 2.6 1.5l.5 2.5h4l.5-2.5a7.7 7.7 0 0 0 2.6-1.5l2.3 1 2-3.4-2-1.5z' },
  { id: 'skin', label: 'settingsPage.skin', icon: 'M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2' },
  { id: 'grinders', label: 'settingsPage.grinders', icon: 'M9 3h6l-1 5h-4L9 3z M8 8h8v6H8z M10 14v4h4v-4' },
  { id: 'schedule', label: 'scheduleSettings.title', icon: 'M12 6v6l4 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z' },
];

const active = ref(null);
</script>

<template>
  <section class="phone-page">
    <h1 class="phone-title">{{ t('tab.settings') }}</h1>

    <div class="phone-list">
      <button v-for="tile in TILES" :key="tile.id" class="phone-list-row" @click="active = tile.id">
        <span class="phone-tile-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path :d="tile.icon" /></svg></span>
        <span class="rmeta">{{ t(tile.label) }}</span>
        <span class="chev">›</span>
      </button>
    </div>

    <GrinderPanel v-if="active === 'grinders'" @close="active = null" />
    <MachinePanel v-if="active === 'machine'" @close="active = null" />
    <SkinPanel v-if="active === 'skin'" @close="active = null" />
    <AppPanel v-if="active === 'app'" @close="active = null" />
    <SchedulePanel v-if="active === 'schedule'" @close="active = null" />
  </section>
</template>
