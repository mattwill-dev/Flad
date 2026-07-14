/**
 * Reactive mirrors + thin wrappers for the Settings tiles. Unlike useCore.js,
 * none of this is preloaded at boot — each panel loads its own slice of data
 * lazily when opened, since Settings is not on the hot path.
 */
import { reactive, ref } from 'vue';

const { NSXCore, NSXApi } = window;

export const devices = ref([]);
export async function loadDevices() {
  await NSXCore.loadDevices();
  devices.value = NSXCore.getDevices();
}
export async function scanForDevices() {
  await NSXCore.scanForDevices();
  devices.value = NSXCore.getDevices();
}
export async function connectToDevice(id) {
  await NSXCore.connectToDevice(id);
  devices.value = NSXCore.getDevices();
}
export async function disconnectDevice(id) {
  await NSXCore.disconnectDevice(id);
  devices.value = NSXCore.getDevices();
}

export const plugins = ref([]);
export const visualizerSettings = reactive({
  username: '', password: '', autoUpload: false, minShotDuration: 10, extendedMetadata: false,
  backSync: false, backSyncIntervalSeconds: 300,
});
const VISUALIZER_ID = 'visualizer.reaplugin';

export async function loadPlugins() {
  await NSXCore.loadPlugins();
  plugins.value = NSXCore.getPlugins();
}
export async function setPluginEnabled(id, enabled) {
  await NSXCore.setPluginEnabled(id, enabled);
  plugins.value = NSXCore.getPlugins();
}
export async function loadVisualizerSettings() {
  const s = await NSXCore.loadPluginSettings(VISUALIZER_ID);
  Object.assign(visualizerSettings, s);
}
export async function saveVisualizerSetting(key, value) {
  visualizerSettings[key] = value;
  await NSXCore.savePluginSetting(VISUALIZER_ID, key, value);
}
export const visualizerPlugin = () => plugins.value.find((p) => p.id === VISUALIZER_ID);

export const appSettings = reactive({});
export const machineSettings = reactive({});
export const advancedSettings = reactive({});
export async function loadAppSettings() {
  Object.assign(appSettings, await NSXCore.loadAppSettings());
}
export async function loadMachineSettings() {
  Object.assign(machineSettings, await NSXCore.loadMachineSettings());
}
export async function loadAdvancedSettings() {
  Object.assign(advancedSettings, await NSXCore.loadAdvancedSettings());
}
export async function saveAppSetting(key, value) {
  appSettings[key] = value;
  await NSXCore.saveAppSetting(key, value);
}
export async function saveMachineSetting(key, value) {
  machineSettings[key] = value;
  await NSXCore.saveMachineSetting(key, value);
}
export async function saveAdvancedSetting(key, value) {
  advancedSettings[key] = value;
  await NSXCore.saveAdvancedSetting(key, value);
}

/** The refill-alert threshold isn't a skin setting at all — pushRefillLevel
 * is a real gateway command, and the CURRENT value is just machine.water.
 * refillLevel (already tracked live via the waterLevel core event), not a
 * separate thing to fetch or store here. */
export async function pushRefillLevel(mm) {
  await NSXApi.pushRefillLevel(mm);
}

/** The machine on/off weekly schedule — the same domain NSX's Schedule UI
 * already drives (see schedule.js); Nova just mirrors its snapshot into Vue. */
export const scheduleState = reactive(NSXCore.getScheduleState());
NSXCore.on('scheduleChanged', (snapshot) => Object.assign(scheduleState, snapshot));
export function applySchedule(patch) {
  NSXCore.applySchedule(patch);
}

export const machineInfo = ref(null);
export async function loadMachineInfo() {
  machineInfo.value = await NSXApi.fetchMachineInfo();
}

/** Auto Sleep — NSX's presence settings, not an app/machine settings key. */
export const presenceSettings = reactive({ userPresenceEnabled: false, sleepTimeoutMinutes: 30 });
export async function loadPresenceSettings() {
  Object.assign(presenceSettings, await NSXApi.fetchPresenceSettings());
}
export async function savePresenceSetting(key, value) {
  presenceSettings[key] = value;
  await NSXApi.updatePresenceSettings({ ...presenceSettings });
}

/**
 * Skin-local (Nova store namespace) preferences — no gateway/DE1 involved
 * except wakelock, which is a display-service call, not a machine one.
 *
 * The store isn't loaded yet at module-import time (NSXCore.loadStore() runs
 * inside bootCore(), which main.js awaits AFTER these defaults are read), so
 * these initial values are placeholders — loadSkinSettings() must be called
 * once boot finishes to pick up what's actually in the store.
 */
export const skinSettings = reactive({
  wakeOnUnlock: true,
  timeFormat: '24h',
  startTab: 'espresso',
  screensaverBrightness: 30,
  wakelock: true,
});
const SKIN_KEYS = {
  wakeOnUnlock: 'nova_wake_on_unlock',
  timeFormat: 'nova_time_format',
  startTab: 'nova_start_tab',
  screensaverBrightness: 'nova_screensaver_brightness',
  wakelock: 'nova_wakelock',
};
export function loadSkinSettings() {
  const s = NSXCore.getStore();
  skinSettings.wakeOnUnlock = s.nova_wake_on_unlock !== false;
  skinSettings.timeFormat = s.nova_time_format || '24h';
  skinSettings.startTab = s.nova_start_tab || 'espresso';
  skinSettings.screensaverBrightness = Number(s.nova_screensaver_brightness) || 30;
  skinSettings.wakelock = s.nova_wakelock !== false;
}
export async function saveSkinSetting(key, value) {
  skinSettings[key] = value;
  NSXCore.patchStore({ [SKIN_KEYS[key]]: value });
  if (key === 'wakelock') {
    if (value) await NSXApi.requestWakeLockOverride();
    else await NSXApi.releaseWakeLockOverride();
  }
}

/** The DE1's own screen brightness (gateway-side, not skin CSS) — write-only
 * API, so the last value set THIS session is all we can show; it does not
 * reflect a value changed from the machine's own screen. */
export const displayBrightness = ref(Number(NSXCore.getStore().nsx_display_brightness) || 80);
let _brightnessApplyTimer = null;
export function setBrightness(level) {
  displayBrightness.value = level;
  NSXCore.patchStore({ nsx_display_brightness: level });
  // Debounced so dragging the landing-page slider doesn't fire a REST call per
  // pixel of movement — matches NSX's own 120ms debounce for the same slider.
  clearTimeout(_brightnessApplyTimer);
  _brightnessApplyTimer = setTimeout(() => {
    NSXApi.setDisplayBrightness(level).catch((err) => {
      console.error('[Nova] failed to set display brightness', err);
    });
  }, 120);
}
