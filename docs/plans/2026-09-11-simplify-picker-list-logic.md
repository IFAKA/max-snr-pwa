# Simplify Picker and List Logic Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement the plan task-by-task.

**Goal:** Reduce duplication and incidental complexity in picker/list binding while preserving picker gestures, keyboard cancellation, accessibility feedback, navigation clicks, list rendering, and all existing state behavior.

**Architecture:** Keep `packages/magnetic-picker/src/magnetic-picker.js` as the public dependency-free picker entry point and keep `js/dom.js` as the app adapter. Consolidate repeated row/selectability discovery and event listener registration behind small local helpers; preserve every exported calculation and option name used by the app or package tests. Do not change routes, storage, markup contracts, or CSS behavior.

**Tech Stack:** Browser-native ES modules, Node.js test runner, ESLint, Prettier, static HTTP server.

---

### Task 1: Establish the current picker/list baseline

**Files:**
- Inspect: `packages/magnetic-picker/src/magnetic-picker.js`
- Inspect: `js/dom.js`
- Inspect: `tests/magnetic-list.test.mjs`
- Inspect: `packages/magnetic-picker/tests/magnetic-picker.test.mjs`

**Step 1:** Run focused picker/list tests and the existing check suite.

**Step 2:** Record current test counts and identify any pre-existing failures before editing.

### Task 2: Consolidate picker internals

**Files:**
- Modify: `packages/magnetic-picker/src/magnetic-picker.js`

**Step 1:** Replace repeated row/selectability collection with one helper used on pointer start and picker activation.

**Step 2:** Replace duplicated listener add/remove code with a small event-map binder while keeping listener options and capture behavior unchanged.

**Step 3:** Normalize repeated numeric option values once per picker instance and use the normalized values in joystick math and CSS state.

**Step 4:** Simplify reset/joystick state transitions only where the existing tests demonstrate equivalent behavior; retain all public exports, callbacks, cancel-row lifecycle, pointer capture, and accessibility status updates.

**Step 5:** Run both picker test files and lint after the cohesive refactor.

### Task 3: Simplify the app list adapter without changing its contract

**Files:**
- Modify: `js/dom.js`

**Step 1:** Keep one shared picker option object for all `.app-list` elements and vary only the workout detent distance and disabled check.

**Step 2:** Preserve `.app-list` idempotent binding, text-only detents, skipped rows, disabled rows, click delegation, and hold-scroll/title-marquee behavior.

**Step 3:** Run focused list tests and formatting checks.

### Task 4: Verify routes and final behavior

**Files:**
- No additional files.

**Step 1:** Run `npm run check` and `git diff --check`.

**Step 2:** Serve the app on port 4173 and request `/`, `/routine/`, `/history/`, and `/workout/`.

**Step 3:** Review the final diff for preserved exports, route paths, persistence code, and no unrelated changes.

**Step 4:** Report browser/device validation evidence; if Chromium is unavailable, explicitly report the missing watch-width visual gate.
