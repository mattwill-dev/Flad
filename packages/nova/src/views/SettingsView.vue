<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import ProfilePicker from '../components/ProfilePicker.vue';
import GrinderPanel from '../components/settings/GrinderPanel.vue';
import MachinePanel from '../components/settings/MachinePanel.vue';
import SkinPanel from '../components/settings/SkinPanel.vue';
import AppPanel from '../components/settings/AppPanel.vue';
import SchedulePanel from '../components/settings/SchedulePanel.vue';
import MachineWidget from '../components/settings/MachineWidget.vue';
import ScaleWidget from '../components/settings/ScaleWidget.vue';
import ScheduleWidget from '../components/settings/ScheduleWidget.vue';
import VerticalSlider from '../components/VerticalSlider.vue';
import { displayBrightness, setBrightness } from '../composables/useSettings.js';

const { t } = useI18n();

const TILES = [
  { id: 'machine', label: 'settingsPage.machine', icon: 'M8 7h8M9 11h6a3 3 0 0 1-3 3 3 3 0 0 1-3-3z' },
  { id: 'app', label: 'settingsPage.app', icon: 'M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.3 1a7.7 7.7 0 0 0-2.6-1.5L14 2.6h-4l-.5 2.5a7.7 7.7 0 0 0-2.6 1.5l-2.3-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.3-1a7.7 7.7 0 0 0 2.6 1.5l.5 2.5h4l.5-2.5a7.7 7.7 0 0 0 2.6-1.5l2.3 1 2-3.4-2-1.5z' },
  { id: 'skin', label: 'settingsPage.skin', icon: 'M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2' },
  { id: 'profiles', label: 'settingsPage.profiles', icon: 'M4 19h16 M4 16c3 0 3-9 6-9s3 6 5 6 3-2 5-2' },
  { id: 'grinders', label: 'settingsPage.grinders', icon: 'M9 3h6l-1 5h-4L9 3z M8 8h8v6H8z M10 14v4h4v-4' },
];

const active = ref(null);
</script>

<template>
  <section class="page">
    <h1 class="page-title">{{ t('tab.settings') }}</h1>
    <div class="settings-body">
      <div class="settings-hero">
        <MachineWidget />
        <ScaleWidget />
        <ScheduleWidget @open-panel="active = 'schedule'" />
      </div>
      <div class="settings-tiles">
        <button v-for="tile in TILES" :key="tile.id" class="tile" @click="active = tile.id">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="tile.icon" /></svg>
          <span class="tl">{{ t(tile.label) }}</span>
        </button>
      </div>
      <VerticalSlider
        class="settings-brightness"
        :model-value="displayBrightness"
        :min="10"
        :max="100"
        @update:model-value="setBrightness"
      />
    </div>

    <ProfilePicker v-if="active === 'profiles'" mode="manage" @back="active = null" />
    <GrinderPanel v-if="active === 'grinders'" @close="active = null" />
    <MachinePanel v-if="active === 'machine'" @close="active = null" />
    <SkinPanel v-if="active === 'skin'" @close="active = null" />
    <AppPanel v-if="active === 'app'" @close="active = null" />
    <SchedulePanel v-if="active === 'schedule'" @close="active = null" />
  </section>
</template>
