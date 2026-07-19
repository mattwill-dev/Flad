<script setup>
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ratingState, resolveRating } from '../composables/useModals.js';
import StarRating from './StarRating.vue';

const { t } = useI18n();
const draft = ref(0);
watch(() => ratingState.open, (open) => { if (open) draft.value = ratingState.value; });

const cancel = () => resolveRating(null);
const save = () => resolveRating(draft.value);
const clear = () => { draft.value = 0; };
</script>

<template>
  <div v-if="ratingState.open" class="scrim" @click.self="cancel">
    <div class="modal rating-modal">
      <span class="m-title">{{ ratingState.title }}</span>
      <div class="rating-stars-row">
        <StarRating v-model="draft" :size="44" />
      </div>
      <div class="rating-value">{{ draft ? draft.toFixed(1) : t('rating.unrated') }}</div>
      <div class="modal-actions">
        <button class="cancel" @click="cancel">{{ t('common.cancel') }}</button>
        <button class="cancel" @click="clear">{{ t('rating.clear') }}</button>
        <button class="confirm" @click="save">{{ t('common.save') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rating-stars-row { display: flex; justify-content: center; padding: 10px 0 4px; }
.rating-value {
  text-align: center; font-size: var(--fs-md); font-weight: 700; color: var(--accent);
  font-variant-numeric: tabular-nums; min-height: 1.4em;
}
</style>
