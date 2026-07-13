<script setup>
/**
 * The recipe library + the "new recipe" flow (choose/add bean -> choose profile
 * -> compose -> persist). Two entry points, one renderer:
 *   startStep 'list' — the espresso screen's recipe title: browse and load.
 *   startStep 'bean' — the Diary's "+" button: go straight to creating one.
 * The Diary skipping the library list is the ONLY difference, so it reuses this
 * rather than owning a second copy of the same two-step flow.
 */
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { recipe, recipes, refreshRecipes, selectRecipe, composeNewRecipe, createRecipeFromCurrent, deleteRecipe } from '../composables/useRecipe.js';
import BeanChooser from './BeanChooser.vue';
import ProfilePicker from './ProfilePicker.vue';

const props = defineProps({
  startStep: { type: String, default: 'list' }, // 'list' | 'bean'
});
const emit = defineEmits(['back', 'created']);
const { t } = useI18n();

const step = ref(props.startStep); // 'list' | 'bean' | 'profile'
const chosenBean = ref(null);

onMounted(refreshRecipes);

const isCurrent = (entry) => entry.id != null && entry.id === recipe.id;

async function pick(entry) {
  await selectRecipe(entry);
  emit('back');
}

async function remove(entry, event) {
  event.stopPropagation();
  await deleteRecipe(entry.id);
}

function startNewRecipe() {
  step.value = 'bean';
}

/** Backing out of the bean step: to the library if we came from it, otherwise
 *  (the Diary's straight-to-create entry) close the whole thing. */
function backFromBean() {
  if (props.startStep === 'list') step.value = 'list';
  else emit('back');
}

function onBeanPicked(bean) {
  chosenBean.value = bean;
  step.value = 'profile';
}

async function onProfilePicked(profile) {
  await composeNewRecipe({ bean: chosenBean.value, profile });
  const created = await createRecipeFromCurrent();
  emit('created', created);
  emit('back');
}
</script>

<template>
  <BeanChooser v-if="step === 'bean'" @pick="onBeanPicked" @back="backFromBean" />
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
      <div v-for="entry in recipes" :key="entry.id" class="list-row bean-row">
        <button class="row-main" @click="pick(entry)">
          <span class="rmeta">
            {{ entry.coffeeRoaster }} – {{ entry.coffeeName }}
            <span class="rsub">{{ [entry.grinderModel, entry.profileTitle].filter((v) => v && v !== '—').join(' · ') }}</span>
          </span>
          <span v-if="isCurrent(entry)" class="cur" style="color: var(--accent); font-size: 0.6rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase">
            {{ t('common.current') }}
          </span>
          <span v-else class="chev">›</span>
        </button>
        <button class="row-edit" :aria-label="t('common.delete')" @click="remove(entry, $event)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
        </button>
      </div>
      <div v-if="!recipes.length" class="list-row"><span class="rsub">{{ t('recipePicker.noRecipesYet') }}</span></div>
    </div>
    <div class="prep-bottom" style="justify-content: center">
      <button class="btn" @click="startNewRecipe">+ {{ t('recipePicker.newRecipe') }}</button>
    </div>
  </div>
</template>
