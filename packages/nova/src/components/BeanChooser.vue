<script setup>
/** Step 1 of "new recipe": pick a bean from the ones managed in the Diary.
 *  Nova doesn't create beans here — that's the Diary's job (see the design log). */
import { useI18n } from 'vue-i18n';
import { beans } from '../composables/useCore.js';

defineEmits(['pick', 'back']);
const { t } = useI18n();
</script>

<template>
  <div class="overlay-full">
    <div class="ov-top">
      <button class="ov-back" @click="$emit('back')">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>{{ t('common.back') }}
      </button>
      <span class="ov-title">{{ t('recipePicker.chooseBean') }}</span>
      <span class="ov-title" style="flex: 0; color: var(--accent)">{{ t('recipePicker.step1') }}</span>
    </div>
    <div class="list">
      <button v-for="bean in beans" :key="bean.id" class="list-row" @click="$emit('pick', bean)">
        <span class="rmeta">
          {{ bean.roaster || t('recipePicker.noRoaster') }} – {{ bean.name }}
          <span class="rsub">{{ [bean.country, bean.processing].filter(Boolean).join(' · ') }}</span>
        </span>
        <span class="chev">›</span>
      </button>
      <div v-if="!beans.length" class="list-row"><span class="rsub">{{ t('recipePicker.noBeansYet') }}</span></div>
    </div>
  </div>
</template>
