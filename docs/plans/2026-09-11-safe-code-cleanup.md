# Safe Code Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove code and styles with no live callers while preserving all workout, persistence, migration, routing, and UI behavior.

**Architecture:** Keep the existing dependency direction and public module contracts. Limit edits to dead DOM helpers/icon definitions, CSS selectors that have no rendered markup, and duplicate declarations; retain compatibility-only `queue` handling and all live workout constants.

**Tech Stack:** Dependency-free browser ES modules, CSS, Node.js tests, ESLint, Prettier.

---

### Task 1: Remove dead DOM definitions

**Files:**
- Modify: `js/dom.js`

**Step 1:** Confirm `pageNav` and the `home`, `calendar`, `history`, `play`, and `more` icon paths have no callers.

**Step 2:** Remove only those definitions and leave all live helpers and icon paths unchanged.

**Step 3:** Run `npm run lint` and `npm test`.

### Task 2: Remove unreachable CSS

**Files:**
- Modify: `styles.css`

**Step 1:** Remove selectors for `.button`, `.history-workout`, `.data-card`, `.data-actions`, `.workout-disclosure`, `.choice-list`, and `.text-action`, which have no rendered markup.

**Step 2:** Remove duplicate declarations and redundant selector branches without changing live selectors.

**Step 3:** Run `npm run format:check` and `git diff --check`.

### Task 3: Verify the preserved application

**Files:**
- No additional files.

**Step 1:** Run `npm run check`.

**Step 2:** Serve the app on port 4173 and request `/`, `/routine/`, `/history/`, and `/workout/`.

**Step 3:** Review the final diff for accidental changes and report any unavailable browser/device evidence.
