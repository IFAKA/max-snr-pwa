# Countdown and Update Controls Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Vertically center timed activity countdowns, keep app update checks user-triggerable, and show compact activity durations in Today navigation rows.

**Architecture:** Preserve the shared countdown component and service-worker update lifecycle. Adjust only renderer CSS/layout, update-control state semantics, and the user-facing activity duration labels; no storage schema or cache behavior changes.

**Tech Stack:** Dependency-free browser-native ES modules, CSS, Node test runner.

---

### Task 1: Add focused regression coverage

**Files:**
- Modify: `tests/countdown.test.mjs`

**Step 1:** Add assertions that activity definitions expose compact row metrics such as `30m`, while countdown markup still formats elapsed time as `30:00`.

**Step 2:** Run `node --test tests/countdown.test.mjs` and confirm the new compact-label assertion fails.

### Task 2: Fix countdown layout and activity row labels

**Files:**
- Modify: `styles.css`
- Modify: `js/activity-data.js`
- Modify: `js/workout/health-optimizer.js`

**Step 1:** Make the countdown stage’s stage-info occupy the available viewport and center the timer as a single focused metric, including the compact breakpoint override.

**Step 2:** Change navigation metrics to compact labels (`30m`, `3m`) without changing timed countdown formatting or durations.

**Step 3:** Run the focused countdown tests and syntax checks.

### Task 3: Keep update checks available

**Files:**
- Modify: `js/update-app.js`
- Modify: `js/render-today.js`

**Step 1:** Make the Today update control enabled in current/error/unavailable states and disable it only during an active check or installation.

**Step 2:** Use explicit refresh/check and pending/install icon states, preserving automatic initial availability checking and service-worker activation reload behavior.

**Step 3:** Run the full project checks and local route smoke tests.

### Task 4: Inspect final behavior

**Files:**
- Review: changed files and rendered routes

**Step 1:** Review the diff and check for formatting, unused code, and accidental cache/schema changes.

**Step 2:** Validate `/`, `/workout/?activity=walk`, representative watch sizes, phone size, focus states, reduced motion, and dark mode when browser tooling is available.

**Step 3:** Commit the requested changes after validation. Do not push without explicit user authorization.
