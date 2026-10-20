// Synthesized workout sounds: Web Audio builds each one on the fly, so there are no files to cache
// and they play offline. The palette is calm: a soft struck bar for picks, a dry ratchet click for
// each value a wheel turns past and a low seat when it comes to rest, a muted plate knock for a
// logged set, clear pips for a timer's last seconds, a bright two-note call when it ends, and warm
// chords for a better set and the finish. One limiter keeps stacked sounds from distorting, and each
// play shifts pitch and loudness a little so repeats don't sound canned. Browsers block audio until
// a gesture, so the first tap starts the context; a timer can then sound on its own later.
const SOUND_KEY = 'maxsnr-sound';

export type Sound = 'detent' | 'seat' | 'tick' | 'pip' | 'go' | 'log' | 'best' | 'finish' | 'undo';

let ctx: AudioContext | null = null;
let master: AudioNode | null = null;
let noise: AudioBuffer | null = null;
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
    const gain = audio.createGain();
    gain.gain.value = 0.85;
    gain.connect(limiter);
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

// A filtered slice of noise: the knock of a plate or the scrape of a bar.
function burst(voice: Voice, freq: number, dur: number, gain: number) {
  if (!noise) return;
  const source = voice.audio.createBufferSource();
  const filter = voice.audio.createBiquadFilter();
  const level = voice.audio.createGain();
  source.buffer = noise;
  filter.type = 'bandpass';
  filter.frequency.value = freq * voice.k;
  filter.Q.value = 1.4;
  envelope(level, voice.t, gain, 0.002, dur);
  source.connect(filter).connect(level).connect(voice.out);
  source.start(voice.t, Math.random() * 0.8, dur + 0.02);
}

const chord = (voice: Voice, freqs: number[], at: number, step: number, dur: number) =>
  freqs.forEach((freq, index) =>
    tone(voice, { freq, dur, type: 'triangle', gain: 0.11, at: at + index * step, attack: 0.012 }),
  );

const SOUNDS: Record<Sound, (voice: Voice) => void> = {
  // A crown's ratchet: a dry tick of filtered noise on a tiny wooden body, short enough that a
  // fast flick reads as a free-spinning wheel rather than a run of beeps.
  detent: (voice) => {
    burst(voice, 3400, 0.012, 0.16);
    tone(voice, { freq: 2100, dur: 0.018, type: 'triangle', gain: 0.045, attack: 0.001 });
  },
  // The wheel seating on a value: a softer, lower thock, like a detent clicking home.
  seat: (voice) => {
    burst(voice, 1500, 0.022, 0.18);
    tone(voice, { freq: 620, to: 500, dur: 0.07, gain: 0.13, attack: 0.002 });
  },
  tick: (voice) => {
    tone(voice, { freq: 1500, dur: 0.04, type: 'triangle', gain: 0.07 });
    tone(voice, { freq: 2600, dur: 0.025, gain: 0.03 });
  },
  pip: (voice) => {
    tone(voice, { freq: 880, dur: 0.13, gain: 0.24 });
    tone(voice, { freq: 1760, dur: 0.06, gain: 0.05 });
  },
  go: (voice) => {
    tone(voice, { freq: 660, dur: 0.16, type: 'triangle', gain: 0.22 });
    tone(voice, { freq: 990, dur: 0.5, type: 'triangle', gain: 0.24, at: 0.14 });
    tone(voice, { freq: 1980, dur: 0.3, gain: 0.05, at: 0.14 });
  },
  log: (voice) => {
    burst(voice, 700, 0.07, 0.35);
    tone(voice, { freq: 150, to: 70, dur: 0.16, gain: 0.45 });
    tone(voice, { freq: 1180, dur: 0.35, gain: 0.035 });
    tone(voice, { freq: 1730, dur: 0.25, gain: 0.025 });
  },
  undo: (voice) => {
    tone(voice, { freq: 330, to: 262, dur: 0.18, type: 'triangle', gain: 0.18 });
  },
  best: (voice) => {
    SOUNDS.log(voice);
    chord(voice, [1047, 1319, 1568], 0.12, 0.07, 0.55);
  },
  finish: (voice) => {
    chord(voice, [523, 659, 784, 1047], 0, 0.09, 0.3);
    chord(voice, [523, 659, 784, 1047], 0.38, 0, 1.3);
  },
};

// Cues that mark time keep their exact pitch; the rest vary a little each play.
const STEADY = new Set<Sound>(['pip', 'go']);

/** Plays a sound; `level` scales its loudness and `pitch` shifts it (1 is as designed). */
export function playSound(name: Sound, level = 1, pitch = 1) {
  if (!enabled) return;
  const audio = context();
  if (!audio || !master) return;
  const out = audio.createGain();
  out.gain.value = level * (0.9 + Math.random() * 0.1);
  out.connect(master);
  const k = pitch * (STEADY.has(name) ? 1 : 1 + (Math.random() - 0.5) * 0.04);
  SOUNDS[name]({ audio, out, t: audio.currentTime + 0.005, k });
}

// Start (or wake) the audio context on a gesture so later timer cues are allowed to play.
const unlock = () => {
  if (enabled) context();
};
globalThis.addEventListener?.('pointerdown', unlock, { capture: true, passive: true });
globalThis.addEventListener?.('keydown', unlock, { capture: true, passive: true });
