# Repository Guidelines

## Architecture

This is a dependency-free static PWA using browser-native ES modules. HTML shells live at `index.html`, `routine/`, `history/`, and `workout/`; `styles.css` owns presentation, `icons/` owns artwork, `manifest.webmanifest` owns install metadata, and `sw.js` owns offline caching.

The JavaScript dependency direction is one way: data/constants/state/storage → workout domain → renderers → `app.js` routing. `js/routine-data.js` defines routines and names. `js/constants.js` defines shared constants and storage identifiers. `js/state.js` owns the in-memory state. `js/storage.js` owns IndexedDB, the `maxsnr` localStorage fallback, and legacy migration. `js/dom.js` contains small browser helpers.

Workout behavior is split by responsibility under `js/workout/`: `task-factory.js` creates and flattens tasks, `session.js` handles progression and persistence-triggering state transitions, `timers.js` handles timer state transitions, and `progression.js` reads historical performance and suggestions. `js/workout.js` is the public facade for supported workout actions; it must not import renderers. Workout presentation is split under `js/render-workout/` into `shared.js`, `warmup.js`, `plank.js`, `lifting.js`, `rest.js`, `stretch.js`, and `completion.js`, with `js/render-workout.js` as the phase dispatcher. Today, routine, and history screens are `js/render-today.js`, `js/render-routine.js`, and `js/render-history.js`.

Change routine data in `js/routine-data.js`; persistence or compatibility in `js/storage.js`; workout rules in `js/workout/`; and user-visible workout markup/events in `js/render-workout/`. Keep domain modules independent of presentation and use explicit outcomes for navigation/rendering.

## Apple Watch–First Product/UI Rules

- Treat representative Apple Watch-sized widths as the primary design target; phone layouts expand the same flow rather than introducing a separate interaction model.
- Prefer glanceable screens with one primary metric or action, shallow hierarchical navigation, vertical scrolling or paging, full-width capsule actions, and minimal simultaneous controls. On watch-sized screens, use a compact current-location header with a native disclosure menu; never use a clipped or persistent phone-style tab bar.
- In active workouts, do not use custom bottom sheets, drawers, or modal action overlays; use a shallow inline disclosure or a dedicated next screen with a clear return path.
- Use large, visible metrics and explicit touch controls such as steppers instead of keyboard-dependent fields for workout input. Keep every essential target at least 44px tall.
- Do not add phone-only navigation or dense desktop-style layouts without documenting an explicit exception.
- For UI changes, validate watch-sized and phone-sized viewports, large text/zoom, dark mode, reduced motion, keyboard and screen-reader labels, and offline behavior.

## Compatibility and routing

Preserve state schema `version: 2` with `history` and `active`. Preserve IndexedDB database/object-store names (`maxsnr-workout` / `state`), the `maxsnr` localStorage fallback, and legacy migration behavior. Keep route paths trailing-slash-compatible (`/workout/`, `/history/`). Do not split individual HTML fragments into files.

Any new module must be added to `sw.js` precache and the cache version must be incremented. Keep service-worker fallback/offline behavior intact.

## Validation and deployment

There is no build script or automated suite. Run `node --check app.js`, `node --check` for every JavaScript module, `git diff --check`, and serve locally with `python3 -m http.server 4173` to smoke test `/`, `/routine/`, `/history/`, and `/workout/`. Exercise start/resume, refresh during every workout phase, sets/supersets, defer/skip, cancellation, completion/history, import/export, migration, localStorage fallback, and service-worker precache. Clear site storage between scenarios. Use browser validation at mobile dimensions when Chromium is available.

After validation succeeds, deploy with `npx vercel --prod` and report the production URL. Do not deploy with failing validation. Use two-space indentation, semicolon-terminated JavaScript, concise camelCase names, uppercase constants, and `esc()` for user/history-derived HTML.

After finishing and validating any requested change, commit it and push the current branch to its configured remote. Never force-push; report the commit and push result.
