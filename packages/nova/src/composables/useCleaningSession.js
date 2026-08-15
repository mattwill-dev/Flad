/**
 * Marks "a forward-flush cleaning cycle is loaded/running" so useLiveShot.js
 * can suppress the normal espresso graph + post-shot pipeline while the
 * machine is running the flush profile in `espresso` state instead of a real
 * coffee shot. Deliberately import-free (just `vue`) so useLiveShot.js can
 * import it with no risk of a cycle back through useMachineFunctions.js.
 */
import { reactive } from 'vue';

export const flushSession = reactive({ active: false, profile: null });
