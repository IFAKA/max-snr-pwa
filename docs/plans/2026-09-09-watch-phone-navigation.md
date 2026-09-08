# Watch and Phone Navigation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the PWA use one simple shared CSS/UI system for smartwatch and phone, with a list-first Today → Routine/History → detail flow and native back navigation to Today.

**Architecture:** Keep the existing dependency-free ES-module architecture and route URLs, but use query-based detail views inside the existing routine/workout route. Today becomes a focused landing screen with workout type and exactly two navigation actions; Routine lists days, day detail lists exercises, and starting a workout requires a native confirmation dialog. Browser history is used so Android back unwinds each view to Today.

**Tech Stack:** Native HTML, CSS, browser ES modules, History API, existing IndexedDB/localStorage state, Node test runner, Playwright when available.

---

### Task 1: Record the product contract

**Files:**
- Modify: `AGENTS.md`
- Create: `docs/plans/2026-09-09-watch-phone-navigation.md`

**Step 1:** Add the shared-CSS, list-first navigation contract and the route/back/detail/confirmation expectations to `AGENTS.md`.

**Step 2:** Review the instructions for consistency with the existing trailing-slash routes and state schema.

### Task 2: Build shared navigation helpers and Today

**Files:**
- Modify: `js/render-today.js`
- Modify: `app.js`

**Step 1:** Normalize direct route loads and use the existing browser history/referrer chain so native back unwinds to the parent view without duplicate entries.

**Step 2:** Render Today with the current workout type as the title and two clearly labeled links/buttons for Routine and History.

**Step 3:** Keep resume/start status secondary and ensure every action is keyboard accessible and at least 44px tall.

### Task 3: Add Routine day and workout-detail views

**Files:**
- Modify: `js/render-routine.js`
- Modify: `js/render-workout.js`
- Modify: `js/routine-view.js`

**Step 1:** Make Routine a list of all days; clicking a workout day opens a dedicated day detail view.

**Step 2:** Make day detail show workout type title, an exercise list with names and sets/reps, and a primary Start action.

**Step 3:** Add a native `dialog` confirmation before starting, preserving the existing session start behavior.

**Step 4:** Ensure browser back from day detail returns to Routine, and back from Routine returns to Today.

### Task 4: Simplify History and shared CSS

**Files:**
- Modify: `js/render-history.js`
- Modify: `styles.css`

**Step 1:** Give History its own explicit title and list-first structure while preserving import/export and saved workout details.

**Step 2:** Consolidate responsive rules into one CSS system that starts with a watch-sized canvas, lets content scroll vertically, and expands naturally for phones.

**Step 3:** Preserve visible focus, dark mode, reduced motion, long-label wrapping, and 44px controls without horizontal overflow.

### Task 5: Cache and verify

**Files:**
- Modify: `sw.js`
- Modify: tests if needed

**Step 1:** Increment the service-worker cache version if any module or stylesheet changes require it.

**Step 2:** Run all Node tests, JavaScript syntax checks, `git diff --check`, route smoke tests, and browser checks at 225×225, a smaller watch width, and phone width when Chromium is available.

**Step 3:** Inspect the final diff, commit the validated change, and push the current branch without force.
