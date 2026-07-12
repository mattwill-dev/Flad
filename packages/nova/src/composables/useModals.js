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
