// Dev helper: copy the shared core into every skin so each skin can load it locally.
//
// Both skins consume the core the same way — as plain browser scripts that assign
// window.NSXCore / NSXApi / NSXConfig / NSXI18n:
//   - nsx  (vanilla, no build): <script src="core/…"> from the served root.
//   - nova (Vue + Vite):        side-effect `import`ed by src/main.js, bundled by Vite.
// Either way the destination is <package>/src/core, which is git-ignored and
// regenerated from packages/core/src — the single source of truth.
//
// The release workflows do the same copy when assembling their artifacts.
import { cpSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'packages/core/src';

// A "skin" is any package other than core itself that has a src/ directory.
const skins = readdirSync('packages', { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== 'core')
  .filter((e) => existsSync(join('packages', e.name, 'src')))
  .map((e) => e.name);

if (skins.length === 0) {
  console.warn('sync-core: no skins found under packages/*');
}

for (const skin of skins) {
  const dst = join('packages', skin, 'src', 'core');
  mkdirSync(dst, { recursive: true });
  cpSync(SRC, dst, { recursive: true });
  console.log(`Synced ${SRC} -> ${dst}`);
}
