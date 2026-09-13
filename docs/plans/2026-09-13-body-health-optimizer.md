# Body Health Optimizer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Generalize MaxSNR from a lifting-only conceptual model into a transparent body-health prioritizer while preserving Today → Routine → History and the existing watch-first interaction contract.

**Architecture:** Keep resistance training as the specialized workout domain and add a pure `health-optimizer` domain that evaluates separate dimensions (resistance, aerobic activity, movement, sedentary exposure, measurements, and optional recovery) without collapsing them into a score. Additive `health.activities` records and recommendation stability fields extend v2 state; legacy arrays and workout history remain readable through migration. Today consumes one recommendation only; activity-specific execution remains one metric/one action, and History → Analytics owns complexity.

**Tech Stack:** Dependency-free browser ES modules, IndexedDB/localStorage v2 persistence, Node built-in test runner, semantic HTML/CSS, existing route shells.

---

### Task 1: Record current evidence and define health contracts

**Files:**

- Modify: `docs/evidence/max-snr-training.md`
- Create: `js/workout/health-optimizer.js`
- Test: `tests/health-optimizer.test.mjs`

Write current WHO and 2026 ACSM evidence with FACT/GUIDELINE, ESTIMATE, HEURISTIC, ASSUMPTION, and UNKNOWN labels. Define pure weekly dimension summaries, overlap-aware action candidates, and hysteresis selection. Test resistance-due, walk-over-two-tasks, rest, independent sedentary exposure, no corrective-exercise inference, noisy-metric stability, and no-action outcomes.

### Task 2: Generalize additive state and history records

**Files:**

- Modify: `js/state.js`
- Modify: `js/storage.js`
- Modify: `js/backup.js`
- Test: `tests/backup.test.mjs`

Add `health.activities` and `settings.recommendation` defaults. Migrate missing/legacy values without deleting existing workouts or set data. Normalize activity records with type, timestamps, duration, intensity, dimensions, planned/contextual flag, completion, and optional measurements; retain legacy movement/cardio/measurement arrays as compatible inputs.

### Task 3: Wire one recommendation into Today

**Files:**

- Modify: `js/render-today.js`
- Modify: `app.js`
- Create: `js/render-activity.js`
- Modify: `js/render-workout.js`
- Test: `tests/health-optimizer.test.mjs`

Use the selected recommendation for the single activity title, metric, and primary action. Keep exactly the existing Routine and History navigation actions and no health dashboard. Add focused walk, move, and measurement execution views under the existing activity/workout route with persisted completion records; keep lifting routed through its specialized workflow.

### Task 4: Extend History → Analytics without changing navigation

**Files:**

- Modify: `js/render-history.js`
- Modify: `js/render-analytics.js`
- Modify: `js/workout/metrics.js`
- Test: `tests/metrics.test.mjs`

Show completed non-lifting activity records and separate dimension analytics behind existing progressive disclosure. Include sedentary baseline/logs, aerobic equivalent minutes, activity overlap, direct/fractional muscle allocation, observed session timing, and sensitivity results without presenting any fake composite score.

### Task 5: Remove legacy mandatory plank and verify accessibility behavior

**Files:**

- Modify: `js/render-workout.js`
- Modify: `js/render-workout/plank.js`
- Modify: `js/workout/session.js`
- Modify: `tests/session.test.mjs`
- Modify: `styles.css`

Make abdominal work part of the progressive lifting prescription rather than a mandatory one-minute phase. Preserve persisted timers, wake lock, focus states, dark/reduced-motion/forced-colors styles, and 44px targets.

### Task 6: Fresh verification and delivery

Run focused tests, `npm run check`, `git diff --check`, route smoke tests, and browser checks at 225×225, smaller watch, phone, dark mode, reduced motion, forced colors, long labels, keyboard focus, and refresh/resume states. Inspect the final diff, commit only explicit requested files, and push only after all checks pass.
