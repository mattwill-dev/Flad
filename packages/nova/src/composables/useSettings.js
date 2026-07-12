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
export const advancedSettings = reactive({});
export async function loadAppSettings() {
  Object.assign(appSettings, await NSXCore.loadAppSettings());
}
export async function loadAdvancedSettings() {
  Object.assign(advancedSettings, await NSXCore.loadAdvancedSettings());
}
export async function saveAppSetting(key, value) {
  appSettings[key] = value;
  await NSXCore.saveAppSetting(key, value);
}
export async function saveAdvancedSetting(key, value) {
  advancedSettings[key] = value;
  await NSXCore.saveAdvancedSetting(key, value);
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

/** The DE1's own screen brightness (gateway-side, not skin CSS) — write-only
 * API, so the last value set THIS session is all we can show; it does not
 * reflect a value changed from the machine's own screen. */
export const displayBrightness = ref(Number(NSXCore.getStore().nsx_display_brightness) || 80);
export async function setBrightness(level) {
  displayBrightness.value = level;
  NSXCore.patchStore({ nsx_display_brightness: level });
  await NSXApi.setDisplayBrightness(level);
}
