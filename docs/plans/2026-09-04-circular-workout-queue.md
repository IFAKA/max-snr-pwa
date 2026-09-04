# Circular Workout Queue Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make occupied exercises rotate to the end of a circular workout queue, organize routines by equipment zone, and automatically open the next exercise when rest expires.

**Architecture:** Keep the version 2 active-session schema and existing renderer boundaries. Store queue order in the flattened task list, select unfinished tasks with circular scanning, and retain deferred groups only as a compatibility-friendly marker for the current workout. Rest completion will advance and render the next lifting task immediately when its absolute timestamp reaches zero.

**Tech Stack:** Dependency-free browser-native ES modules, IndexedDB/localStorage persistence, static PWA service worker.

---

### Task 1: Refactor circular task selection and occupied behavior

**Files:**
- Modify: `js/workout/session.js`

1. Add circular scanning that starts after the current position and wraps to index zero.
2. Exclude completed tasks and occupied groups during the normal pass, then retry deferred work only after all available work is exhausted.
3. Preserve superset partner sequencing and make occupied at the end wrap to the next available task rather than terminating or re-entering immediately.

### Task 2: Make rest expiry automatic

**Files:**
- Modify: `js/render-workout/rest.js`

1. When rest is already expired, advance immediately during rendering.
2. When the countdown expires, continue the rest transition and reload without requiring a button press.
3. Keep the button as an explicit early “Skip” action while the timer is running.

### Task 3: Order routines by equipment zone

**Files:**
- Modify: `js/routine-data.js`

1. Group each training day’s items by station/zone so adjacent exercises use the same machine, cable station, or free-weight area where practical.
2. Keep same-station supersets and equipment blocks intact.

### Task 4: Verify and update offline cache

**Files:**
- Modify: `sw.js`

1. Increment the cache version.
2. Run syntax checks for every JavaScript file, a focused queue behavior check, `git diff --check`, and local route smoke tests.
