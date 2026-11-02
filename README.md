# Max SNR (max-snr-pwa)

An offline-first workout tracker PWA, designed watch-first and also packaged as an Android app.

Live: https://workout-ashy-iota.vercel.app

## Features

- Routine of workout days with exercise, sets and reps; a confirmation before starting a workout.
- Guided workout flow: log a set in one tap, change a value with a wheel, rest timers and a preview of the next step, supersets, and finish early.
- Saves your work on finish, with "Reopen Workout" as the undo.
- Progression rules that add load only after all sets reach the top of the range.
- History of everything done, with detail views, daily log, check-in and analytics.
- Sound and vibration cues, screen wake lock, and reduced-motion support.
- Backup and import of your data, and an update check.
- All data stays on the device (IndexedDB with a localStorage fallback); no server needed after install.
- Android app via Capacitor with native timer and backup plugins.
- Includes a standalone, dependency-free "magnetic picker" long-press list selector (`packages/magnetic-picker/`).

## Run locally

```bash
npm install
npm run dev          # development server
npm run build        # static build + service worker
npm run preview
npm run check        # lint, architecture, format, typecheck, unit tests, build, e2e
npm test             # Vitest and picker tests
npm run test:e2e     # Playwright
npm run android:apk  # build and assemble a debug APK (needs the Android toolchain)
```

## Tech

SvelteKit 3 (Svelte 5 runes) with adapter-static, TypeScript, Vite, a generated classic service worker, Capacitor (Android), Vitest, Playwright, ESLint and Prettier. Deployed on Vercel.

## Support

If this project is useful to you, you can support my work:

[![Support me on Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/zfaka)
