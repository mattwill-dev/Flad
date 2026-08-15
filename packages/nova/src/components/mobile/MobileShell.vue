<script setup>
/**
 * Phone shell: a single scrollable content area plus a bottom tab bar,
 * swapped in for the tablet `.stage` by App.vue when useLayout.js's `isPhone`
 * is true. Nova is a remote companion on the phone — browsing only, no live
 * machine control — so this shell owns its own tiny tab state rather than
 * the vue-router routes the tablet rails use (those six pages don't map 1:1
 * onto what a phone companion needs).
 */
import { ref } from 'vue';
import HomeTab from './tabs/HomeTab.vue';
import DiaryTab from './tabs/DiaryTab.vue';
import ShotsTab from './tabs/ShotsTab.vue';
import SettingsTab from './tabs/SettingsTab.vue';
import PhoneTabBar from './PhoneTabBar.vue';

const activeTab = ref('home');
const TAB_COMPONENTS = { home: HomeTab, diary: DiaryTab, shots: ShotsTab, settings: SettingsTab };
</script>

<template>
  <div class="phone-shell">
    <main class="phone-main">
      <component :is="TAB_COMPONENTS[activeTab]" />
    </main>
    <PhoneTabBar v-model="activeTab" />
  </div>
</template>
