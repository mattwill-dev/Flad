<script setup>
/**
 * Grinder detail — create/edit/delete. Fields mirror NSX's existing grinder
 * editor exactly (packages/nsx/src/modules/app.js) so both skins model the
 * same real gateway object: model/burrs/burrSize/burrType, then either a
 * stepless adjustment (small/big step) or a fixed set of preset positions.
 */
import { reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { openTextField, openChooser } from '../../composables/useModals.js';
import { openWheel } from '../../composables/useModals.js';
import { range } from '../../utils/range.js';

const props = defineProps({
  grinder: { type: Object, default: null }, // null = new grinder
});
const emit = defineEmits(['close', 'saved', 'deleted']);
const { t } = useI18n();
const { NSXCore } = window;

const isNew = !props.grinder;
const draft = reactive({
  model: props.grinder?.model ?? '',
  burrs: props.grinder?.burrs ?? '',
  burrSize: props.grinder?.burrSize ?? '',
  burrType: props.grinder?.burrType ?? '',
  settingType: props.grinder?.settingType ?? 'numeric',
  settingSmallStep: props.grinder?.settingSmallStep ?? '',
  settingBigStep: props.grinder?.settingBigStep ?? '',
  settingValues: Array.isArray(props.grinder?.settingValues) ? props.grinder.settingValues.join(', ') : '',
});

const burrTypeOpts = [['conical', t('grinderEditor.conical')], ['flat', t('grinderEditor.flat')]];
const settingTypeOpts = [['numeric', t('grinderEditor.stepless')], ['preset', t('grinderEditor.positions')]];
const optLabel = (opts, v) => opts.find(([value]) => value === v)?.[1] ?? '';

async function editText(field, label) {
  const v = await openTextField({ title: label, value: String(draft[field] ?? '') });
  if (v != null) draft[field] = v;
}
async function editNumber(field, label, from, to, step, dec) {
  const v = await openWheel({ title: label, values: range(from, to, step, dec), current: draft[field] || from });
  if (v != null) draft[field] = dec > 0 ? v : Number(v);
}
async function pickBurrType() {
  const v = await openChooser({ title: t('grinderEditor.type'), options: burrTypeOpts, current: draft.burrType });
  if (v != null) draft.burrType = v;
}
async function pickSettingType() {
  const v = await openChooser({ title: t('grinderEditor.setting'), options: settingTypeOpts, current: draft.settingType });
  if (v != null) draft.settingType = v;
}

function toPayload() {
  return {
    model: draft.model, burrs: draft.burrs,
    burrSize: draft.burrSize !== '' ? Number(draft.burrSize) : null,
    burrType: draft.burrType, settingType: draft.settingType,
    settingSmallStep: draft.settingSmallStep !== '' ? Number(draft.settingSmallStep) : null,
    settingBigStep: draft.settingBigStep !== '' ? Number(draft.settingBigStep) : null,
    settingValues: draft.settingValues
      ? draft.settingValues.split(',').map((v) => Number(v.trim())).filter((v) => Number.isFinite(v))
      : [],
  };
}

async function save() {
  const payload = toPayload();
  if (isNew) await NSXCore.createGrinder(payload);
  else await NSXCore.updateGrinder(props.grinder.id, payload);
  await NSXCore.loadGrinders();
  emit('saved');
}
async function del() {
  await NSXCore.deleteGrinder(props.grinder.id);
  await NSXCore.loadGrinders();
  emit('deleted');
}
</script>

<template>
  <div class="overlay-full">
    <div class="ov-top">
      <button class="ov-back" @click="emit('close')">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>{{ t('settingsPage.grinders') }}
      </button>
      <span class="ov-title">{{ isNew ? t('grinderEditor.newTitle') : (draft.model || '—') }}</span>
    </div>

    <div class="settings-scroll">
      <span class="setting-group-label">{{ t('settingsPage.grinders') }}</span>
      <button class="setting-row as-btn" @click="editText('model', t('grinderEditor.model'))">
        <span class="sr-name">{{ t('grinderEditor.model') }}</span>
        <span class="sr-value" :class="{ muted: !draft.model }">{{ draft.model || t('common.notSet') }}<span class="sr-chev">›</span></span>
      </button>
      <button class="setting-row as-btn" @click="editText('burrs', t('grinderEditor.burrs'))">
        <span class="sr-name">{{ t('grinderEditor.burrs') }}</span>
        <span class="sr-value" :class="{ muted: !draft.burrs }">{{ draft.burrs || t('common.notSet') }}<span class="sr-chev">›</span></span>
      </button>
      <button class="setting-row as-btn" @click="editNumber('burrSize', t('grinderEditor.burrSize'), 20, 120, 1, 0)">
        <span class="sr-name">{{ t('grinderEditor.burrSize') }}</span>
        <span class="sr-value" :class="{ muted: draft.burrSize === '' }">{{ draft.burrSize !== '' ? `${draft.burrSize} mm` : t('common.notSet') }}<span class="sr-chev">›</span></span>
      </button>
      <button class="setting-row as-btn" @click="pickBurrType">
        <span class="sr-name">{{ t('grinderEditor.type') }}</span>
        <span class="sr-value" :class="{ muted: !draft.burrType }">{{ optLabel(burrTypeOpts, draft.burrType) || t('common.notSet') }}<span class="sr-chev">›</span></span>
      </button>

      <span class="setting-group-label">{{ t('grinderEditor.adjustment') }}</span>
      <button class="setting-row as-btn" @click="pickSettingType">
        <span class="sr-name">{{ t('grinderEditor.setting') }}</span>
        <span class="sr-value">{{ optLabel(settingTypeOpts, draft.settingType) }}<span class="sr-chev">›</span></span>
      </button>
      <template v-if="draft.settingType === 'preset'">
        <button class="setting-row as-btn" @click="editText('settingValues', t('grinderEditor.values'))">
          <span class="sr-main"><span class="sr-name">{{ t('grinderEditor.values') }}</span><span class="sr-sub">{{ t('grinderEditor.valuesSub') }}</span></span>
          <span class="sr-value" :class="{ muted: !draft.settingValues }">{{ draft.settingValues || t('common.notSet') }}<span class="sr-chev">›</span></span>
        </button>
      </template>
      <template v-else>
        <button class="setting-row as-btn" @click="editNumber('settingSmallStep', t('grinderEditor.smallStep'), 0.1, 5, 0.1, 1)">
          <span class="sr-name">{{ t('grinderEditor.smallStep') }}</span>
          <span class="sr-value" :class="{ muted: draft.settingSmallStep === '' }">{{ draft.settingSmallStep !== '' ? draft.settingSmallStep : t('common.notSet') }}<span class="sr-chev">›</span></span>
        </button>
        <button class="setting-row as-btn" @click="editNumber('settingBigStep', t('grinderEditor.bigStep'), 0.5, 10, 0.5, 1)">
          <span class="sr-name">{{ t('grinderEditor.bigStep') }}</span>
          <span class="sr-value" :class="{ muted: draft.settingBigStep === '' }">{{ draft.settingBigStep !== '' ? draft.settingBigStep : t('common.notSet') }}<span class="sr-chev">›</span></span>
        </button>
      </template>
    </div>

    <div class="bean-actions">
      <template v-if="isNew">
        <button class="act-btn grow" @click="emit('close')">{{ t('common.cancel') }}</button>
        <button class="act-btn accent grow" @click="save">{{ t('common.save') }}</button>
      </template>
      <template v-else>
        <button class="act-btn danger grow" @click="del">{{ t('common.delete') }}</button>
        <button class="act-btn accent grow" @click="save">{{ t('common.save') }}</button>
      </template>
    </div>
  </div>
</template>
