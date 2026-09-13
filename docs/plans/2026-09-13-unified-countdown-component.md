# Unified Countdown Component Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Provide one reusable countdown component with visual and behavior variants for rest, plank, stretch, walk, and future timed activities, while preventing malformed history data from crashing the app.

**Architecture:** Keep countdown state transitions in `js/workout/timers.js` and activity persistence in `js/render-activity.js`. Add a renderer-level countdown component that owns shared timer markup and binding, with variants supplied as data attributes/classes. Normalize history arrays at the storage boundary and make list rendering defensive without changing the v2 schema.

**Tech Stack:** Dependency-free browser ES modules, HTML/CSS, Node’s built-in test runner, Playwright when available.

---

### Task 1: Add failing component and regression tests

**Files:**

- Create: `tests/countdown.test.mjs`
- Modify: `tests/backup.test.mjs` or `tests/rendering.test.mjs` only if a focused history regression test can use existing pure boundaries

**Steps:**

1. Test countdown markup variants expose the same timer semantics and variant class/data attribute.
2. Test activity definitions expose a timed walk configuration and a non-timed check-in configuration.
3. Test malformed persisted history is rejected or normalized before render-facing state is returned.
4. Run `node --test tests/countdown.test.mjs` and confirm the new assertions fail for the missing shared component/configuration.

### Task 2: Implement the shared countdown component

**Files:**

- Create: `js/render-workout/countdown.js`
- Modify: `js/render-workout/rest.js`
- Modify: `js/render-workout/plank.js`
- Modify: `js/render-workout/stretch.js`
- Modify: `js/workout.js`

**Steps:**

1. Add pure `countdownMarkup({ id, remainingMs, label, variant })` using the existing `formatDuration` and safe escaping.
2. Add `bindCountdown({ element, key, phase, onEnd })` as the single renderer binding adapter to the existing domain countdown loop.
3. Replace duplicated timer markup and binding calls in rest, plank, and stretch with the shared component, preserving each phase’s actions and transitions.
4. Run the focused countdown tests and the workout tests.

### Task 3: Use the component for timed health activities

**Files:**

- Modify: `js/render-activity.js`
- Modify: `js/render-workout/countdown.js`
- Modify: `styles.css`

**Steps:**

1. Give walk, run, cycle, and move explicit durations and use a session-scoped end timestamp so reloads during an activity resume.
2. Render timed activities with the shared countdown component and a finish action; keep measurement and rest activities non-timed.
3. Persist the completed activity only once when the timer finishes or the user finishes early, clearing the session timestamp.
4. Add shared variant styles that preserve the watch-first layout, readable metrics, focus states, reduced motion, and no horizontal overflow.
5. Run focused tests and syntax/lint checks.

### Task 4: Harden history rendering at the persistence boundary

**Files:**

- Modify: `js/storage.js`
- Modify: `js/backup.js`
- Modify: `js/dom.js`
- Modify: `js/render-history.js`

**Steps:**

1. Ensure migrated and validated state always has an array for history before `.forEach`, `.map`, and `listMarkup` consumers run.
2. Keep invalid backup rejection behavior while making the generic list helper fail safe for non-array input.
3. Add a clear empty history fallback so `/history/` cannot fail with `items.join is not a function`.
4. Run all tests and inspect the diff for schema or migration changes.

### Task 5: Validate and deliver

**Files:**

- No additional source files.

**Steps:**

1. Run `npm run check`, `git diff --check`, and the required JavaScript syntax checks.
2. Serve the app on port 4173 and smoke-test `/`, `/routine/`, `/history/`, `/workout/`, and timed activity routes.
3. Validate 225×225, smaller watch, and phone viewports with keyboard focus and reduced-motion settings where browser tooling is available; report unavailable device evidence.
4. Review `git diff` and commit explicitly scoped files. Do not push without explicit user authorization.
