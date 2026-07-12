<script setup>
import { nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { textFieldState, resolveTextField } from '../composables/useModals.js';

const { t } = useI18n();
const inputEl = ref(null);
const draft = ref('');

watch(
  () => textFieldState.open,
  async (open) => {
    if (!open) return;
    draft.value = textFieldState.value;
    await nextTick();
    inputEl.value?.focus();
    inputEl.value?.select();
  }
);

function confirm() { resolveTextField(draft.value.trim()); }
function cancel() { resolveTextField(null); }
</script>

<template>
  <div v-if="textFieldState.open" class="scrim" @click.self="cancel">
    <div class="modal">
      <span class="m-title">{{ textFieldState.title }}</span>
      <input
        ref="inputEl"
        v-model="draft"
        :type="textFieldState.type"
        :placeholder="textFieldState.placeholder"
        class="text-field-input"
        @keyup.enter="confirm"
      />
      <div class="modal-actions">
        <button class="cancel" @click="cancel">{{ t('common.cancel') }}</button>
        <button class="confirm" @click="confirm">{{ t('common.confirm') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.text-field-input {
  width: 260px;
  background: var(--card-bg);
  border: 1px solid #2a323d;
  border-radius: 12px;
  color: var(--text);
  font: inherit;
  font-size: 1.05rem;
  padding: 12px 16px;
}
</style>
