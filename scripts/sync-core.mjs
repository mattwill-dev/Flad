// Dev helper: copy the shared core into the Flad skin's served root so the
// Decent app (which serves packages/flad/src as the web root) can load it at /core/.
// The release workflow does the same flattening when assembling the ZIP.
import { cpSync, mkdirSync } from 'node:fs';

const SRC = 'packages/core/src';
const DST = 'packages/flad/src/core';

mkdirSync(DST, { recursive: true });
cpSync(SRC, DST, { recursive: true });
console.log(`Synced ${SRC} -> ${DST}`);
