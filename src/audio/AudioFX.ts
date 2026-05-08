const ctx = new AudioContext();

type ToneParams = { type: OscillatorType; gainPeak: number };

function playTone(frequency: number, endFrequency: number, duration: number, { type, gainPeak }: ToneParams) {
  if (ctx.state === "suspended") void ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  osc.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);

  gain.gain.setValueAtTime(gainPeak, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

type NoteEntry = { freq: number; end: number; startOffset: number; dur: number; type: OscillatorType; gain: number };

function playSequence(notes: NoteEntry[]) {
  if (ctx.state === "suspended") void ctx.resume();
  const now = ctx.currentTime;
  notes.forEach(({ freq, end, startOffset, dur, type, gain }) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now + startOffset);
    osc.frequency.exponentialRampToValueAtTime(end, now + startOffset + dur);
    gainNode.gain.setValueAtTime(gain, now + startOffset);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + startOffset + dur);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now + startOffset);
    osc.stop(now + startOffset + dur);
  });
}

export const audioFX = {
  pop() {
    playTone(440, 900, 0.1, { type: "sine", gainPeak: 0.4 });
  },

  expire() {
    playTone(300, 150, 0.2, { type: "triangle", gainPeak: 0.2 });
  },

  powerupHit() {
    playSequence([
      { freq: 520, end: 1400, startOffset: 0,    dur: 0.1,  type: "sine",     gain: 0.45 },
      { freq: 880, end: 1760, startOffset: 0.06, dur: 0.15, type: "triangle", gain: 0.28 },
      { freq: 1046, end: 1046, startOffset: 0.16, dur: 0.18, type: "sine",    gain: 0.18 },
    ]);
  },

  milestone(level: 1 | 2 | 3 | 4) {
    const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    const count = level + 1;
    const gap = level <= 2 ? 0.1 : 0.09;
    const gain = 0.18 + level * 0.06;
    const notes: NoteEntry[] = freqs.slice(0, count).map((freq, index) => ({
      freq,
      end: freq * (1 + 0.04 * index),
      startOffset: index * gap,
      dur: 0.22 + index * 0.02,
      type: "sine",
      gain,
    }));
    if (level >= 3) {
      notes.push({ freq: 523.25, end: 523.25, startOffset: 0, dur: count * gap + 0.3, type: "triangle", gain: 0.07 });
    }
    playSequence(notes);
  },

  gameOver() {
    const now = ctx.currentTime;
    if (ctx.state === "suspended") void ctx.resume();

    [523.25, 659.25, 783.99, 1046.5].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteTime = now + index * 0.14;
      osc.type = index === 3 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, noteTime);
      gain.gain.setValueAtTime(0.28, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(noteTime);
      osc.stop(noteTime + 0.32);
    });

    [261.63, 392, 523.25].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteTime = now + 0.52;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, noteTime);
      gain.gain.setValueAtTime(0.11, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.75);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(noteTime);
      osc.stop(noteTime + 0.75);
    });
  },
};
