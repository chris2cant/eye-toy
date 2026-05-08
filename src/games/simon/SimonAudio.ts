export type SimonColor = "vert" | "rouge" | "jaune" | "bleu";

const FREQ: Record<SimonColor, number> = {
  vert: 415,
  rouge: 310,
  jaune: 252,
  bleu: 209,
};

class SimonAudioClass {
  private ctx = new AudioContext();

  playTone(color: SimonColor, durationMs: number): void {
    if (this.ctx.state === "suspended") void this.ctx.resume();

    const freq = FREQ[color];
    const dur = durationMs / 1000;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.45, now + 0.01);
    gain.gain.setValueAtTime(0.45, now + dur - 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + dur);
  }

  playError(): void {
    if (this.ctx.state === "suspended") void this.ctx.resume();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }
}

export const simonAudio = new SimonAudioClass();
