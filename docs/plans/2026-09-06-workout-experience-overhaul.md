# Workout Experience Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make MaxSNR's workout order, timers, persistence, substitution, history, imports, offline behavior, and mobile interface behave predictably and safely.

**Architecture:** Preserve the version 2 state and existing module dependency direction. Put queue/session rules in `js/workout/`, persistence and backup validation below renderers, and user interaction in the existing renderer modules. Add dependency-free Node tests for pure state transitions and validation.

**Tech Stack:** Browser-native ES modules, HTML, CSS, IndexedDB/localStorage, service workers, Node's built-in test runner.

---

### Task 1: Add regression tests for core behavior

**Files:**
- Create: `tests/workout.test.mjs`
- Create: `tests/backup.test.mjs`
- Modify: `package.json`

Write failing tests for sequential exercise ordering, superset alternation, timer formatting, skipped-set traversal, last-performance selection, and hostile backup rejection. Run `npm test` and confirm the targeted failures.

### Task 2: Correct task ordering and session actions

**Files:**
- Modify: `js/workout/task-factory.js`
- Modify: `js/workout/session.js`
- Modify: `js/workout.js`

Flatten ordinary exercises sequentially, preserve A/B superset rounds, keep equipment blocks together, and add explicit substitute, do-later, skip, and undo actions. Exclude skipped tasks from progression.

### Task 3: Make timers and persistence reliable

**Files:**
- Modify: `js/workout/timers.js`
- Modify: `js/storage.js`
- Modify: `js/state.js`

Format time from total seconds, advance expired phases, wait for IndexedDB transaction completion, reconcile fallback copies by timestamp, and propagate write failures to the UI.

### Task 4: Validate and safely render backups and history

**Files:**
- Create: `js/backup.js`
- Modify: `js/render-history.js`

Validate imported data, escape all rendered fields, confirm replacement/deletion, group sets by exercise, and support editing or deleting records.

### Task 5: Clarify and complete workout UI

**Files:**
- Modify: `js/render-workout/*.js`
- Modify: `js/render-routine.js`
- Modify: `js/render-today.js`
- Modify: `styles.css`

Expose warm-up guidance, optional accessory phases, visible RIR labels, group labels, explicit rest wording, alternatives, do-later/skip, undo, save status, useful Today summaries, and accessible native controls.

### Task 6: Harden offline behavior and identity

**Files:**
- Modify: `sw.js`
- Modify: `manifest.webmanifest`
- Modify: `index.html`
- Modify: `routine/index.html`
- Modify: `history/index.html`
- Modify: `workout/index.html`

Use MaxSNR consistently, increment the cache version, precache new runtime modules, cache only successful same-origin responses, and limit shell fallback to navigations.

### Task 7: Verify and deploy

Run `npm test`, `node --check` across runtime modules, `git diff --check`, route and service-worker smoke tests on port 4173, and mobile browser validation when Chromium is available. Deploy with `npx vercel --prod` only after all required validation succeeds.
