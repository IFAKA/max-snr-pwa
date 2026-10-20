import { Capacitor, registerPlugin } from '@capacitor/core';
import { soundEnabled } from './sound.ts';

// The Android app's native edges (Capacitor plugins in android/app/src/main/java/…/workout/).
// Workout status: a suspended web page cannot ring when rest ends with the phone locked, and a
// lifter should not have to unlock to see what is next, so WorkoutTimer keeps the workout as an
// ongoing lock-screen and status bar notification (an Android 16 Live Update) for as long as it
// runs: a live countdown with an exact alarm at the persisted end time during rest, plank and
// stretch, the set to do while lifting, and buttons (Log set, Skip rest, Undo) that come back here
// as actions. It is derived from state on every refresh, so every change moves or clears it. In
// the browser it is a no-op.

/** A notification button; the app runs it like the matching button on screen. */
export type NativeAction = 'log' | 'skip' | 'next' | 'undo';

export interface NativeStatus {
  /** When the countdown ends, or null while nothing counts (lifting). */
  endsAt: number | null;
  /** The countdown's full length, so the notification's bar can show how much is left. */
  total: number;
  title: string;
  text: string;
  /** The finish line: which exercise out of how many and the minutes left. */
  progress: string;
  /** The status bar chip while nothing counts down (a countdown shows its time instead). */
  chip: string;
  actions: NativeAction[];
  doneTitle: string;
  doneText: string;
}

interface WorkoutTimerPlugin {
  start(options: NativeStatus & { sound: boolean }): Promise<void>;
  stop(): Promise<void>;
  requestPermissions(): Promise<{ notifications: 'granted' | 'denied' }>;
  addListener(
    event: 'action',
    listener: (data: { action: NativeAction }) => void,
  ): Promise<{ remove: () => Promise<void> }>;
}

/** True inside the Android app, where files ship in the APK instead of a service worker. */
export const nativeApp = Capacitor.isNativePlatform();

const plugin = registerPlugin<WorkoutTimerPlugin>('WorkoutTimer');
const backupFile = registerPlugin<{
  save(options: { fileName: string; contents: string }): Promise<void>;
}>('BackupFile');

/**
 * Saves a backup file: a download in the browser, the system "save as" screen in the Android app
 * (a WebView ignores download links). Cancelling the save is not an error.
 */
export async function saveFile(fileName: string, contents: string) {
  if (nativeApp) {
    await backupFile.save({ fileName, contents }).catch((error: Error) => {
      if (error?.message !== 'cancelled') throw error;
    });
    return;
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

let synced = '';
let asked = false;
// A timed activity (walk, …) counts outside workout state, so its screen hands its status over.
let activityStatus: NativeStatus | null = null;
let workoutStatus: NativeStatus | null = null;

/** Shows (or, with null, clears) a timed activity's countdown in place of the workout's. */
export function setActivityStatus(status: NativeStatus | null) {
  activityStatus = status;
  push();
}

/** Starts, updates or stops the native status; repeated calls with no change are free. */
export function syncNativeStatus(status: NativeStatus | null) {
  workoutStatus = status;
  push();
}

/** Runs a notification button's action; the native side queues one that arrives before this. */
export function onNativeAction(run: (action: NativeAction) => void) {
  if (nativeApp) void plugin.addListener('action', ({ action }) => run(action)).catch(() => {});
}

function push() {
  if (!nativeApp) return;
  const live =
    activityStatus && (activityStatus.endsAt || 0) > Date.now() ? activityStatus : workoutStatus;
  const options = live && { ...live, sound: soundEnabled() };
  const key = JSON.stringify(options);
  if (key === synced) return;
  synced = key;
  if (!options) {
    void plugin.stop().catch(() => {});
    return;
  }
  // Ask for notifications the first time a workout runs, when the reason is in front of the user.
  const ready = asked ? Promise.resolve() : plugin.requestPermissions().catch(() => {});
  asked = true;
  void ready.then(() => plugin.start(options)).catch(() => {});
}
