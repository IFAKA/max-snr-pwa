import { playSound, type Sound } from './sound.ts';

// Each workout moment has one cue: a sound (when Sound is on) and a vibration, so the two agree.
const CUES = {
  pick: { sound: 'tick', vibrate: [8] },
  countdown: { sound: 'pip', vibrate: [20] },
  timerDone: { sound: 'go', vibrate: [35, 70] },
  restDone: { sound: 'go', vibrate: [35, 65, 35] },
  setLogged: { sound: 'log', vibrate: [25, 45, 25] },
  betterSet: { sound: 'best', vibrate: [25, 45, 25, 45, 60] },
  finished: { sound: 'finish', vibrate: [30, 50, 30, 50, 90] },
} satisfies Record<string, { sound: Sound; vibrate: number[] }>;

export type Cue = keyof typeof CUES;

export function cue(name: Cue) {
  const { sound, vibrate } = CUES[name];
  playSound(sound);
  globalThis.navigator?.vibrate?.(vibrate);
}
