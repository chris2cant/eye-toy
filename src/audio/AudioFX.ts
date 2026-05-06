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
    [523, 392, 262].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteTime = now + i * 0.18;
      osc.frequency.setValueAtTime(freq, noteTime);
      gain.gain.setValueAtTime(0.35, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(noteTime);
      osc.stop(noteTime + 0.25);
    });
  },
};
