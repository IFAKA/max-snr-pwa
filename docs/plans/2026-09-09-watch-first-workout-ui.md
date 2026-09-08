# Watch-First Workout UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make MaxSNR’s workout and primary navigation interfaces genuinely usable at Apple Watch-sized 225×225 viewports while preserving the existing workout state machine and offline data model.

**Architecture:** Keep the current dependency direction and workout actions intact. Add reusable workout shell markup helpers for phase eyebrow, primary action, and inline More disclosure; use a dedicated watch-first CSS contract that keeps one primary action visible and lets secondary actions live in a native disclosure. Preserve the same DOM across watch and phone sizes.

**Tech Stack:** Dependency-free semantic HTML, browser-native ES modules, CSS media queries, IndexedDB/localStorage persistence, service-worker precache.

---

### Task 1: Establish the shared workout shell

**Files:**
- Modify: `js/render-workout/shared.js`
- Modify: `js/render-workout/warmup.js`
- Modify: `js/render-workout/plank.js`
- Modify: `js/render-workout/lifting.js`
- Modify: `js/render-workout/rest.js`
- Modify: `js/render-workout/stretch.js`
- Modify: `js/render-workout/completion.js`

Create shared helpers for the workout stage, eyebrow, and primary action so each phase uses the same semantic structure and watch-sized hierarchy. Keep all existing action IDs and workout calls unchanged.

### Task 2: Replace squeezed-phone CSS with a watch-first layout contract

**Files:**
- Modify: `styles.css`

Define compact watch tokens, spacing, typography, progress treatment, steppers, and disclosure behavior at 225×225. Ensure only the primary action and a compact “More” disclosure are shown in the persistent action area. Keep phone layouts as the same flow with additional breathing room, not a separate DOM model. Preserve dark mode, focus-visible, reduced motion, and 44px touch targets where possible.

### Task 3: Make app navigation watch-safe

**Files:**
- Modify: `js/dom.js`
- Modify: `styles.css`

Use the existing native `details` navigation as the shared compact location header. Ensure it never becomes a clipped tab bar and remains readable at 225px.

### Task 4: Update offline precache and verify

**Files:**
- Modify: `sw.js`

Increment the cache version after module/style changes and confirm all required modules remain precached. Run syntax checks, `git diff --check`, local HTTP smoke tests, and browser validation at 225×225 and phone dimensions.

