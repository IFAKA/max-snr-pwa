# Rest Exercise Switching and Complete Notes Removal

## Goal

Allow choosing the next exercise from the More menu while resting, with the choice opening when rest ends. Remove workout notes from the UI, state persistence, backup validation, and history.

## Design

- Reuse the current workout task queue and `active.nextPos` state. Selecting an unfinished exercise during rest updates only `nextPos`; `restEndsAt` and the countdown remain unchanged.
- Keep normal lifting exercise selection behavior unchanged. Rest completion continues through `continueRest()`, which opens the selected position.
- Remove note inputs and persistence listeners from stretch and completion, remove note output from history, and remove note-specific backup validation and CSS.
- Preserve the existing state version, IndexedDB/localStorage compatibility, route behavior, and service-worker precache because no new module is needed.

## Validation

Add focused tests for rest selection, timer preservation, continuation target, normal selection, and note removal. Run the test suite, JavaScript syntax checks, and `git diff --check`.
