# Exercise progress dots

## Goal

Show one small progress dot per exercise beside the current set metadata so the user can see which exercises are complete and how many remain.

## Design

- Render one dot for each unique exercise in the active task queue.
- Keep dots empty until every non-skipped set for that exercise is completed.
- Fill a dot once the exercise is complete; skipped exercises are also treated as finished so the remaining count stays honest.
- Add an accessible status describing completed and total exercises.
- Keep the feature presentation-only: no state schema or workout behavior changes.

## Validation

- Check every JavaScript module with `node --check`.
- Run `npm test` and `git diff --check`.
- Verify the lifting screen at mobile width and confirm dot state across set completion and refresh.
