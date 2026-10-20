// Synthesized workout sounds: Web Audio builds each one on the fly, so there are no files to cache
// and they play offline. They are one family, struck rather than beeped: each is a set of decaying
// partials tuned like a real material (a wooden bar, a glass bar, a steel plate, felt), all in D
// major and sharing one small room, so every sound says what happened by what it sounds like:
// - the wheel: a tiny wooden ratchet per value, and a magnet clacking home when it rests;
// - starting a workout: a short count-in that leaps up and stops, unresolved; skipping rest: air and a light rising note;
// - a swipe crossing its threshold: a latch catching (up) or letting go (down);
// - a timer's last seconds: a glass A that the end resolves;
// - rest over: a rising call (D to A), time to lift; a hold over: a falling one, let go;
// - a logged set: a plate set down on the rack; a better one adds a rising sparkle;
// - undo: a reversed swell falling back; the finish: a warm opening chord with a long tail.
// One limiter keeps stacked sounds clean, and each play shifts pitch and loudness a little so
// repeats don't sound canned. Browsers block audio until a gesture, so the first tap starts the
// context; a timer can then sound on its own later.
const SOUND_KEY = 'maxsnr-sound';

export type Sound =
  | 'detent'
  | 'seat'
  | 'begin'
  | 'skip'
  | 'tick'
  | 'arm'
  | 'disarm'
  | 'pip'
  | 'go'
  | 'done'
  | 'log'
  | 'best'
  | 'finish'
  | 'undo';

let ctx: AudioContext | null = null;
let master: AudioNode | null = null;
let noise: AudioBuffer | null = null;
let reverb: AudioNode | null = null;
let enabled = (() => {
  try {
    return globalThis.localStorage?.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
})();

export const soundEnabled = () => enabled;

export function setSoundEnabled(on: boolean) {
  enabled = on;
  try {
    globalThis.localStorage?.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    // Private mode: keep the choice for this visit.
  }
}

function room(audio: AudioContext, out: AudioNode) {
  // A small, dark room: a second of decaying noise, filtered so the tail is warm, not hissy.
  const length = Math.floor(audio.sampleRate * 1.1);
  const impulse = audio.createBuffer(2, length, audio.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let index = 0; index < length; index++) {
      data[index] = (Math.random() * 2 - 1) * Math.exp(-index / (audio.sampleRate * 0.28));
    }
  }
  const tone = audio.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 3800;
  const convolver = audio.createConvolver();
  convolver.buffer = impulse;
  tone.connect(convolver).connect(out);
  return tone;
}

function context() {
  if (typeof AudioContext === 'undefined') return null;
  if (!ctx) {
    const audio = new AudioContext();
    const limiter = audio.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.15;
    limiter.connect(audio.destination);
    // Phone speakers turn the top octave into fizz; keep it smooth.
    const smooth = audio.createBiquadFilter();
    smooth.type = 'lowpass';
    smooth.frequency.value = 9000;
    smooth.connect(limiter);
    const gain = audio.createGain();
    gain.gain.value = 0.85;
    gain.connect(smooth);
    reverb = room(audio, gain);
    noise = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
    const samples = noise.getChannelData(0);
    for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
    ctx = audio;
    master = gain;
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
  return ctx;
}

// One play of a sound: where it starts, where it goes, and this play's pitch shift.
interface Voice {
  audio: AudioContext;
  out: AudioNode;
  t: number;
  k: number;
}

function envelope(gain: GainNode, t: number, peak: number, attack: number, dur: number) {
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

interface Tone {
  freq: number;
  dur: number;
  to?: number;
  type?: OscillatorType;
  gain?: number;
  at?: number;
  attack?: number;
}

function tone(
  voice: Voice,
  { freq, dur, to, type = 'sine', gain = 0.2, at = 0, attack = 0.004 }: Tone,
) {
  const t = voice.t + at;
  const oscillator = voice.audio.createOscillator();
  const level = voice.audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq * voice.k, t);
  if (to) oscillator.frequency.exponentialRampToValueAtTime(to * voice.k, t + dur);
  envelope(level, t, gain, attack, dur);
  oscillator.connect(level).connect(voice.out);
  oscillator.start(t);
  oscillator.stop(t + dur + 0.02);
}

// A filtered slice of noise: the contact of a mallet, a latch or a plate.
function burst(voice: Voice, freq: number, dur: number, gain: number, at = 0) {
  if (!noise) return;
  const t = voice.t + at;
  const source = voice.audio.createBufferSource();
  const filter = voice.audio.createBiquadFilter();
  const level = voice.audio.createGain();
  source.buffer = noise;
  filter.type = 'bandpass';
  filter.frequency.value = freq * voice.k;
  filter.Q.value = 1.2;
  envelope(level, t, gain, 0.001, dur);
  source.connect(filter).connect(level).connect(voice.out);
  source.start(t, Math.random() * 0.8, dur + 0.02);
}

// Noise swept through a filter: air moving past, for things that move on.
function sweep(voice: Voice, from: number, to: number, dur: number, gain: number) {
  if (!noise) return;
  const source = voice.audio.createBufferSource();
  const filter = voice.audio.createBiquadFilter();
  const level = voice.audio.createGain();
  source.buffer = noise;
  filter.type = 'bandpass';
  filter.Q.value = 2;
  filter.frequency.setValueAtTime(from, voice.t);
  filter.frequency.exponentialRampToValueAtTime(to, voice.t + dur);
  envelope(level, voice.t, gain, dur * 0.6, dur);
  source.connect(filter).connect(level).connect(voice.out);
  source.start(voice.t, Math.random() * 0.7, dur + 0.02);
}

// Partials of struck materials: [frequency ratio, loudness, decay], from modal analysis of each.
type Material = [number, number, number][];
const WOOD: Material = [
  [1, 1, 1],
  [3.93, 0.3, 0.25],
  [9.2, 0.1, 0.08],
];
const GLASS: Material = [
  [1, 1, 1],
  [2.76, 0.4, 0.5],
  [5.4, 0.16, 0.25],
  [8.93, 0.06, 0.12],
];
const PLATE: Material = [
  [1, 1, 1],
  [1.59, 0.6, 0.8],
  [2.14, 0.45, 0.6],
  [2.65, 0.3, 0.5],
  [3.91, 0.18, 0.3],
];
const FELT: Material = [
  [1, 1, 1],
  [2, 0.12, 0.4],
];

/** A struck bar: every partial starts together and dies away at its own rate. */
function strike(
  voice: Voice,
  material: Material,
  freq: number,
  gain: number,
  decay: number,
  at = 0,
) {
  for (const [ratio, loudness, fade] of material) {
    tone(voice, {
      freq: freq * ratio,
      dur: decay * fade,
      gain: gain * loudness,
      at,
      attack: 0.001,
    });
  }
}

// D major, so any two sounds that meet still agree.
const D4 = 293.66;
const D5 = 587.33;
const FS5 = 739.99;
const A5 = 880;
const D6 = 1174.66;
const E6 = 1318.51;
const FS6 = 1479.98;
const A6 = 1760;
const D7 = 2349.32;

const SOUNDS: Record<Sound, (voice: Voice) => void> = {
  detent: (voice) => {
    burst(voice, 4200, 0.007, 0.09);
    strike(voice, WOOD, D7, 0.045, 0.02);
  },
  // A magnet hitting home: a hard little clack over a felt thock and a short low thump.
  seat: (voice) => {
    burst(voice, 2600, 0.006, 0.16);
    burst(voice, 900, 0.02, 0.09);
    strike(voice, FELT, D5, 0.14, 0.11);
    tone(voice, { freq: 170, to: 95, dur: 0.06, gain: 0.22, attack: 0.001 });
  },
  // Starting a workout: a low thump and an air rush building up, then two quick wooden knocks
  // that leap a fifth and stop dry on the high note: a count-in, short and open, with no tail.
  begin: (voice) => {
    tone(voice, { freq: 80, to: 140, dur: 0.12, gain: 0.3, attack: 0.01 });
    sweep(voice, 300, 2600, 0.16, 0.08);
    strike(voice, WOOD, D5, 0.1, 0.14, 0.14);
    strike(voice, WOOD, A5, 0.12, 0.16, 0.22);
    strike(voice, GLASS, A6, 0.05, 0.2, 0.22);
  },
  // Rest cut short: air moving on and a light rising grace note, lighter than rest running out.
  skip: (voice) => {
    sweep(voice, 500, 3200, 0.2, 0.09);
    strike(voice, GLASS, A5, 0.06, 0.2, 0.08);
    strike(voice, GLASS, D6, 0.08, 0.45, 0.14);
  },
  tick: (voice) => strike(voice, GLASS, A6, 0.06, 0.3),
  arm: (voice) => {
    burst(voice, 3000, 0.009, 0.1);
    strike(voice, WOOD, E6, 0.06, 0.05);
    strike(voice, WOOD, A6, 0.05, 0.06, 0.028);
  },
  disarm: (voice) => strike(voice, WOOD, D6, 0.04, 0.045),
  pip: (voice) => strike(voice, GLASS, A5, 0.17, 0.4),
  go: (voice) => {
    strike(voice, WOOD, D5, 0.1, 0.3);
    strike(voice, GLASS, D6, 0.15, 0.55);
    strike(voice, GLASS, A6, 0.17, 1, 0.12);
  },
  done: (voice) =>
    [A6, FS6, D6].forEach((freq, index) => strike(voice, GLASS, freq, 0.12, 1, index * 0.12)),
  log: (voice) => {
    burst(voice, 900, 0.05, 0.2);
    tone(voice, { freq: 120, to: 58, dur: 0.15, gain: 0.42 });
    strike(voice, PLATE, 310, 0.045, 0.6, 0.004);
  },
  undo: (voice) => {
    // Swells that cut off: a sound played backwards, falling back a fourth.
    tone(voice, { freq: A5, dur: 0.12, gain: 0.1, attack: 0.1 });
    tone(voice, { freq: FS5, dur: 0.11, gain: 0.07, attack: 0.09, at: 0.13 });
  },
  best: (voice) => {
    SOUNDS.log(voice);
    [D6, FS6, A6, D7].forEach((freq, index) =>
      strike(voice, GLASS, freq, 0.07, 0.75, 0.1 + index * 0.06),
    );
  },
  finish: (voice) => {
    [D5, FS5, A5, D6, E6].forEach((freq, index) =>
      strike(voice, WOOD, freq, 0.1, 0.8, index * 0.08),
    );
    for (const freq of [D4, A5 / 2, FS5]) {
      tone(voice, { freq, dur: 1.7, type: 'triangle', gain: 0.045, attack: 0.3, at: 0.35 });
    }
    strike(voice, GLASS, D7, 0.04, 1.4, 0.45);
  },
};

// How much of each sound reaches the room: the wheel and latches stay dry and close, the
// moments that matter ring a little.
const ROOM: Record<Sound, number> = {
  detent: 0.03,
  seat: 0.06,
  begin: 0.08,
  skip: 0.2,
  tick: 0.15,
  arm: 0.05,
  disarm: 0.05,
  pip: 0.15,
  go: 0.22,
  done: 0.3,
  log: 0.1,
  undo: 0.2,
  best: 0.3,
  finish: 0.38,
};

// Cues that mark time keep their exact pitch; the rest vary a little each play.
const STEADY = new Set<Sound>(['pip', 'go', 'done']);

/** Plays a sound; `level` scales its loudness and `pitch` shifts it (1 is as designed). */
export function playSound(name: Sound, level = 1, pitch = 1) {
  if (!enabled) return;
  const audio = context();
  if (!audio || !master) return;
  const out = audio.createGain();
  out.gain.value = level * (0.9 + Math.random() * 0.1);
  out.connect(master);
  if (reverb) {
    const send = audio.createGain();
    send.gain.value = ROOM[name];
    out.connect(send).connect(reverb);
  }
  const k = pitch * (STEADY.has(name) ? 1 : 1 + (Math.random() - 0.5) * 0.03);
  SOUNDS[name]({ audio, out, t: audio.currentTime + 0.005, k });
}

// Start (or wake) the audio context on a gesture so later timer cues are allowed to play.
const unlock = () => {
  if (enabled) context();
};
globalThis.addEventListener?.('pointerdown', unlock, { capture: true, passive: true });
globalThis.addEventListener?.('keydown', unlock, { capture: true, passive: true });
