import type { CapacitorConfig } from '@capacitor/cli';

// The Android app wraps the same prerendered build/ the PWA deploys; `npm run android:apk`
// rebuilds it, copies it into android/ and assembles the APK.
const config: CapacitorConfig = {
  appId: 'com.maxsnr.workout',
  appName: 'Workout',
  webDir: 'build',
  backgroundColor: '#0d1210',
  android: {
    // No network: the files ship inside the APK and nothing is fetched at runtime.
    allowMixedContent: false,
  },
};

export default config;
