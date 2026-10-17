# Gesture Simplification Plan

**Goal:** Use vertical, native-first gestures to remove controls from the first viewport of each workout step, without a custom gesture system.

**Constraints (from `AGENTS.md`):** one focused purpose per watch screen; no horizontal swipe navigation, tab bars, bottom sheets or custom dismiss gestures; every gesture needs a tap/keyboard fallback; essential targets stay at least 44px; back stays guarded (single back ignored, double back or Escape opens the cancel dialog).

**Existing gesture exception:** hold and drag a set value vertically like a Digital Crown wheel (`browser/value-scrub.ts`). A quick swipe scrolls the page (`touch-action: pan-y`); the wheel only locks scrolling once the hold starts.

---

### Phase 1: Vertical paging inside workout steps (shipped on Lifting)

Page one is the primary stage (set values and `Log set`, or the rest timer). Page two holds secondary content: previous performance, progression note and Change Exercise (on set 1).

- `WorkoutStage` takes an optional `more` snippet rendered as a second page, with native CSS scroll snap (`y proximity`) on the lifting stage. Other steps can adopt the same contract.
- No gesture code. Crown, touch scroll, keyboard and screen readers keep working.
- A small `⌄` hint under the primary action shows that more sits below.
- Files: `src/lib/components/WorkoutStage.svelte`, `src/lib/workout-screens/Lifting.svelte`, `src/styles/app.css`.

### Phase 2: Swipe to log a set (shipped)

Directions are set for right-handed use: swipe LEFT confirms, swipe RIGHT undoes. `SwipeCard` is the only place that decides this.

`Log set` is prefilled from history, so dragging the whole lifting screen left like a card, past 40% of its width (or flicking), logs the set. `browser/swipe-log.ts` is the action; `Lifting.svelte` wires it.

- The screen follows the finger and fades slightly; a badge fades in and reads "✓ Release to log" once armed. Released early, it springs back; committed, it slides off to the left. A tick cue plays on arming; the usual `setLogged` / `betterSet` cue plays on commit.
- Tap, Enter and screen readers still use the button's click. Vertical drags scroll natively (`touch-action: pan-y`); the set values opt out (`data-no-swipe`); edge starts are ignored; the click after a drag is swallowed so a set is never logged twice.
- A `→` nudge shows until the first successful swipe (`maxsnr-swipe-learned`).
- Undo: Rest keeps "Undo Last Set" (now with a soft low `undo` cue).
- The card is the shared `SwipeCard` and now covers Rest (left: skip rest, right: undo last set), Plank (left: finish), Stretch (left: finish, right: restart) and timed/metric activities (left: finish). Countdown steps show a `Swipe ← …` hint and keep their buttons on a second scroll page; the measurement form has no swipe.
- Left swipe on Lifting and Defer behind a confirm dialog are not built: try the swipes on real workouts first.

### Buttons hidden, no second page (shipped)

Real-phone feedback: a tall phone showed the second page's buttons without scrolling, and the `⌄` meant nothing. Now the actions the swipes replace (Log set, Skip Rest, Undo, Finish, Restart) stay in the DOM but are visually hidden until keyboard focus reaches them (`.stage-more`, shown as a bottom bar on focus); there is no second scroll page and no `⌄`. Changing the exercise is a tap on the exercise title (a link, 44px tall). Rest shows the title, the last set, `n/total`, the timer, the bar and the hint; the session time shows only at the 60:00 cap.

### Follow-ups from the phone (shipped)

- Set values use a 1 : 1.5 : 1 column split and a smaller minimum size so `142.5` fits at 192×192.
- The value wheel is back to "drag up raises the value"; the wheel lists higher values above.
- The pre-start exercise-selection screen is a swipe card too (left: continue); tapping the exercise name opens Change Exercise.

### Swipe up to change exercise (shipped)

Dragging the card up past 25% of its height (or flicking) opens the exercise list on the exercise-selection, lifting (set 1) and rest screens, with the badge "↑ Change exercise". It navigates to the existing full-screen list rather than opening a drawer (no bottom sheets per `AGENTS.md`). The card only claims vertical drags (`touch-action: none`) when its stage fits the screen; otherwise the stage keeps native scrolling. Tapping the name still works.

### Ring cue, no first-exercise step, build label (shipped)

- Swipes show an icon-only circle (check to confirm, undo arrow, list for change exercise) in the middle of the screen with a progress ring that fills toward the threshold; past it the circle turns solid, pops and vibrates (`cue('armed')`), like Tinder's stamp.
- The "Choose your first exercise" screen is gone: a new workout opens the lifting screen, and swiping up (or tapping the name) opens the exercise list, which slides up and back down with a view transition (no drawer component).
- A swipe that starts on a set value works unless the finger is held for 300 ms, which hands the touch to the value wheel; the title link is `draggable="false"` so a vertical drag on it is not a native link drag.
- History shows `Version <commit>` (from `vite.config.ts`, `__BUILD_ID__`) so an installed app can be checked against the deployed commit.

### Exercise drawer (shipped)

The exercise list is now a real bottom drawer (`Drawer.svelte`, native `<dialog>`), opened by swiping the workout screen up or tapping the name. The screen under it stays mounted, so unsaved value changes survive. The earlier slide-up route transition was removed. Close with Escape, the backdrop, the handle (button or downward drag), or back.

### Ring only for irreversible actions (shipped)

The ring-and-haptic confirmation (40% of the width) is reserved for actions that cannot be undone: Skip Rest, Finish (plank, stretch, activities) and Continue. Undoable actions (Log set, Undo Last Set, Restart, opening the exercise list) act on a light swipe (20%) with no ring; Log set is undone from Rest with a right swipe.

### Cleaner Lifting screen (shipped)

The main view is the title, `3/3` (read as "Set 3 of 3" by screen readers), three large plain values (still tap or hold-and-drag) and a `← swipe to log` hint. The `Log set` button, target, previous set, progression note and Change Exercise sit on the second page; the button stays a real submit control (`form="set-form"`) for keyboard and screen readers. At 192×192 the hint sits one scroll below the values.

### Phase 3 (dropped)

The earlier idea of reusing the value wheel for rest length, plank time and the weekly goal does not apply: those values have no picker in the app today. Revisit if one is added.

### Rejected

- Horizontal swipe to skip a set, and unguarded swipe-to-delete.
- Swipe-back or swipe between tabs: back is already guarded.
- Swipe-to-delete in History: destructive choices must name what they discard in a native dialog.

### Validation

`npm run check` passes (including the new `e2e/swipe-log.spec.ts` and `tests/swipe-log.test.ts`). Playwright runs at 225×225, 192×192 and phone size for: no horizontal overflow, 44px targets, secondary actions reachable by keyboard and scroll, 200% zoom, dark mode, reduced motion, refresh during rest. The real-device gate is not passed: try it on a real Android watch or phone.
