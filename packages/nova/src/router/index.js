import { createRouter, createWebHashHistory } from 'vue-router';

import Espresso from '../views/EspressoView.vue';
import Steam from '../views/SteamView.vue';
import HotWater from '../views/HotWaterView.vue';
import Cleaning from '../views/CleaningView.vue';
import Diary from '../views/DiaryView.vue';
import Settings from '../views/SettingsView.vue';

/**
 * Six top-level pages, each one tap away — the register-tab model.
 * `side` drives which rail the tab sits in: drinks left, management right.
 * Hash history, because the Decent app serves the skin from a static path.
 */
export const TABS = [
  { name: 'espresso', path: '/espresso', component: Espresso, side: 'left',  accent: '#c98a4b' },
  { name: 'steam',    path: '/steam',    component: Steam,    side: 'left',  accent: '#7fa8c9' },
  { name: 'hotwater', path: '/hotwater', component: HotWater, side: 'left',  accent: '#d97b5a' },
  { name: 'cleaning', path: '/cleaning', component: Cleaning, side: 'right', accent: '#5fb8a5' },
  { name: 'diary',    path: '/diary',    component: Diary,    side: 'right', accent: '#a48fd1' },
  { name: 'settings', path: '/settings', component: Settings, side: 'right', accent: '#9aa4ad' },
];

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/espresso' },
    ...TABS.map(({ name, path, component }) => ({ name, path, component })),
  ],
});
