<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { machine, singleGrinder } from '../composables/useCore.js';
import { recipe, roastAge, pushRecipe, setRoastDate, resetVolumeCalibration } from '../composables/useRecipe.js';
import { loadHistoryForCurrentRecipe } from '../composables/useLiveShot.js';
import { openNumberPad } from '../composables/useModals.js';
import { useDragDial } from '../composables/useDragDial.js';
import ScalePod from '../components/ScalePod.vue';
import RecipePicker from '../components/RecipePicker.vue';
import ProfilePicker from '../components/ProfilePicker.vue';
import RoastDatePicker from '../components/RoastDatePicker.vue';

const { t } = useI18n();

const ICONS = {
  thermo: '<path d="M10 4a2 2 0 0 1 4 0v9a4.5 4.5 0 1 1-4 0V4z"/><path d="M12 9v6"/>',
  bean: '<path d="M7 7c3-4 9-3 10 1s-3 10-8 9-5-6-2-10z"/><path d="M9 8c2 2 4 3 6 7"/>',
  cup: '<path d="M5 8h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8z"/><path d="M16 9h1.5a2 2 0 0 1 0 4H16"/>',
  grinder: '<path d="M9 3h6l-1 5h-4L9 3z"/><path d="M8 8h8v6H8z"/><path d="M10 14v4h4v-4"/>',
  history: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  profile: '<path d="M4 19h16"/><path d="M4 16c3 0 3-9 6-9s3 6 5 6 3-2 5-2"/>',
  drop: '<path d="M12 3.5s5.5 6.3 5.5 10a5.5 5.5 0 0 1-11 0c0-3.7 5.5-10 5.5-10z"/><path d="M9.5 14.5a2.8 2.8 0 0 0 2.3 2.7"/>',
};

const titleParts = computed(() =>
  [recipe.coffeeRoaster, recipe.coffeeName, singleGrinder.value ? null : recipe.grinderModel, recipe.profileTitle]
    .filter((v) => v && v !== '—')
);
// Same "nothing loaded yet" signal the title placeholder already uses (first
// launch, or adoptCurrentWorkflowAsRecipe finding no roaster/name at boot —
// see useRecipe.js). The dials/roast-chip/history below are all meaningless
// without a bean+profile behind them, so they're replaced by an empty state
// rather than showing 0g/0°C and a roast-date chip with no bean to attach to.
const hasRecipe = computed(() => titleParts.value.length > 0);

function fmtDate(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
}
const roastLabel = computed(() =>
  recipe.roastDate ? `${t('espresso.roasted')} ${fmtDate(recipe.roastDate)} · ${roastAge.value}` : t('espresso.setRoastDate')
);

const showRecipePicker = ref(false);
const showProfilePicker = ref(false);
const showRoastPicker = ref(false);
// Jumps straight to bean->profile creation, skipping the (empty) library list —
// same entry point the Diary's "+" uses (RecipePicker start-step="bean").
const showRecipeCreator = ref(false);

async function onProfileSelected(profile) {
  recipe.profileTitle = profile.profile?.title || '—';
  recipe.selectedProfileId = profile.id ?? null;
  await pushRecipe();
  showProfilePicker.value = false;
}

async function onRoastConfirm(iso) {
  await setRoastDate(iso);
  showRoastPicker.value = false;
}

async function editDose() {
  const v = await openNumberPad({ title: t('espresso.dose'), unit: 'g', value: recipe.targetDoseWeight.toFixed(1) });
  if (v == null) return;
  recipe.targetDoseWeight = parseFloat(v);
  await pushRecipe();
}
async function editGrind() {
  const v = await openNumberPad({ title: t('espresso.grindSize'), value: recipe.grinderSetting });
  if (v == null) return;
  recipe.grinderSetting = v;
  await pushRecipe();
}
async function editYield() {
  const v = await openNumberPad({ title: t('espresso.targetYield'), unit: 'g', value: recipe.targetYield.toFixed(1) });
  if (v == null) return;
  recipe.targetYield = parseFloat(v);
  await pushRecipe();
}
async function editTemp() {
  const v = await openNumberPad({ title: t('espresso.stopAtTemp'), unit: '°C', value: String(recipe.groupTemp) });
  if (v == null) return;
  recipe.groupTemp = parseFloat(v);
  await pushRecipe();
}

/**
 * Press-and-pull-to-adjust for the recipe dials (see useDragDial.js). Unlike
 * the machine-function domains (steam/hotwater), pushRecipe() has no internal
 * debounce — it's a full gateway round-trip PLUS ensureRecipeBatch() every
 * call — so it must NOT run on every pointermove pixel. useDragDial's
 * onCommit fires exactly once, on release, rather than on a trailing debounce:
 * a debounce still fires mid-drag if the finger pauses even briefly, which is
 * exactly the "pushed before I lifted my finger" bug this replaced.
 */
const doseDrag = useDragDial({
  get: () => recipe.targetDoseWeight,
  set: (v) => { recipe.targetDoseWeight = v; },
  onCommit: () => pushRecipe(),
  min: 5, max: 30, step: 0.1, pxPerUnit: 20,
});
const onDoseClick = doseDrag.guardClick(editDose);

// Grinder settings vary per grinder (stepless dial vs. numbered positions —
// see NSX's grinder editor), and the connected grinder's actual type isn't
// modeled here, so this is a generic numeric range, not a per-grinder one.
const grindDrag = useDragDial({
  get: () => parseFloat(recipe.grinderSetting) || 0,
  set: (v) => { recipe.grinderSetting = String(Math.round(v * 10) / 10); },
  onCommit: () => pushRecipe(),
  min: 0, max: 100, step: 1, pxPerUnit: 3,
});
const onGrindClick = grindDrag.guardClick(editGrind);

const yieldDrag = useDragDial({
  get: () => recipe.targetYield,
  set: (v) => { recipe.targetYield = v; },
  onCommit: () => pushRecipe(),
  min: 10, max: 70, step: 0.1, pxPerUnit: 20,
});
const onYieldClick = yieldDrag.guardClick(editYield);

const tempDrag = useDragDial({
  get: () => recipe.groupTemp,
  set: (v) => { recipe.groupTemp = v; },
  onCommit: () => pushRecipe(),
  min: 80, max: 100, step: 1, pxPerUnit: 4,
});
const onTempClick = tempDrag.guardClick(editTemp);

async function toggleVirtualScale() {
  recipe.useVolumeStopWhenNoScale = !recipe.useVolumeStopWhenNoScale;
  await pushRecipe();
}

// Learned automatically after every shot (see useLiveShot.js's post-shot
// hook) — never user-entered, so this is a readout + reset, not an editor.
const virtualScaleInfo = computed(() => {
  const cal = recipe.volumeCalibration || { factor: 1, samples: [] };
  const n = cal.samples?.length || 0;
  return `${cal.factor.toFixed(2)} ml/g · ${n} ${n === 1 ? t('espresso.vsSample') : t('espresso.vsSamples')}`;
});
function resetVirtualScale() { resetVolumeCalibration(); }
</script>

<template>
  <section class="page">
    <div class="prep-top">
      <button class="recipe-title" :aria-label="t('espresso.editRecipe')" @click="showRecipePicker = true">
        <span v-if="!titleParts.length" class="placeholder">{{ t('espresso.noRecipeYet') }}</span>
        <template v-else v-for="(part, i) in titleParts" :key="i">
          <span v-if="i > 0" class="dot">•</span>{{ part }}
        </template>
        <span class="chev">▾</span>
      </button>
      <button v-if="hasRecipe" class="roast-chip" @click="showRoastPicker = true">
        <svg viewBox="0 0 24 24" aria-hidden="true" v-html="ICONS.drop"></svg>{{ roastLabel }}
      </button>
    </div>

    <div v-if="!hasRecipe" class="empty-recipe">
      <svg viewBox="0 0 24 24" aria-hidden="true" v-html="ICONS.bean"></svg>
      <span class="empty-title">{{ t('espresso.emptyTitle') }}</span>
      <span class="empty-sub">{{ t('espresso.emptySub') }}</span>
      <button class="btn accent" @click="showRecipeCreator = true">
        <svg viewBox="0 0 24 24" aria-hidden="true" v-html="ICONS.profile"></svg>{{ t('espresso.createFirstRecipe') }}
      </button>
    </div>

    <div v-else class="dials">
      <div class="dial-group">
        <span class="dial-label">{{ t('espresso.dose') }}</span>
        <button
          class="dial"
          :class="{ dragging: doseDrag.dragging.value }"
          @click="onDoseClick"
          @pointerdown="doseDrag.onPointerDown"
          @pointermove="doseDrag.onPointerMove"
          @pointerup="doseDrag.onPointerUp"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" v-html="ICONS.bean"></svg>
          <span class="num">{{ recipe.targetDoseWeight.toFixed(1) }}</span><span class="unit">g</span>
        </button>
      </div>

      <div class="dial-group">
        <span class="dial-label">{{ t('espresso.grindSize') }}</span>
        <button
          class="dial"
          :class="{ dragging: grindDrag.dragging.value }"
          @click="onGrindClick"
          @pointerdown="grindDrag.onPointerDown"
          @pointermove="grindDrag.onPointerMove"
          @pointerup="grindDrag.onPointerUp"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" v-html="ICONS.grinder"></svg>
          <span class="num">{{ recipe.grinderSetting }}</span>
        </button>
      </div>

      <div class="dial-group">
        <span class="dial-label">{{ t('espresso.stopAtTemp') }}</span>
        <div class="dial">
          <div class="duo">
            <button
              :class="{ dragging: yieldDrag.dragging.value }"
              @click="onYieldClick"
              @pointerdown="yieldDrag.onPointerDown"
              @pointermove="yieldDrag.onPointerMove"
              @pointerup="yieldDrag.onPointerUp"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" v-html="ICONS.cup"></svg><br />
              <span class="num">{{ recipe.targetYield.toFixed(1) }}</span><br /><span class="unit">g</span>
            </button>
            <button
              :class="{ dragging: tempDrag.dragging.value }"
              @click="onTempClick"
              @pointerdown="tempDrag.onPointerDown"
              @pointermove="tempDrag.onPointerMove"
              @pointerup="tempDrag.onPointerUp"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" v-html="ICONS.thermo"></svg><br />
              <span class="num">{{ recipe.groupTemp }}</span><br /><span class="unit">°C</span>
            </button>
          </div>
        </div>
        <div class="vscale">
          <span class="vl">{{ t('espresso.virtualScale') }}</span>
          <button
            class="switch"
            :class="{ on: recipe.useVolumeStopWhenNoScale }"
            role="switch"
            :aria-checked="recipe.useVolumeStopWhenNoScale"
            :aria-label="t('espresso.virtualScale')"
            @click="toggleVirtualScale"
          ></button>
        </div>
        <div v-if="recipe.useVolumeStopWhenNoScale" class="vscale-info">
          <span>{{ virtualScaleInfo }}</span>
          <button @click="resetVirtualScale">{{ t('espresso.vsReset') }}</button>
        </div>
      </div>
    </div>

    <div v-if="hasRecipe" class="prep-bottom">
      <button class="btn" @click="showProfilePicker = true">
        <svg viewBox="0 0 24 24" aria-hidden="true" v-html="ICONS.profile"></svg>{{ t('espresso.changeProfile') }}
      </button>
      <ScalePod v-if="machine.scaleConnected" />
      <button class="btn" @click="loadHistoryForCurrentRecipe">
        <svg viewBox="0 0 24 24" aria-hidden="true" v-html="ICONS.history"></svg>{{ t('espresso.history') }}
      </button>
    </div>

    <RecipePicker v-if="showRecipePicker" @back="showRecipePicker = false" />
    <RecipePicker
      v-if="showRecipeCreator"
      start-step="bean"
      @back="showRecipeCreator = false"
      @created="showRecipeCreator = false"
    />
    <ProfilePicker
      v-if="showProfilePicker"
      mode="pick"
      :current-title="recipe.profileTitle"
      @select="onProfileSelected"
      @back="showProfilePicker = false"
    />
    <RoastDatePicker
      v-if="showRoastPicker"
      :model-value="recipe.roastDate"
      @confirm="onRoastConfirm"
      @cancel="showRoastPicker = false"
    />
  </section>
</template>
