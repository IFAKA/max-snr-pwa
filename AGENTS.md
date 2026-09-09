# Repository Guidelines

## Architecture

This is a dependency-free static web app using browser-native ES modules. HTML shells live at `index.html`, `routine/`, `history/`, and `workout/`; `styles.css` owns presentation, `icons/` owns artwork, and `manifest.webmanifest` owns install metadata. Routine/workout state is persisted through IndexedDB with localStorage fallback; there is no runtime service-worker cache.

The JavaScript dependency direction is one way: data/constants/state/storage → workout domain → renderers → `app.js` routing. `js/routine-data.js` defines routines and names. `js/constants.js` defines shared constants and storage identifiers. `js/state.js` owns the in-memory state. `js/storage.js` owns IndexedDB, the `maxsnr` localStorage fallback, and legacy migration. `js/dom.js` contains small browser helpers.

Workout behavior is split by responsibility under `js/workout/`: `task-factory.js` creates and flattens tasks, `session.js` handles progression and persistence-triggering state transitions, `timers.js` handles timer state transitions, and `progression.js` reads historical performance and suggestions. `js/workout.js` is the public facade for supported workout actions; it must not import renderers. Workout presentation is split under `js/render-workout/` into `shared.js`, `warmup.js`, `plank.js`, `lifting.js`, `rest.js`, `stretch.js`, and `completion.js`, with `js/render-workout.js` as the phase dispatcher. Today, routine, and history screens are `js/render-today.js`, `js/render-routine.js`, and `js/render-history.js`.

Change routine data in `js/routine-data.js`; persistence or compatibility in `js/storage.js`; workout rules in `js/workout/`; and user-visible workout markup/events in `js/render-workout/`. Keep domain modules independent of presentation and use explicit outcomes for navigation/rendering.

## Apple Watch–First Product/UI Rules

Follow Apple’s primary references before changing UI: [Designing for watchOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-watchos/), [Scroll views](https://developer.apple.com/design/human-interface-guidelines/scroll-views/), [Digital Crown](https://developer.apple.com/design/human-interface-guidelines/digital-crown/), [Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures/), and [Page controls](https://developer.apple.com/design/human-interface-guidelines/page-controls/).

- Treat representative Apple Watch-sized widths as the primary design target; use phone layouts as an expansion of the same flow, never as the source layout to shrink.
- Design each watch screen for one focused purpose: one primary metric or action, concise copy, shallow hierarchy, and no requirement to fit secondary content in the first viewport.
- Use full-screen-height vertical scrolling or vertical paging for additional content. Let the Digital Crown/native scroll behavior work; do not create horizontal phone-style tab bars, nested same-axis scrollers, fake swipe navigation, or custom gesture systems without a documented HIG reason.
- Keep primary actions obvious and nondestructive. Avoid assigning a primary action to list/scroll views where it conflicts with watchOS double-tap behavior. Secondary actions belong in a shallow native disclosure or a dedicated next screen with a clear return path.
- Use large visible metrics, readable labels, and explicit native controls. Every essential touch target must be at least 44px tall; never solve overflow by making text, buttons, labels, or hit areas tiny.
- Keep content inside the watch canvas with no horizontal overflow or clipped controls. It is acceptable—and preferred—for long lists/details to scroll vertically rather than be cramped into one screen.
- Reuse the same semantic components and interaction contracts across Today, Routine, History, workout setup, warmup, plank, lifting, rest, stretch, completion, navigation, disclosures, steppers, timers, import/export, and error states.
- Do not add phone-only navigation, dense desktop-style layouts, bottom sheets, drawers, modal action overlays, or custom swipe gestures without documenting the exception and its HIG justification.
- For every UI change, validate representative watch widths (225×225 and a smaller watch width), phone width, 200% text/zoom, long labels, dark mode, reduced motion, keyboard focus, screen-reader names, touch targets, vertical scrolling/paging, timer refresh/resume behavior, and offline loading.

### Shared watch-and-phone flow contract

- Use one shared semantic DOM and one CSS system for smartwatch and phone. Start with the watch-sized canvas; phone layouts may add space but must not introduce a second navigation model or phone-only tab bar.
- Today is the landing view: show the current workout type as the title, followed by exactly two primary navigation actions, `Routine` and `History`.
- Routine is a list of days. Selecting a workout day opens a dedicated day view with that day’s title and an exercise list showing exercise name, sets, and reps. The `Start` action opens a native confirmation dialog before starting.
- Keep long content in a new view or a vertically scrolling list instead of forcing it into one viewport. History and Routine have explicit titles, and browser/native Android back must unwind detail → parent → Today.
- Prefer native links, buttons, `dialog`, and browser history for navigation and confirmation. Preserve the existing route paths and state schema while using query parameters for detail views.

### Watch UI readiness gate

A UI change is **not ready** unless all of these pass:

- No view has horizontal overflow, clipped controls, truncated essential copy, or a phone tab bar at watch width.
- Every view has a clear primary task/action and secondary content is scrollable, paged, disclosed, or moved to a dedicated screen.
- Every interactive element is reachable by keyboard, has a visible focus state, has an accessible name, and meets the 44px minimum target.
- All gestures are native or explicitly justified; no custom gesture interferes with scrolling, Digital Crown-like vertical navigation, double-tap primary-action expectations, or assistive technology.
- Shared components are reused across all equivalent views; no one-off watch-only markup is introduced without documenting why.
- Static checks, route smoke tests, and the relevant browser/device viewport checks pass. If browser/device validation is unavailable, report the missing evidence; do not claim the UI is ready.

## Compatibility and routing

Preserve state schema `version: 2` with `history` and `active`. Preserve IndexedDB database/object-store names (`maxsnr-workout` / `state`), the `maxsnr` localStorage fallback, and legacy migration behavior. Keep route paths trailing-slash-compatible (`/workout/`, `/history/`). Do not split individual HTML fragments into files.

Do not add service-worker caching or cache-version changes. Keep IndexedDB/localStorage persistence and legacy migration behavior intact.

## Validation and delivery

There is no build script or automated suite. Run `node --check app.js`, `node --check` for every JavaScript module, `git diff --check`, and serve locally with `python3 -m http.server 4173` to smoke test `/`, `/routine/`, `/history/`, and `/workout/`. Exercise start/resume, refresh during every workout phase, sets/supersets, defer/skip, cancellation, completion/history, import/export, migration, localStorage fallback, and the watch UI readiness gate above. Clear site storage between scenarios. Use browser validation at 225×225, a smaller watch width, and phone dimensions when Chromium is available; otherwise explicitly mark the visual/device gate as not passed.

After validation succeeds, commit the requested changes and push the current branch; pushing already triggers deployment, so do not run a separate deployment command. Do not push with failing validation. Use two-space indentation, semicolon-terminated JavaScript, concise camelCase names, uppercase constants, and `esc()` for user/history-derived HTML.

After finishing and validating any requested change, commit it and push the current branch to its configured remote. Never force-push; report the commit and push result.
