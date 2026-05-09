export const PAINT_CLEAN = {
  webcamFps: 20,
  rounds: 3,
  roundDurationSec: 10,
  roundColors: ["#2FFFAA", "#FFC93C", "#FF4F93"],
  eraseRadiusMin: 28,
  eraseRadiusMax: 92,
  eraseIntensityBoost: 52,
  eraseAlpha: 1,
} as const;

export function computeEraseRadius(spread: number, intensity: number): number {
  const boosted = spread + intensity * PAINT_CLEAN.eraseIntensityBoost;
  return Math.max(PAINT_CLEAN.eraseRadiusMin, Math.min(PAINT_CLEAN.eraseRadiusMax, boosted));
}

export function computeRoundPercent(alphaBytes: Uint8ClampedArray): number {
  if (alphaBytes.length === 0) return 0;
  let transparentPixels = 0;
  for (let i = 3; i < alphaBytes.length; i += 4) {
    if (alphaBytes[i] === 0) transparentPixels++;
  }
  const totalPixels = alphaBytes.length / 4;
  return Math.round((transparentPixels / totalPixels) * 100);
}
