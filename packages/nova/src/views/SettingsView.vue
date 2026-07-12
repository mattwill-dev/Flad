<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import ProfilePicker from '../components/ProfilePicker.vue';
import GrinderPanel from '../components/settings/GrinderPanel.vue';
import MachinePanel from '../components/settings/MachinePanel.vue';
import DisplayPanel from '../components/settings/DisplayPanel.vue';
import SchedulePanel from '../components/settings/SchedulePanel.vue';
import SystemPanel from '../components/settings/SystemPanel.vue';

const { t } = useI18n();

const TILES = [
  { id: 'profiles', label: 'settingsPage.profiles', icon: 'M4 19h16 M4 16c3 0 3-9 6-9s3 6 5 6 3-2 5-2' },
  { id: 'grinders', label: 'settingsPage.grinders', icon: 'M9 3h6l-1 5h-4L9 3z M8 8h8v6H8z M10 14v4h4v-4' },
  { id: 'machine', label: 'settingsPage.machine', icon: 'M8 7h8M9 11h6a3 3 0 0 1-3 3 3 3 0 0 1-3-3z' },
  { id: 'skin', label: 'settingsPage.skin', icon: 'M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2' },
  { id: 'schedule', label: 'settingsPage.schedule', icon: 'M12 9v4l2.5 2M9 2h6' },
  { id: 'system', label: 'settingsPage.system', icon: 'M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.3 1a7.7 7.7 0 0 0-2.6-1.5L14 2.6h-4l-.5 2.5a7.7 7.7 0 0 0-2.6 1.5l-2.3-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.3-1a7.7 7.7 0 0 0 2.6 1.5l.5 2.5h4l.5-2.5a7.7 7.7 0 0 0 2.6-1.5l2.3 1 2-3.4-2-1.5z' },
];

const active = ref(null);
</script>

<template>
  <section class="page">
    <h1 class="page-title">{{ t('tab.settings') }}</h1>
    <div class="tile-grid">
      <button v-for="tile in TILES" :key="tile.id" class="tile" @click="active = tile.id">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle v-if="tile.id === 'settings'" cx="12" cy="12" r="3" /><path :d="tile.icon" /></svg>
        <span class="tl">{{ t(tile.label) }}</span>
      </button>
    </div>

    <ProfilePicker v-if="active === 'profiles'" mode="manage" @back="active = null" />
    <GrinderPanel v-if="active === 'grinders'" @close="active = null" />
    <MachinePanel v-if="active === 'machine'" @close="active = null" />
    <DisplayPanel v-if="active === 'skin'" @close="active = null" />
    <SchedulePanel v-if="active === 'schedule'" @close="active = null" />
    <SystemPanel v-if="active === 'system'" @close="active = null" />
  </section>
</template>
