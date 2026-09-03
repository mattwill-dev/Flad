# Skin Viewer

Side-by-side comparison tool for Flad against other Decaid (Decent.app /
reaprime) skins. Every pane talks to the same mock gateway, so they're
rendering identical live data — a fair visual comparison, not two different
shots.

Decaid itself only ever serves one skin at a time (switching the installed
default requires a server restart), so this doesn't touch a real Decaid
install at all — it's a purely local, throwaway dev setup: each skin gets
its own tiny static file server, all pointed at the same mock gateway.

## The 7 skins Decaid ships with

Sourced from Decaid's own `skin_sources.json` (the manifest it uses to
auto-download bundled skins), not guessed:

| Skin | Repo | Build step needed? |
|---|---|---|
| Insight | `decentespresso/insight-js` | No — plain static bundle |
| Streamline | `allofmeng/streamline_project` | No — ships pre-built `src/css/app.css` |
| NSX | `NilsBruch/NSX` | No — but nested (`packages/nsx/src`) + one `sync-core` run |
| Passione | `tadelv/passione` | Yes — Vite (`npm run build`) |
| OverDose | `rotium/OverDose` | Yes — Vite/TS, see gotcha below |
| Beanie | `giladger/Beanie` | Yes — Vite/TS (`npm run build`) |
| WorkFlow-Skin | `Sabotage1/WorkFlow-Skin` | No — repo ships a pre-built `workflow-skin.zip` |
| Bestpresso | `xinghendri/bestpresso` | Yes — Vite/React/TS (`npm run build`) |

Bestpresso isn't one of Decaid's 7 bundled skins — it's a separate community
skin added to this comparison tool on request. Same vendoring pattern as the
others below.

## Setup

1. **Start the mock gateway** (serves Flad on :8080 + the REST/WS API):
   ```bash
   npm run dev:mock
   ```

2. **Vendor in the skins to compare** — `tests/skin-viewer/skins/` is
   gitignored, these are other people's repos, not part of Flad:
   ```bash
   mkdir -p tests/skin-viewer/skins
   cd tests/skin-viewer/skins

   # No build step:
   git clone --depth 1 https://github.com/decentespresso/insight-js.git insight-js
   git clone --depth 1 https://github.com/allofmeng/streamline_project.git streamline
   git clone --depth 1 https://github.com/Sabotage1/WorkFlow-Skin.git _workflow-skin-src
   mkdir workflow-skin && unzip -oq _workflow-skin-src/workflow-skin.zip -d workflow-skin

   # NSX — monorepo, needs one sync-core run (no npm install required):
   git clone --depth 1 https://github.com/NilsBruch/NSX.git nsx
   (cd nsx && node scripts/sync-core.mjs)

   # Vite-built skins — install + build, then vendor the dist/ output:
   git clone --depth 1 https://github.com/tadelv/passione.git _passione-src
   (cd _passione-src && npm install && npm run build)
   cp -r _passione-src/dist passione

   git clone --depth 1 https://github.com/giladger/Beanie.git _beanie-src
   (cd _beanie-src && npm install && npm run build)
   cp -r _beanie-src/dist beanie

   git clone --depth 1 https://github.com/rotium/OverDose.git _overdose-src
   cd _overdose-src && npm install
   # See "OverDose build gotcha" below before running the build.

   # Bestpresso — community skin, not one of Decaid's bundled 7:
   git clone --depth 1 https://github.com/xinghendri/bestpresso.git _bestpresso-src
   (cd _bestpresso-src && npm install && npm run build)
   cp -r _bestpresso-src/dist bestpresso
   ```

   ### OverDose build gotcha
   Its `npm run build` script runs `tsc --noEmit` first, which fails on a
   real upstream bug: `src/components/maintenance/` has both
   `CleaningWizard.tsx` (the component) and `cleaningWizard.ts` (helpers) —
   names that differ only by case. On case-sensitive filesystems (Linux,
   what the authors build on) this is fine; on macOS's default
   case-insensitive filesystem, Rollup's bare-specifier resolution for
   `./CleaningWizard` in `src/App.tsx` lands on the lowercase file instead
   of the intended one and the build fails either way (tsc's own check, or
   a rollup "not exported" error if you skip tsc). Fix locally (don't touch
   the upstream repo) by making that one import explicit:
   ```bash
   sed -i '' "s|from './components/maintenance/CleaningWizard'|from './components/maintenance/CleaningWizard.tsx'|" src/App.tsx
   npx vite build   # skip the tsc gate entirely — it'll still flag the
                     # case-collision even after the fix above
   ```
   Then `cp -r dist ../overdose` from `tests/skin-viewer/skins/`.

3. **Serve each** on its own port — these match `compare.html`'s presets:
   ```bash
   node tests/skin-viewer/serve-static.mjs tests/skin-viewer/skins/insight-js 5173
   node tests/skin-viewer/serve-static.mjs tests/skin-viewer/skins/streamline 5174
   node tests/skin-viewer/serve-static.mjs tests/skin-viewer/skins/nsx/packages/nsx/src 5175
   node tests/skin-viewer/serve-static.mjs tests/skin-viewer/skins/passione 5176
   node tests/skin-viewer/serve-static.mjs tests/skin-viewer/skins/overdose 5177
   node tests/skin-viewer/serve-static.mjs tests/skin-viewer/skins/beanie 5178
   node tests/skin-viewer/serve-static.mjs tests/skin-viewer/skins/workflow-skin 5179
   node tests/skin-viewer/serve-static.mjs tests/skin-viewer/skins/bestpresso 5180
   ```
   `serve-static.mjs` is generic — point it at any other vendored skin
   directory + port the same way, and add a preset for it in `compare.html`.

4. **Open the comparison page**: `tests/skin-viewer/compare.html` (just
   double-click it, or `open tests/skin-viewer/compare.html`). No server
   needed for this one — it's a static file with iframes.

Each pane has a preset dropdown, a URL bar, and a remove button; "+ Add
pane" adds more. Pane URLs persist in localStorage, so your layout survives
a reload — switch a pane's dropdown any time to swap what it's showing.

## Known gaps against this mock gateway

Every skin here talks to the same trimmed-down mock (built to match Flad's
own needs), not the full official reaprime API surface, so a couple of the
richer skins hit endpoints/WS channels the mock doesn't implement and show
a partial error inline (Streamline: "Error loading profile" — missing
`/api/v1/devices`, `/api/v1/settings`, a couple of WS channels; WorkFlow-Skin:
a visible `GET /api/v1/workflow failed` banner on its Brew page). Both
degrade gracefully — the rest of the UI still renders — so this only
matters if you need those specific views working live, not for general
visual/design comparison. NSX and Insight-js have no such gaps since they
were built against (or match) this same trimmed API shape.

## Why cross-origin works

The mock gateway (`tests/mock-gateway/server.mjs`) sends permissive CORS
headers, mirroring the real gateway — insight-js's own README documents
running it on a different port than the gateway during dev, so this is the
same supported pattern, not a workaround.

## Adding more skins

Any Decaid-compatible skin (a bundle with `index.html` at its root once
built, talks to `:8080/api/v1` + `:8080/ws/v1`) works the same way: clone
it (and build it, if it needs one — check for a `package.json` with a
`build` script) into `tests/skin-viewer/skins/`, serve the built output on
its own port with `serve-static.mjs`, and add a preset (or just paste the
URL into a pane) in `compare.html`. Skins built for the legacy Tcl-based
de1app (not Decaid/reaprime — most of what turns up in a generic GitHub
search, e.g. DSx, DSx2, MimojaCafe) aren't web apps and can't be loaded
this way.
