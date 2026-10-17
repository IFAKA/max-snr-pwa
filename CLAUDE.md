# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

The rules in `AGENTS.md` (architecture, Apple Watch–first UI gate, compatibility, commit-and-push delivery) apply in full. The notes below add what it does not cover.

## Commands

No build step: the app is static HTML + browser-native ES modules, so files are served as-is.

```sh
npm install                                  # also sets core.hooksPath=.githooks via "prepare"
python3 -m http.server 4173                  # serve locally; smoke test /, /routine/, /history/, /workout/
npm run check                                # full suite: lint → architecture → sw:check → format:check → syntax → test
npm test                                     # node --test (tests/*.test.mjs and packages/*/tests)
node --test tests/session.test.mjs           # single test file
node --test --test-name-pattern="weekly goal" tests/metrics.test.mjs   # single test by name
npm run lint / npm run format / npm run architecture / npm run syntax
npm run sw                                   # regenerate CACHE_NAME + PRECACHE_URLS in sw.js
```

- Tests import browser modules directly after stubbing `globalThis.document`, `localStorage`, `confirm`, etc. at the top of each file. Follow that pattern rather than adding a DOM library.
- The pre-commit hook (`.githooks/pre-commit`) runs `npm run sw`, stages `sw.js`, then runs `npm run check`. Any change to an app asset changes the precache hash, so `sw.js` will appear in commits.
- Deployment is Vercel (`.vercel/project.json`), triggered by pushing; there is no deploy command.

## Architecture notes beyond AGENTS.md

- **Routing:** each HTML shell sets `<body data-route="…">`. `app.js` loads state, repairs browser history so back unwinds detail → parent → Today (`js/navigation.js` `parentRouteUrl`/`referrerIsParentEntry`), and dispatches to a renderer. Detail views are query parameters on existing routes (e.g. `/history/?view=analytics` → `render-analytics.js`). In-app navigation goes through `navigateTo`/`renderWithTransition` rather than full page loads.
- **Renderer ↔ domain boundary:** `scripts/check-architecture.mjs` also rejects `js/render-workout/*` importing `../workout/*`. Workout-phase renderers must go through the `js/workout.js` facade, so expose new session capabilities there. Top-level renderers (`render-today.js`, `render-analytics.js`) currently import read-only domain modules such as `optimizer.js` and `metrics.js` directly.
- **Persisted training state:** the optimizer modules (see `AGENTS.md`) store `state.prescription` and `state.health.measurements` alongside `history`/`active` without changing `version: 2`.
- **Magnetic picker:** its `src/` is part of the SW precache and has its own README and tests. Lists use native `pan-y` scrolling and lock scrolling only while the picker is held.
- `js/vendor/` is third-party code and is excluded from lint, syntax, and architecture checks.

## Design references

- `AI-DESIGN-SYSTEM.md`: product-agnostic visual and interaction spec (layout grammar, components, states). Read it before UI work.
- `WORKOUT-VISUAL-IDENTITY.md`: this app's identity (calm sage palette, barbell mark, timer-first stages; what to avoid).
- `docs/plans/`: dated design/implementation plans explaining why past UI and domain decisions were made. `docs/evidence/workout-training.md` holds the training-science rationale behind the optimizer.
