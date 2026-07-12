<script setup>
/**
 * Opened from the espresso screen's recipe title. Shows recipes derived from
 * shot history (a recipe = bean + profile, see mapping.js's getWorkflowKey) and
 * a "new recipe" flow: choose bean (Diary-managed) -> choose profile -> compose.
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { shots, refreshProfiles } from '../composables/useCore.js';
import { recipe, selectRecipe, composeNewRecipe } from '../composables/useRecipe.js';
import BeanChooser from './BeanChooser.vue';
import ProfilePicker from './ProfilePicker.vue';

const emit = defineEmits(['back']);
const { t } = useI18n();
const { NSXCore } = window;

const step = ref('list'); // 'list' | 'bean' | 'profile'
const chosenBean = ref(null);

const items = computed(() => NSXCore.buildWorkflowItemsFromShots(shots.value, undefined));
const isCurrent = (item) =>
  item.coffeeRoaster === recipe.coffeeRoaster &&
  item.coffeeName === recipe.coffeeName &&
  item.profileTitle === recipe.profileTitle;

async function pick(item) {
  await selectRecipe(item.gatewayWorkflow);
  emit('back');
}

function startNewRecipe() {
  step.value = 'bean';
}

function onBeanPicked(bean) {
  chosenBean.value = bean;
  step.value = 'profile';
}

async function onProfilePicked(profile) {
  await composeNewRecipe({ bean: chosenBean.value, profile });
  emit('back');
}
</script>

<template>
  <BeanChooser v-if="step === 'bean'" @pick="onBeanPicked" @back="step = 'list'" />
  <ProfilePicker
    v-else-if="step === 'profile'"
    mode="pick"
    :current-title="recipe.profileTitle"
    @select="onProfilePicked"
    @back="step = 'bean'"
  />
  <div v-else class="overlay-full">
    <div class="ov-top">
      <button class="ov-back" @click="emit('back')">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>{{ t('common.back') }}
      </button>
      <span class="ov-title">{{ t('recipePicker.title') }}</span>
    </div>
    <div class="list">
      <button v-for="(item, i) in items" :key="i" class="list-row" @click="pick(item)">
        <span class="rmeta">
          {{ item.coffeeRoaster }} – {{ item.coffeeName }}
          <span class="rsub">{{ [item.grinderModel, item.profileTitle].filter((v) => v && v !== '—').join(' · ') }}</span>
        </span>
        <span v-if="isCurrent(item)" class="cur" style="color: var(--accent); font-size: 0.6rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase">
          {{ t('common.current') }}
        </span>
        <span v-else class="chev">›</span>
      </button>
      <div v-if="!items.length" class="list-row"><span class="rsub">{{ t('recipePicker.noRecipesYet') }}</span></div>
    </div>
    <div class="prep-bottom" style="justify-content: center">
      <button class="btn" @click="startNewRecipe">+ {{ t('recipePicker.newRecipe') }}</button>
    </div>
  </div>
</template>
