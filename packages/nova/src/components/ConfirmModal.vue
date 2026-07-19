<script setup>
import { useI18n } from 'vue-i18n';
import { confirmState, resolveConfirm } from '../composables/useModals.js';

const { t } = useI18n();
const cancel = () => resolveConfirm(false);
</script>

<template>
  <div v-if="confirmState.open" class="scrim" @click.self="cancel">
    <div class="modal">
      <span class="m-title">{{ confirmState.title }}</span>
      <p v-if="confirmState.message" class="m-msg">{{ confirmState.message }}</p>
      <div class="modal-actions">
        <button v-if="!confirmState.alert" class="cancel" @click="cancel">{{ t('common.cancel') }}</button>
        <button
          class="confirm"
          :class="{ danger: confirmState.danger }"
          @click="resolveConfirm(true)"
        >{{ confirmState.confirmLabel || t('common.confirm') }}</button>
      </div>
    </div>
  </div>
</template>
