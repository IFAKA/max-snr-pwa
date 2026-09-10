# Standalone Magnetic Picker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract the magnetic list picker into a reusable, project-independent browser library while preserving the app’s current behavior.

**Architecture:** Move generic pointer, keyboard, selection, cancellation, accessibility, and vibration behavior into `packages/magnetic-picker/src`. Keep app-specific selectors, CSS naming, and navigation in a thin adapter under `js`. The library will expose configurable selectors and callbacks and will not import app modules.

**Tech Stack:** Dependency-free browser ES modules, CSS, Node’s built-in test runner.

---

### Task 1: Add library contract tests

**Files:**
- Create: `packages/magnetic-picker/tests/magnetic-picker.test.mjs`

Write focused tests for index calculations and the public picker behavior using small DOM doubles.

### Task 2: Extract the implementation

**Files:**
- Create: `packages/magnetic-picker/src/magnetic-picker.js`
- Create: `packages/magnetic-picker/src/magnetic-picker.css`
- Modify: `js/magnetic-picker.js`

Move the generic implementation into the package, replace app-specific class and data names with configurable defaults, and retain a compatibility adapter at the old import path.

### Task 3: Integrate the app adapter

**Files:**
- Modify: `js/dom.js`
- Modify: `styles.css`
- Create: `packages/magnetic-picker/package.json`

Configure the app adapter explicitly and keep app CSS as the integration layer.

### Task 4: Verify and deliver

Run focused tests, the full check suite, syntax checks, diff checks, and local route smoke tests. Inspect the diff, then commit and push the requested extraction.
