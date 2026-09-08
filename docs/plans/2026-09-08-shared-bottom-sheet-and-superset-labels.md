# Shared Bottom Sheet and Superset Labels Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make workout bottom sheets use one shared markup shell and show each active superset member’s acronym in its own progress circle.

**Architecture:** Keep `bottom-sheet.js` as the behavior controller, and add a presentation helper in `render-workout/shared.js` that owns the common backdrop, dialog, handle, header, and content shell. Individual renderers provide only sheet content. Update the progress-dot renderer so every member of the active superset receives its own initials label.

**Tech Stack:** Dependency-free browser-native ES modules, HTML string renderers, CSS.

---

### Task 1: Centralize workout sheet markup

**Files:**
- Modify: `js/render-workout/shared.js`
- Modify: `js/render-workout/rest.js`

**Step 1: Add a shared sheet shell renderer**

Create one helper that receives an id, title, content, and optional class name, and emits the common backdrop/dialog/header markup.

**Step 2: Route progress, action, and rest sheets through the helper**

Keep each sheet’s content-specific controls unchanged while removing duplicated shell markup from `shared.js` and `rest.js`.

**Step 3: Render initials for every active superset member**

Pass the active-superset state into the dot renderer and label each current member using that member’s `performedName`.

### Task 2: Verify the static PWA

**Files:**
- No additional files.

**Step 1: Run JavaScript syntax checks**

Run `node --check` for every JavaScript module.

**Step 2: Check formatting and inspect the diff**

Run `git diff --check` and confirm only the intended renderer changes are present.

**Step 3: Smoke test the workout route**

Serve the project locally and verify the rest sheet, action sheet, progress sheets, and active superset labels at mobile dimensions.
