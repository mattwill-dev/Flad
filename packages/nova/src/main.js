/**
 * Nova entry point.
 *
 * The shared core is a set of plain browser scripts that assign window.NSXCore /
 * NSXApi / NSXConfig / NSXI18n. We side-effect-import them so Vite bundles them,
 * in exactly the order packages/core/README.md prescribes: each module registers
 * itself on NSXCore, so it must come after anything it uses.
 *
 * `api.js` opens the gateway WebSockets on load — the skin never calls a connect
 * function itself. That is why the core imports come before anything else.
 */
import './core/config.js';
import './core/translations.js';
import './core/api.js';
import './core/core.js';
import './core/store.js';
import './core/push.js';
import './core/domains/schedule.js';
import './core/domains/steam.js';
import './core/domains/hotwater.js';
import './core/domains/flush.js';
import './core/domains/grinder.js';
import './core/domains/bean.js';
import './core/domains/shot.js';
import './core/domains/workflow.js';
import './core/domains/profile.js';
import './core/domains/machine.js';
import './core/domains/mapping.js';
import './core/domains/settings.js';
import './core/domains/devices.js';
import './core/domains/plugins.js';
import './core/domains/profile-render.js';

import { createApp } from 'vue';
import 'uplot/dist/uPlot.min.css';
import './styles/app.css';

import App from './App.vue';
import router from './router';
import i18n from './i18n';
import { bootCore } from './composables/useCore.js';

createApp(App).use(router).use(i18n).mount('#app');

// Kick off the core bootstrap. The UI mounts immediately and fills in as the
// store/REST data arrives, so a slow or absent gateway never blocks rendering.
bootCore();
