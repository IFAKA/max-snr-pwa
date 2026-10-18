# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

The rules in `AGENTS.md` (architecture, Apple Watch–first UI gate, product psychology criteria, compatibility, commit-and-push delivery) apply in full. The notes below add what it does not cover.

## Commands

```sh
npm install                                   # also runs svelte-kit sync and sets core.hooksPath=.githooks
npm run dev                                   # Vite dev server (no service worker)
npm run build                                 # prerender to build/ and generate build/sw.js
python3 -m http.server 4173 --directory build # serve the built app exactly as deployed
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" npm run android:apk
                                              # Android debug APK → android/app/build/outputs/apk/debug/
npm run check                                 # lint → architecture → format → svelte-check → tests → build → e2e
npm test                                      # Vitest (tests/) + picker package node --test suite
npx vitest --run tests/session.test.js        # single test file
npx vitest --run -t "weekly goal"             # single test by name
npm run test:e2e                              # Playwright against build/ (run npm run build first)
npx playwright test e2e/workout-flow.spec.ts --project=watch-225
npm run lint / npm run format / npm run typecheck / npm run architecture
```

- Imports inside `src/lib` are relative with explicit `.ts` extensions; routes import via the `#lib/*` subpath alias (SvelteKit 3 has no `$lib`). Use `$app/env` (not `$app/environment`) and `goto(url, { replace: true })`.
- `tests/*.test.js` are the behavior-parity tests ported from the vanilla app (loose fixtures, excluded from type checking); new tests are TypeScript. `tests/setup.ts` installs an in-memory `localStorage` because Node's experimental global throws.
- The pre-commit hook runs `npm run check`, including Playwright; Chromium must be installed (`npx playwright install chromium`).
- Deployment is Vercel (`vercel.json`), triggered by pushing; there is no deploy command.
- The Android app is a Capacitor 8 shell (`capacitor.config.ts`, `android/`) around the same `build/`. Gradle needs JDK 21 (Homebrew's JDK 27 is too new), hence `JAVA_HOME` above. The APK is not committed and not part of `npm run check`.

## Architecture notes beyond AGENTS.md

- **Reactivity:** domain state is a plain object (so IndexedDB can structured-clone it). Screens read it inside `$derived.by(() => { void appVersion.value; … })`; anything that changes state should go through `act()` from `app-state.svelte.ts` so views refresh. `WorkoutScreen` keys the active step on `appVersion`, so each action re-mounts the step from persisted state, like a fresh render.
- **Routing:** `workout-view.ts` maps URL + state to a screen and is unit-tested; add workout views there first. Logging a set is one screen (`?view=exercise` for the first set); tapping a value opens its wheel (`ValueWheel`, a modal dialog, no URL); old `?step=` and `?pick=` URLs redirect to `/workout/`. Main steps (no `view`) ignore a single back gesture and open the cancel dialog on a quick double back or Escape.
- **Boot:** `+layout.ts` loads state once; `+layout.svelte` renders screens only after `deepLinkAncestors` rebuilds the back stack for a fresh launch on a detail URL.
- **Feel:** `browser/feedback.ts` pairs each workout moment (`cue('setLogged')`, `'restDone'`, …) with a Web Audio sound from `browser/sound.ts` (synthesized, no files; the Sound row in History turns it off, stored as `maxsnr-sound`) and a vibration. `Countdown` pips the last three seconds and drains a bar when given `total`; rest moves to the next set by itself when it ends. Animations are CSS keyframes, all disabled by the reduced-motion rule.
- **Android app:** `browser/native-app.ts` is the only JS that talks to native code. `syncNativeTimer` (called from `+layout.svelte` on every `appVersion` bump) mirrors the running rest/plank/stretch end time to the `WorkoutTimer` plugin (`android/app/src/main/java/com/maxsnr/workout/`), which shows a chronometer notification and sets an alarm clock; `TimerAlarmReceiver` posts the "done" alert only when the app is not on screen, and in-app cues stay silent while hidden. `BackupFile` replaces the download link for Export (a WebView ignores downloads). The native app skips `/sw.js` and hides "Check for Updates"; new versions mean a new APK. The manifest has no INTERNET permission.
- **Magnetic picker:** `AppList` attaches it with the `magneticList` action and rebuilds it when its `rows` key changes, because the picker decides at creation whether a list has selectable rows.

## Design references

- `AI-DESIGN-SYSTEM.md`: product-agnostic visual and interaction spec (layout grammar, components, states). Read it before UI work.
- `WORKOUT-VISUAL-IDENTITY.md`: this app's identity (calm sage palette, barbell mark, timer-first stages; what to avoid).
- `docs/plans/`: dated design/implementation plans explaining why past UI and domain decisions were made. `docs/evidence/workout-training.md` holds the training-science rationale behind the optimizer.
