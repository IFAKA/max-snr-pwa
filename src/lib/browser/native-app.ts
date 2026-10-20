import { Capacitor, registerPlugin } from '@capacitor/core';
import type { ActiveWorkout, AppState } from '../types.ts';
import { PLANK_MS, REST_MS, STRETCH_MS } from '../constants.ts';
import { soundEnabled } from './sound.ts';

// The Android app's native edges (Capacitor plugins in android/app/src/main/java/…/workout/).
// Timer: a suspended web page cannot ring when rest ends with the phone locked, so WorkoutTimer
// mirrors the running rest, plank or stretch as an ongoing lock-screen countdown and an exact
// alarm at the persisted end time. It is derived from state on every refresh, so Skip, Undo,
// ±time, cancel and finish all move or clear it. In the browser the timer sync is a no-op.

export interface NativeTimer {
  endsAt: number;
  /** The full length, so the notification's bar can show how much is left. */
  total: number;
  title: string;
  text: string;
  doneTitle: string;
  doneText: string;
}

interface WorkoutTimerPlugin {
  start(options: NativeTimer & { sound: boolean }): Promise<void>;
  stop(): Promise<void>;
  requestPermissions(): Promise<{ notifications: 'granted' | 'denied' }>;
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

function restTimer(active: ActiveWorkout, endsAt: number): NativeTimer {
  const next = Number.isInteger(active.nextPos) ? active.tasks[active.nextPos as number] : null;
  const name = next?.performedName;
  const set = next ? `set ${next.set} of ${next.sets}` : '';
  return {
    endsAt,
    total: active.tasks[active.pos]?.restMs || REST_MS,
    title: 'Rest',
    text: name ? `Next: ${name} · ${set}` : 'Next set when the timer ends',
    doneTitle: 'Rest over',
    doneText: name ? `${name}, ${set}` : 'Time for your next set',
  };
}

/** The timer the lock screen should show for this state, or null when nothing is counting. */
export function nativeTimerFor(state: AppState, now = Date.now()): NativeTimer | null {
  const active = state.active;
  if (!active) return null;
  if (active.restEndsAt && active.restEndsAt > now) return restTimer(active, active.restEndsAt);
  const endsAt = active.timerEndsAt;
  if (!endsAt || endsAt <= now) return null;
  if (active.phase === 'plank')
    return {
      endsAt,
      total: PLANK_MS,
      title: 'Plank',
      text: 'Hold',
      doneTitle: 'Plank done',
      doneText: 'Rest up',
    };
  if (active.phase === 'stretch')
    return {
      endsAt,
      total: STRETCH_MS,
      title: 'Stretch',
      text: 'Breathe and hold',
      doneTitle: 'Stretch done',
      doneText: 'Finish when ready',
    };
  return null;
}

let synced = '';
let asked = false;
// A timed activity (walk, …) counts outside workout state, so its screen hands its timer over.
let activityTimer: NativeTimer | null = null;

/** Shows (or, with null, clears) a timed activity's countdown in the native timer. */
export function setActivityTimer(timer: NativeTimer | null, state: AppState) {
  activityTimer = timer;
  syncNativeTimer(state);
}

/** Starts, moves or stops the native timer to match state; repeated calls with no change are free. */
export function syncNativeTimer(state: AppState) {
  if (!nativeApp) return;
  const timer =
    activityTimer && activityTimer.endsAt > Date.now() ? activityTimer : nativeTimerFor(state);
  const options = timer && { ...timer, sound: soundEnabled() };
  const key = JSON.stringify(options);
  if (key === synced) return;
  synced = key;
  if (!options) {
    void plugin.stop().catch(() => {});
    return;
  }
  // Ask for notifications the first time a timer runs, when the reason is in front of the user.
  const ready = asked ? Promise.resolve() : plugin.requestPermissions().catch(() => {});
  asked = true;
  void ready.then(() => plugin.start(options)).catch(() => {});
}
