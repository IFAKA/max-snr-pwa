# Remove legacy unused code

## Scope

Remove only JavaScript, CSS, and HTML-adjacent code that has no current caller or rendered markup. Preserve all route shells, workout behavior, state version 2, IndexedDB/localStorage persistence, backup validation and migration, and service-worker behavior.

## Cleanup

- Remove unused DOM helpers, icon artwork, and the unused stretch timer constant.
- Remove the empty workout queue placeholder and its unreachable styles.
- Remove obsolete styles for screens and controls no longer rendered, plus duplicate navigation rules.
- Remove unused completion-screen imports and listeners.

## Validation

Run the existing Node tests, syntax-check every JavaScript module, check the diff for whitespace errors, and smoke-test all four routes through a local HTTP server.
