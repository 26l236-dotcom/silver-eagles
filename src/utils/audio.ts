class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  playTone(freq: number, durationMs: number, type: OscillatorType = 'sine', volume = 0.14) {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  }

  playBuzzer(buttonIndex = 0) {
    const freqs = [523.25, 659.25, 783.99, 880.0];
    this.playTone(freqs[buttonIndex % freqs.length], 140, 'triangle', 0.16);
  }

  playCorrect() {
    this.playTone(523.25, 110, 'sine', 0.14);
    setTimeout(() => this.playTone(659.25, 110, 'sine', 0.14), 95);
    setTimeout(() => this.playTone(783.99, 220, 'sine', 0.16), 190);
  }

  playWrong() {
    this.playTone(220, 160, 'sawtooth', 0.1);
    setTimeout(() => this.playTone(175, 240, 'sawtooth', 0.1), 150);
  }

  playTick() {
    this.playTone(1046.5, 45, 'square', 0.05);
  }

  playPiezo(freq: number, ms = 180) {
    this.playTone(freq, ms, 'square', 0.12);
  }

  playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 220, 'triangle', 0.16), idx * 120);
    });
  }
}

export const soundEngine = new SoundEngine();
