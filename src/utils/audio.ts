import { Howl, Howler } from 'howler';

const MUTE_STORAGE_KEY = 'smartfun360_sfx_muted';

type NoteSegment = {
  freq: number;
  startSec: number;
  durationSec: number;
  gain: number;
  harmonic?: number;
};

/**
 * Generates a smooth, click-free 16-bit PCM WAV data URI in memory so Howler
 * can play subtle, reliable audio cues with zero external network fetches.
 */
function buildWavDataUri(segments: NoteSegment[], sampleRate = 22050): string {
  const totalSec =
    segments.reduce((max, s) => Math.max(max, s.startSec + s.durationSec), 0) + 0.04;
  const numSamples = Math.max(1, Math.ceil(totalSec * sampleRate));
  const pcm = new Float32Array(numSamples);

  for (const seg of segments) {
    const startIdx = Math.floor(seg.startSec * sampleRate);
    const lenIdx = Math.floor(seg.durationSec * sampleRate);
    const attackSamples = Math.max(1, Math.floor(0.008 * sampleRate));
    const harmonic = seg.harmonic ?? 0.18;

    for (let i = 0; i < lenIdx && startIdx + i < numSamples; i += 1) {
      const t = i / sampleRate;
      const progress = i / lenIdx;
      const attackEnv = i < attackSamples ? i / attackSamples : 1;
      const decayEnv = Math.pow(1 - progress, 2.2);
      const wave =
        Math.sin(2 * Math.PI * seg.freq * t) +
        harmonic * Math.sin(2 * Math.PI * seg.freq * 2 * t);
      pcm[startIdx + i] += seg.gain * attackEnv * decayEnv * wave;
    }
  }

  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i += 1) {
    const clamped = Math.max(-0.95, Math.min(0.95, pcm[i]));
    view.setInt16(offset, Math.round(clamped * 32767), true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

type CueKey =
  | 'correct'
  | 'xp'
  | 'wrong'
  | 'victory'
  | 'tick'
  | 'tap0'
  | 'tap1'
  | 'tap2'
  | 'tap3';

class SoundEngine {
  private _muted = false;
  private cues: Partial<Record<CueKey, Howl>> = {};
  private piezoCtx: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(MUTE_STORAGE_KEY);
        this._muted = stored === 'true';
        Howler.mute(this._muted);
      } catch {
        // ignore storage errors
      }
    }
  }

  get muted(): boolean {
    return this._muted;
  }

  set muted(value: boolean) {
    this.setMuted(value);
  }

  setMuted(value: boolean): void {
    this._muted = value;
    Howler.mute(value);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(MUTE_STORAGE_KEY, String(value));
      } catch {
        // ignore storage errors
      }
    }
  }

  private getCue(key: CueKey): Howl | null {
    if (this._muted || typeof window === 'undefined') return null;

    if (!this.cues[key]) {
      const specs: Record<CueKey, { volume: number; notes: NoteSegment[] }> = {
        // Subtle two-note warm bell interval for correct quiz answers (C5 -> E5)
        correct: {
          volume: 0.24,
          notes: [
            { freq: 523.25, startSec: 0, durationSec: 0.14, gain: 0.55, harmonic: 0.16 },
            { freq: 659.25, startSec: 0.085, durationSec: 0.22, gain: 0.65, harmonic: 0.14 },
          ],
        },
        // Delicate ascending crystal shimmer when XP increases (G5 -> B5 -> D6)
        xp: {
          volume: 0.2,
          notes: [
            { freq: 783.99, startSec: 0, durationSec: 0.11, gain: 0.45, harmonic: 0.1 },
            { freq: 987.77, startSec: 0.065, durationSec: 0.13, gain: 0.5, harmonic: 0.1 },
            { freq: 1174.66, startSec: 0.13, durationSec: 0.24, gain: 0.55, harmonic: 0.08 },
          ],
        },
        // Soft muted low nudge for wrong answers
        wrong: {
          volume: 0.18,
          notes: [
            { freq: 246.94, startSec: 0, durationSec: 0.12, gain: 0.45, harmonic: 0.05 },
            { freq: 196.0, startSec: 0.1, durationSec: 0.18, gain: 0.4, harmonic: 0.04 },
          ],
        },
        // Uplifting championship / level-complete arpeggio
        victory: {
          volume: 0.24,
          notes: [
            { freq: 523.25, startSec: 0, durationSec: 0.14, gain: 0.45, harmonic: 0.14 },
            { freq: 659.25, startSec: 0.09, durationSec: 0.14, gain: 0.5, harmonic: 0.14 },
            { freq: 783.99, startSec: 0.18, durationSec: 0.16, gain: 0.55, harmonic: 0.12 },
            { freq: 1046.5, startSec: 0.27, durationSec: 0.3, gain: 0.6, harmonic: 0.1 },
          ],
        },
        tick: {
          volume: 0.1,
          notes: [{ freq: 980, startSec: 0, durationSec: 0.045, gain: 0.4, harmonic: 0.05 }],
        },
        tap0: {
          volume: 0.16,
          notes: [{ freq: 523.25, startSec: 0, durationSec: 0.1, gain: 0.45, harmonic: 0.12 }],
        },
        tap1: {
          volume: 0.16,
          notes: [{ freq: 587.33, startSec: 0, durationSec: 0.1, gain: 0.45, harmonic: 0.12 }],
        },
        tap2: {
          volume: 0.16,
          notes: [{ freq: 659.25, startSec: 0, durationSec: 0.1, gain: 0.45, harmonic: 0.12 }],
        },
        tap3: {
          volume: 0.16,
          notes: [{ freq: 783.99, startSec: 0, durationSec: 0.1, gain: 0.45, harmonic: 0.12 }],
        },
      };

      const spec = specs[key];
      this.cues[key] = new Howl({
        src: [buildWavDataUri(spec.notes)],
        volume: spec.volume,
        preload: true,
      });
    }

    return this.cues[key] ?? null;
  }

  private playCue(key: CueKey) {
    if (this._muted) return;
    const howl = this.getCue(key);
    if (howl) {
      howl.play();
    }
  }

  playBuzzer(buttonIndex = 0) {
    const tapKeys: CueKey[] = ['tap0', 'tap1', 'tap2', 'tap3'];
    this.playCue(tapKeys[Math.abs(buttonIndex) % tapKeys.length]);
  }

  playCorrect() {
    this.playCue('correct');
  }

  playXpGain() {
    this.playCue('xp');
  }

  playWrong() {
    this.playCue('wrong');
  }

  playTick() {
    this.playCue('tick');
  }

  playVictory() {
    this.playCue('victory');
  }

  // Dynamic frequency helper preserved for Arduino Hardware Piezo simulator
  playPiezo(freq: number, durationMs = 180) {
    if (this._muted || typeof window === 'undefined') return;
    if (!this.piezoCtx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.piezoCtx = new AudioCtx();
      }
    }
    const ctx = Howler.ctx || this.piezoCtx;
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  }
}

export const soundEngine = new SoundEngine();
