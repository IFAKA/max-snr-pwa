import { nativeApp } from './native-app.ts';
import { playSound, type Sound } from './sound.ts';

// Each workout moment has one cue: a sound (when Sound is on) and a vibration, so the two agree.
const CUES = {
  pick: { sound: 'tick', vibrate: [8] },
  hold: { sound: 'tick', vibrate: [22] },
  countdown: { sound: 'pip', vibrate: [20] },
  timerDone: { sound: 'done', vibrate: [35, 70] },
  restDone: { sound: 'go', vibrate: [35, 65, 35] },
  setLogged: { sound: 'log', vibrate: [25, 45, 25] },
  betterSet: { sound: 'best', vibrate: [25, 45, 25, 45, 60] },
  armed: { sound: 'arm', vibrate: [30] },
  disarmed: { sound: 'arm', vibrate: [12] },
  undo: { sound: 'undo', vibrate: [20] },
  finished: { sound: 'finish', vibrate: [30, 50, 30, 50, 90] },
} satisfies Record<string, { sound: Sound; vibrate: number[] }>;

export type Cue = keyof typeof CUES;

let lastDetent = 0;
const DETENT_GAP_MS = 40;

/**
 * The click of a turning wheel: a short pulse and a ratchet tick, at most one per 40 ms, so a fast
 * flick through many values stays smooth instead of queueing a buzz and a sound per row. Quick
 * clicks are quieter, as a free-spinning wheel sounds lighter, and the pitch rises a little with
 * `position` (0 to 1 along the values), so the ear hears which way the value moves.
 */
export function detent(position = 0.5) {
  if (nativeApp && document.visibilityState === 'hidden') return;
  const now = performance.now();
  const gap = now - lastDetent;
  if (gap < DETENT_GAP_MS) return;
  lastDetent = now;
  globalThis.navigator?.vibrate?.(8);
  playSound('detent', Math.min(1, Math.max(0.45, gap / 160)), 0.94 + position * 0.12);
}

/** The wheel coming to rest on a value: a firmer pulse and a low seat. */
export function seated() {
  if (nativeApp && document.visibilityState === 'hidden') return;
  globalThis.navigator?.vibrate?.(14);
  playSound('seat');
}

export function cue(name: Cue) {
  // In the Android app a hidden screen hears the native timer alert instead, never both.
  if (nativeApp && document.visibilityState === 'hidden') return;
  const { sound, vibrate } = CUES[name];
  // Vibrate first: the motor is the slower of the two to respond.
  globalThis.navigator?.vibrate?.(vibrate);
  playSound(sound);
}
