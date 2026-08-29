# Finalized Routine Execution Model Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the static workout PWA into a persistent, offline-first linear workout state machine that exactly models the finalized routine, true same-station supersets, equipment blocks, deferred work, substitutions, and lifecycle timers.

**Architecture:** Keep the existing route shells and dependency-free HTML/CSS/JavaScript structure. Replace the flat routine queue with explicit `exercise`, `superset`, and `equipmentBlock` items, derive a session task queue with stable task IDs, and persist the active session/history in IndexedDB with a safe localStorage migration. Render one active state at a time and use absolute timestamps for plank, rest, and stretch timers.

**Tech Stack:** Static HTML, browser-native JavaScript, CSS, IndexedDB, localStorage migration, Service Worker cache.

---

### Task 1: Replace routine data and persistence model

**Files:**
- Modify: `app.js`

**Steps:**
1. Define the exact Monday–Sunday routine, including explicit `superset` members and Friday `equipmentBlock` items, station identity, rest durations, alternatives, and 15/18/17/18 working-set totals.
2. Add versioned IndexedDB storage for active session and completed history, with localStorage `maxsnr` migration that preserves valid existing history and active state where possible.
3. Add a single persistence helper used after every meaningful action and normalize imported/legacy records without rewriting historical snapshots.

### Task 2: Implement the linear session state machine

**Files:**
- Modify: `app.js`

**Steps:**
1. Build stable executable task references for ordinary exercises, superset A/B turns, and equipment-block exercises while preserving group metadata.
2. Implement warmup → plank → lifting → stretch → complete phases, absolute timer recovery, next-task selection, deferred retry behavior, and explicit skipped/deferred records.
3. Implement true A→B→rest superset transitions and ordinary sequential equipment-block transitions with normal rest between sets.
4. Implement occupied/defer, substitution, cancel confirmation, stretch repeat, completion snapshot, and progression suggestions based only on actual performed exercise history.

### Task 3: Refactor workout and content rendering

**Files:**
- Modify: `app.js`
- Modify: `styles.css`

**Steps:**
1. Render the active workout with upper information and lower thumb-zone controls, one obvious action, progress, current set, target, previous performance, draft weight/reps/RIR, and next-without-rest messaging for supersets.
2. Render deferred-work resolution at the end with Do now, Substitute, and Skip today actions.
3. Render the complete routine directly with distinct ordinary, SUPERSET, and EQUIPMENT BLOCK sections; keep History backup controls above history.
4. Add responsive 320px-safe native styles, focus/active states, status messaging, and no workout navbar/branding.

### Task 4: Update offline cache and validate

**Files:**
- Modify: `sw.js`
- Modify: `manifest.webmanifest` if validation finds metadata gaps

**Steps:**
1. Increment the service-worker cache version and verify all four route documents, shared assets, and icons are precached.
2. Run JavaScript syntax and available project checks.
3. Serve locally and exercise route rendering, lifecycle, both supersets, equipment blocks, defer/substitute/skip, cancellation, refresh recovery, 320px overflow, and offline cache behavior with browser tooling.

### Task 5: Commit and deploy

**Files:**
- Commit the relevant changed files explicitly.

**Steps:**
1. Inspect the final diff and status, then commit with a concise Conventional Commit message.
2. Deploy the finished site with `npx vercel --prod` as required by repository instructions.
3. Report changed files, model/state-machine behavior, persistence/offline details, validation, deployment URL, and remaining limitations.
