# Max-SNR Training System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the inherited routine with a transparent optimizer-generated, time-efficient two-day Max-SNR training system while preserving v2 user data and adding progression, health activity, and adaptive recommendations.

**Architecture:** Keep the existing static ES-module app and v2 state schema. Add a pure optimizer/catalog module that owns exercise metadata, candidate comparison, marginal-return allocation, and routine generation; extend the domain layer for progression, rolling adaptation, gym metrics, and health logs; keep renderers as the only presentation consumers. Existing history is migrated by additive defaults, never discarded.

**Tech Stack:** Browser-native ES modules, IndexedDB/localStorage persistence, Node’s built-in test runner, semantic HTML/CSS, Playwright smoke checks.

---

### Task 1: Establish evidence and optimizer contracts

**Files:**
- Create: `docs/evidence/max-snr-training.md`
- Create: `js/workout/optimizer.js`
- Test: `tests/optimizer.test.mjs`

Write the evidence/uncertainty record and pure tests for diminishing-return scoring, fractional indirect sets, 2/3/4-day comparison, and generated routine metadata before implementation.

### Task 2: Generate the new routine

**Files:**
- Modify: `js/routine-data.js`
- Modify: `js/workout/task-factory.js`
- Test: `tests/workout.test.mjs`

Replace the old routine definitions with optimizer output for the selected two-day full-body prescription. Preserve the existing template/flattening contract and include metadata on each task for target ranges, RIR, rest, superset safety, and muscle contributions.

### Task 3: Add progression and adaptive volume

**Files:**
- Modify: `js/workout/progression.js`
- Create: `js/workout/adaptation.js`
- Modify: `js/workout/session.js`
- Modify: `js/state.js`
- Modify: `js/storage.js`
- Modify: `js/backup.js`
- Test: `tests/progression.test.mjs`

Implement double progression, explicit per-set load/reps/RIR/timestamps, session duration tracking, rolling trend evaluation, and KEEP/ADD/REMOVE/REALLOCATE recommendations. Additive migration defaults preserve legacy history and active workouts.

### Task 4: Add gym, movement, cardio, and measurement analytics

**Files:**
- Modify: `js/workout/metrics.js`
- Create: `js/render-analytics.js`
- Modify: `js/render-history.js`
- Modify: `js/render-today.js`
- Modify: `js/dom.js`
- Modify: `styles.css`
- Test: `tests/metrics.test.mjs`

Expose weekly gym minutes/sets/effective sets, progression and measurement trends, adherence, optimizer recommendations, movement breaks, and cardio minutes in a separate analytics view. These health logs remain separate from gym sessions.

### Task 5: Verify all routes and compatibility

**Files:**
- Modify: `tests/session.test.mjs`
- Modify: `tests/backup.test.mjs`

Add migration and runtime regression coverage, run focused tests followed by the complete check suite, inspect the diff, and smoke-test the root, routine, history, analytics, and workout routes at watch and phone dimensions.

### Task 6: Commit and push

Stage only the requested files, commit the completed implementation, and push the current branch after all validation passes. Do not touch the pre-existing `workout-routine.md` deletion.
