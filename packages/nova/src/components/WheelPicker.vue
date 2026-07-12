<script setup>
/**
 * A single shared instance (mounted once in App.vue) driven by useModals.js's
 * wheelState — see openWheel() for how views open it.
 */
import { nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { wheelState, resolveWheel } from '../composables/useModals.js';

const { t } = useI18n();
const ITEM = 44;
const scrollEl = ref(null);

watch(
  () => wheelState.open,
  async (open) => {
    if (!open) return;
    await nextTick();
    const idx = Math.max(0, wheelState.values.indexOf(wheelState.current));
    if (scrollEl.value) scrollEl.value.scrollTop = idx * ITEM;
  }
);

function selectedIndex() {
  if (!scrollEl.value) return 0;
  const idx = Math.round(scrollEl.value.scrollTop / ITEM);
  return Math.max(0, Math.min(wheelState.values.length - 1, idx));
}

function confirm() { resolveWheel(wheelState.values[selectedIndex()]); }
function cancel() { resolveWheel(null); }
</script>

<template>
  <div v-if="wheelState.open" class="scrim" @click.self="cancel">
    <div class="modal">
      <span class="m-title">{{ wheelState.title }}</span>
      <div class="wheel-wrap">
        <div class="wheel" ref="scrollEl">
          <div class="wheel-list">
            <div v-for="v in wheelState.values" :key="v" class="wheel-item">
              {{ v }}<span v-if="wheelState.unit" class="u">{{ wheelState.unit }}</span>
            </div>
          </div>
        </div>
        <div class="wheel-band"></div>
      </div>
      <div class="modal-actions">
        <button class="cancel" @click="cancel">{{ t('common.cancel') }}</button>
        <button class="confirm" @click="confirm">{{ t('common.confirm') }}</button>
      </div>
    </div>
  </div>
</template>
