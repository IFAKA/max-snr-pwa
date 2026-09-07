# Remove redundant back buttons

## Scope

Remove the “Back to Today” links from the Routine and History screens because the persistent bottom navigation already provides navigation between Today, Routine, and History.

## Design

Delete only the back-link markup from `js/render-routine.js` and `js/render-history.js`. Remove any imports that become unused. Keep the shared bottom navigation, routes, state, service-worker cache, and all screen content unchanged.

## Validation

Run JavaScript syntax checks for every module, `git diff --check`, and smoke-test the root, Routine, and History routes to confirm the bottom navigation remains present and active on each screen.
