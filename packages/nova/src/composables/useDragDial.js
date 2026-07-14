/**
 * Touch-drag-to-adjust for a dial/circle: press anywhere on it and pull up/down
 * to change the value directly, with no visible track — a hidden vertical
 * slider overlaid on the existing tap target. A plain tap (no meaningful
 * movement) still falls through to the caller's own click handler (e.g. opening
 * the number pad), exactly as before.
 *
 * `set(v)` is called on every pointermove purely to update the on-screen
 * number live — it must NOT itself push to the gateway. `onCommit(v)` fires
 * exactly once, on release, and is where the actual network write belongs.
 * A trailing debounce (calling the network setter on every move and waiting
 * for a quiet gap) was tried first and doesn't work: natural finger motion
 * isn't a perfectly steady stream of events, so a brief mid-drag pause opens
 * the gap and fires a push before the finger lifts.
 *
 * @param {{
 *   get: () => number,
 *   set: (v: number) => void,
 *   onCommit?: (v: number) => void,
 *   min: number, max: number,
 *   step?: number,          // rounding grain, default 1
 *   pxPerUnit?: number,      // drag distance (px) per 1 unit of value, default 4
 * }} opts
 * @returns {{ dragging: import('vue').Ref<boolean>, onPointerDown, onPointerMove, onPointerUp, guardClick: (fn: Function) => Function }}
 */
import { ref } from 'vue';

const MOVE_THRESHOLD_PX = 6; // below this, treat the gesture as a tap, not a drag

export function useDragDial({ get, set, onCommit, min, max, step = 1, pxPerUnit = 4 }) {
  const dragging = ref(false);
  let pointerId = null;
  let startY = 0;
  let startValue = 0;
  let moved = false;

  function clampRound(v) {
    const stepped = Math.round(v / step) * step;
    return Math.min(max, Math.max(min, stepped));
  }

  function onPointerDown(evt) {
    pointerId = evt.pointerId;
    startY = evt.clientY;
    startValue = get();
    moved = false;
    dragging.value = true;
    evt.currentTarget.setPointerCapture(pointerId);
  }

  function onPointerMove(evt) {
    if (!dragging.value || evt.pointerId !== pointerId) return;
    const deltaY = startY - evt.clientY; // up = positive = increase
    if (!moved && Math.abs(deltaY) >= MOVE_THRESHOLD_PX) moved = true;
    if (!moved) return;
    const next = clampRound(startValue + deltaY / pxPerUnit);
    if (next !== get()) set(next);
  }

  function onPointerUp(evt) {
    if (evt.pointerId === pointerId) {
      evt.currentTarget.releasePointerCapture(pointerId);
    }
    dragging.value = false;
    if (moved) onCommit?.(get());
  }

  /** Wrap a click handler so it's skipped when the pointer sequence that
   * preceded it was actually a drag, not a tap. */
  function guardClick(fn) {
    return (...args) => {
      if (moved) return;
      fn(...args);
    };
  }

  return { dragging, onPointerDown, onPointerMove, onPointerUp, guardClick };
}
