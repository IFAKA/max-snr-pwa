# Today mobile navigation and action layout

## Goal

Make the Today screen show the routine scheduled for the current day, keep the primary workout action within easy thumb reach, and remove duplicate navigation surfaces on mobile.

## Design

- Today renders the current day's routine from `ROUTINE`, using the same exercise/group markup as the Routine screen.
- The green Today action card is removed for a new workout. The Start button is rendered in a bottom action area after the routine, with viewport-aware spacing and safe-area padding.
- An active workout keeps its Resume status, but uses the same bottom action area.
- Today no longer renders separate Routine and History tiles. The fixed bottom navigation remains the single primary navigation surface and stays icon-only with accessible labels.
- Rest days show the rest-day state without a Start button or routine list.

## Data flow and compatibility

`renderToday()` continues to read `dayNow()`, `getState()`, and `ROUTINE`. No state schema, storage identifiers, route paths, or workout behavior change. Routine presentation is kept aligned with `renderRoutine()` through a shared formatter.

## Validation

Check every JavaScript module with `node --check`, run the existing tests, run `git diff --check`, and smoke-test the four routes from a local static server. Verify Today on a mobile-sized viewport for workout and rest days, including bottom-nav clearance and thumb-reachable Start/Resume actions.
