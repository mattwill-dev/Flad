<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { machine, singleGrinder } from '../composables/useCore.js';
import { recipe, roastAge, pushRecipe, setRoastDate } from '../composables/useRecipe.js';
import { openWheel } from '../composables/useModals.js';
import { range } from '../utils/range.js';
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
  const v = await openWheel({ title: t('espresso.dose'), unit: 'g', values: range(12, 22, 0.1, 1), current: recipe.targetDoseWeight.toFixed(1) });
  if (v == null) return;
  recipe.targetDoseWeight = parseFloat(v);
  await pushRecipe();
}
async function editGrind() {
  const v = await openWheel({ title: t('espresso.grindSize'), values: range(0, 12, 0.5, 1), current: recipe.grinderSetting });
  if (v == null) return;
  recipe.grinderSetting = v;
  await pushRecipe();
}
async function editYield() {
  const v = await openWheel({ title: t('espresso.stopAtTemp'), unit: 'g', values: range(18, 60, 0.5, 1), current: recipe.targetYield.toFixed(1) });
  if (v == null) return;
  recipe.targetYield = parseFloat(v);
  await pushRecipe();
}
async function editTemp() {
  const v = await openWheel({ title: t('espresso.stopAtTemp'), unit: '°C', values: range(80, 96, 1, 0), current: String(recipe.groupTemp) });
  if (v == null) return;
  recipe.groupTemp = parseFloat(v);
  await pushRecipe();
}

async function toggleVirtualScale() {
  recipe.useVolumeStopWhenNoScale = !recipe.useVolumeStopWhenNoScale;
  await pushRecipe();
}
</script>

<template>
  <section class="page">
    <div class="prep-top">
      <button class="recipe-title" :aria-label="t('espresso.editRecipe')" @click="showRecipePicker = true">
        <template v-for="(part, i) in titleParts" :key="i">
          <span v-if="i > 0" class="dot">•</span>{{ part }}
        </template>
        <span class="chev">▾</span>
      </button>
      <button class="roast-chip" @click="showRoastPicker = true">
        <svg viewBox="0 0 24 24" aria-hidden="true" v-html="ICONS.drop"></svg>{{ roastLabel }}
      </button>
    </div>

    <div class="dials">
      <div class="dial-group">
        <span class="dial-label">{{ t('espresso.dose') }}</span>
        <button class="dial" @click="editDose">
          <svg viewBox="0 0 24 24" aria-hidden="true" v-html="ICONS.bean"></svg>
          <span class="num">{{ recipe.targetDoseWeight.toFixed(1) }}</span><span class="unit">g</span>
        </button>
      </div>

      <div class="dial-group">
        <span class="dial-label">{{ t('espresso.grindSize') }}</span>
        <button class="dial" @click="editGrind">
          <svg viewBox="0 0 24 24" aria-hidden="true" v-html="ICONS.grinder"></svg>
          <span class="num">{{ recipe.grinderSetting }}</span>
        </button>
      </div>

      <div class="dial-group">
        <span class="dial-label">{{ t('espresso.stopAtTemp') }}</span>
        <div class="dial">
          <div class="duo">
            <button @click="editYield">
              <svg viewBox="0 0 24 24" aria-hidden="true" v-html="ICONS.cup"></svg><br />
              <span class="num">{{ recipe.targetYield.toFixed(1) }}</span><br /><span class="unit">g</span>
            </button>
            <button @click="editTemp">
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
      </div>
    </div>

    <div class="prep-bottom">
      <button class="btn" @click="showProfilePicker = true">
        <svg viewBox="0 0 24 24" aria-hidden="true" v-html="ICONS.profile"></svg>{{ t('espresso.changeProfile') }}
      </button>
      <ScalePod v-if="machine.scaleConnected" />
      <!-- Wired up in the live-shot/history phase, which is what this button opens. -->
      <button class="btn">
        <svg viewBox="0 0 24 24" aria-hidden="true" v-html="ICONS.history"></svg>{{ t('espresso.history') }}
      </button>
    </div>

    <RecipePicker v-if="showRecipePicker" @back="showRecipePicker = false" />
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
