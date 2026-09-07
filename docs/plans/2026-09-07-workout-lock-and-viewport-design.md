# Workout lock, load label, and viewport cleanup

## Approved design

- Keep the weight input in lifting, but remove only its visible `Load (kg, optional)` label. Preserve the existing weight data model and history output.
- Once any set of the current exercise is completed, lock exercise selection for the remainder of that exercise. The More sheet keeps choices visible, but completed, started, or currently locked choices are disabled.
- Keep the selection guard in the workout session layer so the rule is enforced even if the UI is bypassed.
- Simplify Today by removing duplicated routine-name and helper copy while retaining the current workout progress and Resume action.
- Use a viewport-height app shell. Workout screens do not page-scroll; routine/history content and the action sheet may scroll when their lists exceed the viewport.

## Validation

- Add session tests for the first-set exercise lock and weight preservation.
- Run all Node syntax checks, tests, `git diff --check`, and a local HTTP smoke test.
