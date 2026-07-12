/**
 * Imperative modal API backed by a single shared instance mounted once in
 * App.vue (see WheelPicker.vue) — callers just `await openWheel({...})` from
 * anywhere without managing their own modal component instance. More modal
 * kinds (chooser, keyboard, confirm) get added here as the phases that need
 * them arrive, following the same shape.
 */
import { reactive } from 'vue';

export const wheelState = reactive({
  open: false, title: '', unit: '', values: [], current: null, _resolve: null,
});

/**
 * @param {{ title: string, unit?: string, values: string[], current: string|number }} opts
 * @returns {Promise<string|null>} the confirmed value, or null if cancelled
 */
export function openWheel({ title, unit = '', values, current }) {
  return new Promise((resolve) => {
    wheelState.title = title;
    wheelState.unit = unit;
    wheelState.values = values;
    wheelState.current = String(current);
    wheelState._resolve = resolve;
    wheelState.open = true;
  });
}

export function resolveWheel(value) {
  wheelState.open = false;
  wheelState._resolve?.(value);
  wheelState._resolve = null;
}

/**
 * A single native <input> in the shared modal chrome — used for bean fields
 * and search. Kiosk browsers (Chrome OS/Android WebView) show their own
 * on-screen keyboard for a focused text input, so this needs no custom
 * QWERTY component of its own; a native input is the simpler correct choice,
 * the same reasoning RoastDatePicker.vue already applied to its date input.
 */
export const textFieldState = reactive({
  open: false, title: '', value: '', type: 'text', placeholder: '', _resolve: null,
});

/**
 * @param {{ title: string, value?: string, type?: 'text'|'number', placeholder?: string }} opts
 * @returns {Promise<string|null>} the confirmed (trimmed) value, or null if cancelled
 */
export function openTextField({ title, value = '', type = 'text', placeholder = '' }) {
  return new Promise((resolve) => {
    textFieldState.title = title;
    textFieldState.value = value;
    textFieldState.type = type;
    textFieldState.placeholder = placeholder;
    textFieldState._resolve = resolve;
    textFieldState.open = true;
  });
}

export function resolveTextField(value) {
  textFieldState.open = false;
  textFieldState._resolve?.(value);
  textFieldState._resolve = null;
}

/** A short list of discrete, labeled options (enums) — distinct from the
 * continuous scroll of WheelPicker. Used by Settings rows like charging mode
 * or log level. */
export const chooserState = reactive({
  open: false, title: '', options: [], current: null, _resolve: null,
});

/**
 * @param {{ title: string, options: Array<[value: string, label: string]>, current: string }} opts
 * @returns {Promise<string|null>} the picked value, or null if cancelled
 */
export function openChooser({ title, options, current }) {
  return new Promise((resolve) => {
    chooserState.title = title;
    chooserState.options = options;
    chooserState.current = current;
    chooserState._resolve = resolve;
    chooserState.open = true;
  });
}

export function resolveChooser(value) {
  chooserState.open = false;
  chooserState._resolve?.(value);
  chooserState._resolve = null;
}
