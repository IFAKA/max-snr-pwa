# Equipment-Zone Routine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorder the workout routine so each day finishes one gym area before moving to the other, making same-station supersets practical in a crowded gym.

**Architecture:** Keep the existing flat workout queue and history format, adding a small `zone` field to each exercise. The Routine screen groups the already ordered exercises into machine and cable/free-weight sections; workout progression remains unchanged.

**Tech Stack:** Vanilla JavaScript, static HTML, CSS, browser localStorage.

---

### Task 1: Reorder exercises by equipment zone

**Files:**
- Modify: `app.js`

Add `machine` or `cable` metadata to each exercise, order machine exercises before cable/free-weight exercises on every training day, and render the zone headings on the Routine screen.

### Task 2: Verify the routine

**Files:**
- Inspect: `app.js`

Run a JavaScript syntax check and inspect the changed diff. Confirm every routine exercise has a zone and the workout queue still receives `name`, `sets`, and `reps` fields.
