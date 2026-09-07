# Workout action status design

## Goal

Make the workout action sheet communicate exercise state at a glance and keep its trigger visually consistent with the primary workout action.

## Design

- Show `Started` only beside the exercise currently selected for lifting.
- Show a check icon with an accessible `Done` label for exercises whose sets are all completed or skipped.
- Leave upcoming exercises without a status label; keep their existing selection-disabled behavior where the workout phase requires it, but do not expose `Locked` text.
- Keep exercise progress dots empty until all sets for an exercise are completed or skipped, then fill the corresponding dot.
- Match the secondary `More workout actions` trigger height to the primary action button.
- Reuse the existing inline SVG icon system for the completion check instead of introducing a text symbol.

## Scope and compatibility

Only workout rendering, shared icon markup, and CSS presentation change. State, persistence, routing, and the active-session schema remain unchanged. The service-worker cache version is incremented so deployed clients receive the updated presentation.

## Validation

Run JavaScript syntax checks for every module, `npm test`, and `git diff --check`. Smoke-test the lifting action sheet at mobile width, checking current, completed, and upcoming exercise states, filled progress dots, and equal primary/secondary button heights.
