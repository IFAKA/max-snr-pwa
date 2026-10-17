# Repository Guidelines

## Architecture

This is an offline-first, on-device PWA built with SvelteKit 3 (Svelte 5 runes) and TypeScript, prerendered to static files by `@sveltejs/adapter-static` into `build/`. There is no server and no network dependency after install: all data lives on the device in IndexedDB with a localStorage fallback. Routes are `src/routes/` (`/`, `/routine/`, `/history/`, `/workout/`); `+layout.ts` sets `ssr = false`, `prerender = true`, `trailingSlash = 'always'` and loads state once per document. `src/styles/app.css` owns presentation, `static/` owns icons and `manifest.webmanifest`, and `vite.config.ts` holds the SvelteKit and Vitest configuration.

The service worker is a classic script at `/sw.js`, generated after `vite build` by `scripts/build-sw.mjs` from `scripts/sw-template.js`: it precaches every built file under a content-hashed `CACHE_NAME` and serves cache-first. It must stay a classic worker at `/sw.js` (installed phones registered that URL and type), keep the `SKIP_WAITING` message the History "Check for Updates" action sends, and never touch IndexedDB or localStorage. SvelteKit's own worker registration is disabled.

The dependency direction is one way: types/constants/state/storage → workout domain → screens → routes. Domain code is framework-free TypeScript: `src/lib/types.ts` (state schema), `constants.ts`, `state.ts` (in-memory state), `storage/` (`persistence.ts` IndexedDB + `maxsnr` fallback, `migrate.ts` legacy migration, `backup.ts` import validation), `routine/routine-data.ts` (routines and names), and `health/` (activity definitions, measurements). Workout rules live in `src/lib/workout/`: `task-factory.ts`, `session.ts` (start, traversal, selection), `sets.ts` (log/substitute/undo), `superset.ts`, `timers.ts`, `budget.ts`, `finish.ts` (save, finish early, reopen, cancel), `progression.ts`, `summary.ts`, `calendar.ts`, and the training model `exercises.ts` (catalogue), `optimizer.ts`, `program.ts` (fixed programs, prescriptions), `personalization.ts`, `adaptation.ts`, `coordinator.ts`, `health-optimizer.ts`, `metrics.ts`, `optimizer-analysis.ts`. `src/lib/workout/index.ts` is the public facade; screens import workout behavior only from it.

Presentation is Svelte components. `src/lib/components/` holds the shared semantic UI (`AppList`, `ListRow`, `ListHeading`, `Title`, `Icon`, `ConfirmDialog` on native `<dialog>`, `SwitchRow` (on/off settings), `Countdown`, `WorkoutStage`, `ErrorNotice`). Screens are grouped by product area: `today/`, `routine/`, `history/` (including `Analytics` at `/history/?view=analytics`), and `workout-screens/` (`WorkoutScreen` dispatches via the pure `workout-view.ts`; `WorkoutGuard` owns back/Escape and the cancel dialog; `Completion` is the saved-workout summary at `/workout/?view=summary&id=…`; `Lifting` logs a set in one tap and `ValuePicker` at `?pick=…` changes one value). `src/lib/browser/` holds browser edges: device APIs (wake lock), workout cues (`feedback.ts` sound + vibration, `sound.ts` Web Audio synthesis), route parents and deep-link history repair, view transitions, the update flow, and Svelte actions for long-text panning and the magnetic picker. `src/lib/app-state.svelte.ts` bridges domain state to Svelte: domain functions mutate and persist the plain state, and `act()` runs an action, reports errors, and bumps a version that screens derive from. The long-press list picker is a standalone package in `packages/magnetic-picker/` imported as `#picker/magnetic-picker.js`.

Change routine data in `src/lib/routine/routine-data.ts` or `src/lib/workout/program.ts`; persistence or compatibility in `src/lib/storage/`; workout rules in `src/lib/workout/`; and user-visible workout markup/events in `src/lib/workout-screens/`. Keep domain modules independent of presentation and use explicit outcomes (return values) for navigation/rendering.

## Apple Watch–First Product/UI Rules

Follow Apple’s primary references before changing UI: [Designing for watchOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-watchos/), [Scroll views](https://developer.apple.com/design/human-interface-guidelines/scroll-views/), [Digital Crown](https://developer.apple.com/design/human-interface-guidelines/digital-crown/), [Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures/), and [Page controls](https://developer.apple.com/design/human-interface-guidelines/page-controls/).

- Treat representative Apple Watch-sized widths as the primary design target; use phone layouts as an expansion of the same flow, never as the source layout to shrink.
- Design each watch screen for one focused purpose: one primary metric or action, concise copy, shallow hierarchy, and no requirement to fit secondary content in the first viewport.
- Use full-screen-height vertical scrolling or vertical paging for additional content. Let the Digital Crown/native scroll behavior work; do not create horizontal phone-style tab bars, nested same-axis scrollers, fake swipe navigation, or custom gesture systems without a documented HIG reason.
- Keep primary actions obvious and nondestructive. Avoid assigning a primary action to list/scroll views where it conflicts with watchOS double-tap behavior. Secondary actions belong in a shallow native disclosure or a dedicated next screen with a clear return path.
- Use large visible metrics, readable labels, and explicit native controls. Every essential touch target must be at least 44px tall; never solve overflow by making text, buttons, labels, or hit areas tiny.
- Keep content inside the watch canvas with no horizontal overflow or clipped controls. It is acceptable—and preferred—for long lists/details to scroll vertically rather than be cramped into one screen.
- Reuse the same semantic components and interaction contracts across Today, Routine, History, workout setup, warmup, plank, lifting, rest, stretch, completion, navigation, disclosures, steppers, timers, import/export, and error states.
- Documented gesture exception: on the lifting screen a set value (reps, load, RIR) can also be held and dragged vertically like a Digital Crown wheel (dragging up raises it) (`browser/value-scrub.ts`, `ScrubWheel`). It only shortcuts the existing tap-to-open picker, which and the keyboard path stay unchanged; the buttons use `touch-action: none`.
- Prefer native vertical scroll snap over new gestures when a step has secondary content: primary stage first, secondary actions on the next page (see `docs/plans/2026-10-17-gesture-simplification.md`). Horizontal swipe to skip, go back or delete is not allowed.
- Documented gesture exception: on the exercise-selection, lifting, rest, plank, stretch and timed/metric activity screens the whole screen is a card (`components/SwipeCard.svelte`, `browser/swipe-log.ts`): drag left (toward the right thumb's palm) past 40% of its width, or flick, to confirm the primary action (Log set, Skip Rest, Finish), on Rest and Stretch drag right for Undo Last Set or Restart, and drag up past 25% of the height (or flick) to open the exercise list where an exercise can still be changed. Up opens the existing full-screen list, not a drawer or sheet; the card only takes vertical drags when its content fits the screen, so a taller stage still scrolls natively. It only shortcuts the buttons' own clicks, which and the keyboard path stay unchanged. Vertical drags remain native scrolling (`touch-action: pan-y`), touches starting within 24px of a screen edge are ignored (Android back), the set values opt out with `data-no-swipe` so the value wheel keeps its drag, the card follows the finger while for confirms that cannot be undone (Skip Rest, Finish, Continue) an icon-only circle fills a progress ring and, at the threshold, turns solid with a haptic pulse as the cue to let go, while undoable actions (Log set, Undo, opening the exercise list) act on a light 20% swipe with no ring or haptic (sideways ones still show the icon circle), and every action keeps its button (on countdown steps the buttons sit on a second scroll page under a "Swipe → …" hint). HIG basis: confirm-by-slide as in Apple's own controls, with the action reversible.
- Documented drawer exception: the exercise list (`?view=exercises`) is a bottom drawer (`components/Drawer.svelte`, built on `vaul-svelte`) over the screen it was opened from. Dragging that screen up shows the drawer rising under the finger (`components/DrawerPeek.svelte`, `browser/drawer-peek.svelte.ts`) and opens it on release past 20% (otherwise it drops back); tapping the exercise name opens it too. It closes by dragging it down, tapping the backdrop, Escape or back, always sliding out first; `history.back()` runs after the slide. It is the only drawer; confirmations still use the native `ConfirmDialog`.
- Component libraries: prefer existing headless Svelte components over hand-built ones. `vaul-svelte` provides the drawer and `bits-ui` (Svelte's Base UI equivalent) the switch (`SwitchRow`); `@internationalized/date` is bits-ui's peer. Native `<dialog>` stays for confirmations (it is the platform primitive and the acceptance criteria require native dialogs). Keep custom only what neither library has: the magnetic picker, value wheel, swipe card, countdown, list rows.
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

Preserve state schema `version: 2` with `history` and `active`. Preserve IndexedDB database/object-store names (`maxsnr-workout` / `state`), the `maxsnr` localStorage fallback, and legacy migration behavior (queue-format workouts, plank → lifting, and saving a workout left on the old `complete` review step). Keep route paths trailing-slash-compatible (`/workout/`, `/history/`). Workout ids are strictly increasing because summaries and Reopen look workouts up by id; history detail still uses the list index (`/history/?view=workout&id=0`).

`sw.js` is generated into `build/` on every `npm run build`; never commit or hand-edit it. Keep IndexedDB/localStorage persistence and legacy migration behavior intact. Vercel builds with `vercel.json` (`npm run build`, output `build/`).

## Product psychology acceptance criteria

These come from the product-psychology review (B=MAP, B.I.A.S., Peak-End, Regret and Black Mirror tests) and are covered by tests. A change that breaks one is not ready.

- Finishing never loses work: finishing the cooldown or "Finish Early" saves to history immediately, and the completion screen offers "Reopen Workout" as the undo. There is no unsaved review step.
- Safe defaults: every confirmation focuses the nondestructive choice ("Keep Working Out", "Keep Current Workout", "Keep Current Data", or "Start" when nothing is replaced). Destructive choices use the `destructive` style and say what they discard.
- Honest copy: dialogs state what each choice does (cancel discards; finish early saves the logged sets).
- Native dialogs only: no bottom sheets, drag handles, or custom dismiss gestures.
- Celebrate at the peak: the completion screen shows the gains next to the celebration; reduced motion disables the confetti.
- Neutral progress: weekly progress counts what was done and never frames a missed day as a loss; no streaks, guilt copy, or notifications by default.
- No overtraining pressure: progression adds load only after every prescribed set reached the top of the range at the target effort; skipped, missing, short, or to-failure sets repeat the load.
- Local and private: no accounts, analytics, ads, or network calls with user data.

## Architecture quality rules

- Keep the dependency direction one way: types/constants/state/storage → workout domain → screens → routes. Domain modules must not import Svelte, `$app/*`, components, screens, or `src/lib/browser/`.
- Organize code by product domain and user-facing capability. Prefer `workout/`, `routine/`, `history/`, and `storage/` over generic `utils/`, `helpers/`, or `misc/` folders.
- Keep domain functions pure when possible. Do not mutate function arguments; keep DOM, storage, timers, navigation, and other browser side effects at the edges.
- Use one shared semantic UI system for all viewport sizes. Structure new UI as semantic atoms, molecules, organisms, templates, and pages without duplicating watch and phone markup.
- Keep source files under 400 lines and functions under 200 lines. Split oversized files by responsibility.
- ESLint (with `eslint-plugin-svelte` and `typescript-eslint`), `svelte-check`, and `npm run architecture` enforce unused code, types, complexity, parameter immutability, file/function size, folder naming, the domain boundary, and the workout facade. Prettier owns formatting; the pre-commit hook runs the complete check suite.

## Validation and delivery

Run `npm run check`: lint, architecture, format check, `svelte-check` (warnings fail), Vitest (`tests/`) plus the picker package's `node --test` suite, `npm run build` (which also generates `build/sw.js`), and the Playwright suite (`e2e/`) against the built site at 225×225, 192×192, and phone size. Playwright covers the watch UI readiness gate on every screen (overflow, 44px targets, names, focus, dark mode, reduced motion, 200% zoom), start/resume, refresh during rest, back/Escape guarding, auto-save and Reopen, legacy migration, import/export, IndexedDB names, and offline loading. For manual checks run `npm run build` and `python3 -m http.server 4173 --directory build` (`vite preview` does not serve `/sw.js`); `npm run dev` is fine for UI work without the worker. When the service worker changes, also verify that an installed previous version updates in place through History → "Check for Updates" and keeps its data. Clear site storage between scenarios. If Chromium or a real device is unavailable, explicitly mark the visual/device gate as not passed.

After validation succeeds, commit the requested changes and push the current branch; pushing already triggers deployment, so do not run a separate deployment command. Do not push with failing validation. Use two-space indentation, semicolon-terminated TypeScript, concise camelCase names, and uppercase constants. Svelte escapes text by default; use `{@html}` only for static trusted markup (the icon paths).

After finishing and validating any requested change, commit it and push the current branch to its configured remote. Never force-push; report the commit and push result.
