<script setup>
/**
 * Text entry for every field in Nova (bean names, diary search, …), with its
 * own on-screen QWERTY keyboard: the DE1's kiosk browser does NOT raise a
 * system keyboard, which is why NSX ships one too. The <input> keeps
 * inputmode="none" so a device that DOES have a native OSK never stacks a
 * second keyboard on top of this one, while a physical keyboard still types
 * into it normally.
 */
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { textFieldState, resolveTextField } from '../composables/useModals.js';

const { t } = useI18n();
const inputEl = ref(null);
const draft = ref('');
const shift = ref(false);
const numeric = ref(false);

const LETTERS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];
const SYMBOLS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['-', '/', ':', ';', '(', ')', '€', '&', '@', '"'],
  ['.', ',', '?', '!', "'", '%', '+', '#', '*'],
];

watch(
  () => textFieldState.open,
  async (open) => {
    if (!open) return;
    draft.value = textFieldState.value;
    shift.value = false;
    numeric.value = false;
    await nextTick();
    inputEl.value?.focus();
    inputEl.value?.select();
  }
);

// Insert/delete at the field's actual caret (or replace its selection),
// instead of always appending at the end — so tapping into the middle of a
// long note and typing/backspacing edits right there, like a real text field.
function caret() {
  const el = inputEl.value;
  const len = draft.value.length;
  return { start: el?.selectionStart ?? len, end: el?.selectionEnd ?? len };
}
function placeCaretAt(pos) {
  nextTick(() => inputEl.value?.setSelectionRange(pos, pos));
}
function insertAtCaret(text) {
  const { start, end } = caret();
  draft.value = draft.value.slice(0, start) + text + draft.value.slice(end);
  placeCaretAt(start + text.length);
}

function type(key) {
  const ch = !numeric.value && shift.value ? key.toUpperCase() : key;
  insertAtCaret(ch);
  shift.value = false; // one-shot shift, like a phone keyboard
}
function backspace() {
  const { start, end } = caret();
  if (start === end) {
    if (start === 0) return;
    draft.value = draft.value.slice(0, start - 1) + draft.value.slice(end);
    placeCaretAt(start - 1);
  } else {
    draft.value = draft.value.slice(0, start) + draft.value.slice(end);
    placeCaretAt(start);
  }
}
function space() { insertAtCaret(' '); }
function newline() { insertAtCaret('\n'); }
function confirm() { resolveTextField(draft.value.trim()); }
function cancel() { resolveTextField(null); }

// Existing values that match what's been typed so far (case-insensitive), so the
// user can tap one instead of re-typing — keeps roaster/origin/etc. consistent.
const suggestions = computed(() => {
  const all = textFieldState.suggestions || [];
  if (!all.length) return [];
  const q = draft.value.trim().toLowerCase();
  const seen = new Set();
  const out = [];
  for (const s of all) {
    const val = String(s || '').trim();
    if (!val) continue;
    const low = val.toLowerCase();
    if (low === q) continue;          // don't suggest the exact current value
    if (q && !low.includes(q)) continue;
    if (seen.has(low)) continue;
    seen.add(low);
    out.push(val);
    if (out.length >= 8) break;
  }
  return out;
});
// Tapping a suggestion IS the answer — fill and confirm in one tap.
function pickSuggestion(s) { resolveTextField(s); }
</script>

<template>
  <div v-if="textFieldState.open" class="scrim" @click.self="cancel">
    <div class="modal kb-modal">
      <span class="m-title">{{ textFieldState.title }}</span>
      <textarea
        v-if="textFieldState.multiline"
        ref="inputEl"
        v-model="draft"
        :placeholder="textFieldState.placeholder"
        class="text-field-input text-field-textarea"
        inputmode="none"
      ></textarea>
      <input
        v-else
        ref="inputEl"
        v-model="draft"
        :type="textFieldState.type"
        :placeholder="textFieldState.placeholder"
        class="text-field-input"
        inputmode="none"
        @keyup.enter="confirm"
      />

      <div v-if="suggestions.length" class="tf-suggests">
        <button
          v-for="s in suggestions"
          :key="s"
          class="tf-suggest"
          @mousedown.prevent
          @click="pickSuggestion(s)"
        >{{ s }}</button>
      </div>

      <!-- @mousedown.prevent on every key keeps focus on the <input>: without it,
           tapping a key blurs the field, the kiosk browser resets selectionStart
           to 0, and every character gets inserted at index 0 (text appears
           reversed / right-to-left). Preventing the default mousedown focus shift
           leaves the caret where it was. -->
      <div class="kb">
        <div v-for="(row, i) in (numeric ? SYMBOLS : LETTERS)" :key="i" class="kb-row">
          <button
            v-if="i === 2"
            class="kb-key kb-wide"
            :class="{ on: shift }"
            :disabled="numeric"
            @mousedown.prevent
            @click="shift = !shift"
          >⇧</button>
          <button v-for="k in row" :key="k" class="kb-key" @mousedown.prevent @click="type(k)">
            {{ !numeric && shift ? k.toUpperCase() : k }}
          </button>
          <button v-if="i === 2" class="kb-key kb-wide" @mousedown.prevent @click="backspace">⌫</button>
        </div>
        <div class="kb-row">
          <button class="kb-key kb-wide" @mousedown.prevent @click="numeric = !numeric">{{ numeric ? 'ABC' : '123' }}</button>
          <button class="kb-key kb-space" @mousedown.prevent @click="space">{{ t('common.space') }}</button>
          <button v-if="textFieldState.multiline" class="kb-key kb-wide" @mousedown.prevent @click="newline">↵</button>
        </div>
      </div>

      <div class="modal-actions">
        <button class="cancel" @click="cancel">{{ t('common.cancel') }}</button>
        <button class="confirm" @click="confirm">{{ t('common.confirm') }}</button>
      </div>
    </div>
  </div>
</template>
