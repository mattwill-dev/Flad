/**
 * Reactive phone-vs-tablet layout switch. Nova's tablet shell (App.vue's
 * `.stage`) is hard-wired to the DE1's fixed ~1009x630 landscape screen (see
 * app.css's target-screen note) — it has no breakpoints of its own. On a
 * narrow viewport (a phone opening Nova as a remote companion) that shell is
 * unusable, so App.vue swaps it for MobileShell.vue based on `isPhone` here.
 *
 * Breakpoint matches Beanie's (github.com/giladger/Beanie): width alone
 * catches portrait phones, the second clause catches a phone held in
 * landscape (short but not wide) so it still gets the phone shell instead of
 * a cramped tablet layout.
 */
import { ref } from 'vue';

const PHONE_MEDIA_QUERY = '(max-width: 640px), (max-height: 500px) and (max-width: 900px)';

const media = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia(PHONE_MEDIA_QUERY)
  : null;

export const isPhone = ref(media?.matches ?? false);

media?.addEventListener('change', (e) => { isPhone.value = e.matches; });
