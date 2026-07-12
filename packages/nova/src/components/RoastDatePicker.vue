<script setup>
/**
 * A native date input in the shared modal chrome — simplest correct way to pick
 * a calendar date on a touchscreen without inventing a custom date wheel. Text
 * fields that genuinely need an on-screen keyboard (bean names, search) get a
 * dedicated Keyboard component in the Diary phase; a date has a purpose-built
 * native control, so it uses that instead.
 */
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({ modelValue: { type: String, default: null } });
const emit = defineEmits(['confirm', 'cancel']);
const { t } = useI18n();

const value = ref(props.modelValue || new Date().toISOString().slice(0, 10));
</script>

<template>
  <div class="scrim" @click.self="emit('cancel')">
    <div class="modal">
      <span class="m-title">{{ t('espresso.setRoastDate') }}</span>
      <input type="date" v-model="value" :max="new Date().toISOString().slice(0, 10)" class="date-input" />
      <div class="modal-actions">
        <button class="cancel" @click="emit('cancel')">{{ t('common.cancel') }}</button>
        <button class="confirm" @click="emit('confirm', value)">{{ t('common.confirm') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.date-input {
  background: var(--card-bg); border: 1px solid #2a323d; border-radius: 12px;
  color: var(--text); font: inherit; font-size: 1.1rem; padding: 12px 16px;
  color-scheme: dark;
}
</style>
