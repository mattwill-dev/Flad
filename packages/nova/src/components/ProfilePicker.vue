<script setup>
/**
 * List + plot + description, in two modes:
 *   "pick"   — Change profile / new-recipe step 2. Selecting emits 'select'.
 *   "manage" — Settings' profile library. Create/edit/import/delete are stubs
 *              for now (Phase 3 only needs a correct picker; the profile editor
 *              itself is out of scope here) — emits nothing but 'back'.
 * One renderer serves both, per the design log ("ein Renderer, zwei Einstiege").
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { profiles } from '../composables/useCore.js';

const props = defineProps({
  mode: { type: String, default: 'pick' }, // 'pick' | 'manage'
  currentTitle: { type: String, default: '' },
});
const emit = defineEmits(['select', 'back']);

const { t } = useI18n();
const { NSXCore } = window;

const selectedIdx = ref(
  Math.max(0, profiles.value.findIndex((p) => (p.profile?.title || '') === props.currentTitle))
);
const selected = computed(() => profiles.value[selectedIdx.value] ?? null);

function frames(p) { return p?.profile?.steps ?? p?.profile?.frames ?? []; }
function peakPressure(p) {
  const vals = frames(p).map((f) => Number(f?.pressure)).filter(Number.isFinite);
  return vals.length ? `${Math.max(...vals).toFixed(1)} bar` : '—';
}
function tempLabel(p) {
  const t2 = NSXCore.resolveProfileTemp(p?.profile);
  return t2 != null ? `${t2}°C` : '—';
}
function miniSvg(p) {
  return NSXCore.renderProfileSpark(p?.profile, {
    theme: 'dark', showLegend: false, showXTicks: false, showYTicks: false,
    showStageLabels: false, compactMargins: true, lineStrokeWidth: 5,
  });
}
function plotSvg(p) {
  return NSXCore.renderProfileSpark(p?.profile, { theme: 'dark' });
}

function confirmSelect() {
  if (selected.value) emit('select', selected.value);
}
</script>

<template>
  <div class="overlay-full">
    <div class="ov-top">
      <button class="ov-back" @click="emit('back')">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>{{ t('common.back') }}
      </button>
      <span class="ov-title">{{ mode === 'manage' ? t('profilePicker.manageTitle') : t('profilePicker.pickTitle') }}</span>
    </div>

    <div class="pick-body">
      <div class="pick-list">
        <button
          v-for="(p, i) in profiles"
          :key="p.id"
          class="pick-item"
          :class="{ sel: i === selectedIdx }"
          @click="selectedIdx = i"
        >
          <span class="mini" v-html="miniSvg(p)"></span>
          <span class="pname">{{ p.profile?.title || '—' }}</span>
          <span v-if="p.profile?.title === currentTitle" class="cur">{{ t('common.current') }}</span>
        </button>
      </div>

      <div v-if="selected" class="pick-detail">
        <div class="pd-title">{{ selected.profile?.title || '—' }}</div>
        <div class="pick-plot" v-html="plotSvg(selected)"></div>
        <div class="glabel">
          <i><span class="sw" style="background: var(--accent)"></span>{{ t('profilePicker.legPressure') }}</i>
          <i><span class="sw" style="background: #7aaaff"></span>{{ t('profilePicker.legFlow') }}</i>
        </div>
        <p class="pd-desc">{{ selected.profile?.notes || selected.profile?.author || '—' }}</p>
        <div class="pd-meta">
          <span>{{ t('profilePicker.peak') }} <b>{{ peakPressure(selected) }}</b></span>
          <span>{{ t('profilePicker.temp') }} <b>{{ tempLabel(selected) }}</b></span>
        </div>
        <div class="pd-actions">
          <button v-if="mode === 'pick'" class="btn" @click="confirmSelect">{{ t('profilePicker.select') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
