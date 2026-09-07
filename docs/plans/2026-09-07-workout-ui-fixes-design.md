# Workout UI fixes design

## Goal

Fix the visible workout and routine presentation issues shown in the supplied screenshots without changing workout persistence or the active-session schema.

## Design

- Correct the warm-up renderer template so the shared workout actions are interpolated as HTML rather than displayed literally.
- Remove the warm-up `Skip` button from the workout UI while preserving the existing session transition code for compatibility.
- Remove workout-phase eyebrow labels so the workout screens lead with their primary content.
- Make rest-day routine summaries stack the day name and `Rest day` label vertically.
- Make `Log set` disabled initially and synchronize its state with native validity for both Reps and Load. Existing domain validation remains authoritative on submit.

## Scope and compatibility

Only workout/routine renderers and presentation are changed. Storage, migration, routing, service-worker assets, and workout state transitions remain unchanged, so no service-worker cache version update is needed.

## Validation

Run JavaScript syntax checks for every module, `git diff --check`, and smoke-test the affected routine and workout routes locally. Confirm the warm-up screen has no eyebrow, Skip, or literal template text; rest-day cards stack correctly; and the lifting action remains disabled until both fields are valid.
