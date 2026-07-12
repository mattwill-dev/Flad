<script setup>
import { useI18n } from 'vue-i18n';
import { chooserState, resolveChooser } from '../composables/useModals.js';

const { t } = useI18n();
const cancel = () => resolveChooser(null);
</script>

<template>
  <div v-if="chooserState.open" class="scrim" @click.self="cancel">
    <div class="modal">
      <span class="m-title">{{ chooserState.title }}</span>
      <div class="chooser">
        <button
          v-for="[value, label] in chooserState.options"
          :key="value"
          class="chooser-item"
          :class="{ sel: value === chooserState.current }"
          @click="resolveChooser(value)"
        >{{ label }}</button>
      </div>
      <div class="modal-actions">
        <button class="cancel" @click="cancel">{{ t('common.cancel') }}</button>
      </div>
    </div>
  </div>
</template>
