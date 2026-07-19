import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SKIN_ID = process.env.VITE_SKIN_ID || 'Nova-skin';
const APP_VERSION = process.env.VITE_APP_VERSION || '0.1';

/**
 * Emits the Decent skin manifest into the build output. The Decent app reads
 * manifest.json from the package root — it is not a PWA manifest, so it is
 * generated rather than linked from index.html.
 */
function skinManifest() {
  let outDir = 'dist';
  return {
    name: 'nova-skin-manifest',
    configResolved(cfg) { outDir = cfg.build.outDir; },
    closeBundle() {
      const manifest = {
        id: SKIN_ID,
        name: 'Nova',
        description: 'Skin for Decent.app',
        version: APP_VERSION,
        author: 'Nils',
        repository: process.env.VITE_REPOSITORY || '',
      };
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    },
  };
}

export default defineConfig({
  // Relative asset paths: the Decent app may serve the skin from a sub-path.
  base: './',
  // viteSingleFile inlines the JS + CSS straight into index.html, so the build
  // is ONE self-contained file (plus manifest.json). The Decent app's built-in
  // web server serves the skin folder, and shipping separate hashed assets/*.js
  // proved fragile there — a stale/partial install left index.html pointing at
  // a chunk the server never served, white-screening the tablet with a module
  // "loading failed". A single file has no cross-file hash to mismatch and no
  // extra request to 404, matching how the vanilla NSX skin stays self-contained.
  plugins: [vue(), viteSingleFile(), skinManifest()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __SKIN_ID__: JSON.stringify(SKIN_ID),
  },
  server: {
    port: 5173,
    // No API proxy on purpose: the shared core (core/config.js) builds absolute
    // gateway URLs (http://<hostname>:8080) and opens its own WebSockets, so it
    // talks to the gateway directly. The mock gateway sends permissive CORS
    // headers in dev to allow that cross-origin call from this dev server.
  },
});
