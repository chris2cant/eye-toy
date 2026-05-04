const ctx = new AudioContext();

function playTone(
  frequency: number,
  endFrequency: number,
  duration: number,
  type: OscillatorType,
  gainPeak: number,
) {
  // AudioContext peut être suspendu avant une interaction utilisateur
  if (ctx.state === "suspended") ctx.resume();

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

export const AudioFX = {
  pop() {
    // Court "bloop" montant — récompense
    playTone(440, 900, 0.1, "sine", 0.4);
  },

  expire() {
    // Ton descendant discret — raté
    playTone(300, 150, 0.2, "triangle", 0.2);
  },

  gameOver() {
    // Trois notes descendantes — fin de partie
    const now = ctx.currentTime;
    if (ctx.state === "suspended") ctx.resume();
    [523, 392, 262].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + i * 0.18;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  },
};
