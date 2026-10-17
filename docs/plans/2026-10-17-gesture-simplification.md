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

### Phase 2: Swipe right to log a set (shipped)

`Log set` is prefilled from history, so dragging the whole lifting screen right like a card, past 40% of its width (or flicking), logs the set. `browser/swipe-log.ts` is the action; `Lifting.svelte` wires it.

- The screen follows the finger and fades slightly; a badge fades in and reads "✓ Release to log" once armed. Released early, it springs back; committed, it slides off to the right. A tick cue plays on arming; the usual `setLogged` / `betterSet` cue plays on commit.
- Tap, Enter and screen readers still use the button's click. Vertical drags scroll natively (`touch-action: pan-y`); the set values opt out (`data-no-swipe`); edge starts are ignored; the click after a drag is swallowed so a set is never logged twice.
- A `→` nudge shows until the first successful swipe (`maxsnr-swipe-learned`).
- Undo: Rest keeps "Undo Last Set" (now with a soft low `undo` cue).
- The card is the shared `SwipeCard` and now covers Rest (right: skip rest, left: undo last set), Plank (right: finish), Stretch (right: finish, left: restart) and timed/metric activities (right: finish). Countdown steps show a `Swipe → …` hint and keep their buttons on a second scroll page; the measurement form has no swipe.
- Left swipe on Lifting and Defer behind a confirm dialog are not built: try the swipes on real workouts first.

### Phase 3 (dropped)

The earlier idea of reusing the value wheel for rest length, plank time and the weekly goal does not apply: those values have no picker in the app today. Revisit if one is added.

### Rejected

- Horizontal swipe to skip a set, and unguarded swipe-to-delete.
- Swipe-back or swipe between tabs: back is already guarded.
- Swipe-to-delete in History: destructive choices must name what they discard in a native dialog.

### Validation

`npm run check` passes (including the new `e2e/swipe-log.spec.ts` and `tests/swipe-log.test.ts`). Playwright runs at 225×225, 192×192 and phone size for: no horizontal overflow, 44px targets, secondary actions reachable by keyboard and scroll, 200% zoom, dark mode, reduced motion, refresh during rest. The real-device gate is not passed: try it on a real Android watch or phone.
