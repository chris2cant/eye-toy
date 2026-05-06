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

export const audioFX = {
  pop() {
    playTone(440, 900, 0.1, { type: "sine", gainPeak: 0.4 });
  },

  expire() {
    playTone(300, 150, 0.2, { type: "triangle", gainPeak: 0.2 });
  },

  gameOver() {
    const now = ctx.currentTime;
    if (ctx.state === "suspended") void ctx.resume();

    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteTime = now + i * 0.14;
      osc.type = i === 3 ? "triangle" : "sine";
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
