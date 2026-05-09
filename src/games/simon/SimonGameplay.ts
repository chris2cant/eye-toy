import Phaser from "phaser";
import type { SimonColor } from "./SimonAudio";
import { simonAudio } from "./SimonAudio";
import { SIMON_COLORS } from "./SimonSceneConfig";
import type { SimonZone } from "./SimonZone";

export function nextColor(exclude: SimonColor | null): SimonColor {
  const pool = exclude ? SIMON_COLORS.filter((col) => col !== exclude) : SIMON_COLORS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export interface FlashOptions {
  flashMs: number;
  pauseMs: number;
  onComplete: () => void;
}

export function scheduleSequenceFlash(
  time: Phaser.Time.Clock,
  zones: SimonZone[],
  sequence: SimonColor[],
  opts: FlashOptions,
): void {
  let delay = 500;
  for (const color of sequence) {
    const zone = zones.find((z) => z.color === color)!;
    time.delayedCall(delay, () => {
      zone.flash(opts.flashMs);
      simonAudio.playTone(color, opts.flashMs);
    });
    delay += opts.flashMs + opts.pauseMs;
  }
  time.delayedCall(delay, opts.onComplete);
}

export interface ZoneInputState {
  sequence: SimonColor[];
  inputStep: number;
  lives: number;
  score: number;
}

export type ZoneResult =
  | { type: "step"; inputStep: number }
  | { type: "victory"; score: number }
  | { type: "miss"; lives: number }
  | { type: "gameover" };

export function handleZoneInput(color: SimonColor, state: ZoneInputState): ZoneResult {
  if (color !== state.sequence[state.inputStep]) {
    const lives = state.lives - 1;
    return lives <= 0 ? { type: "gameover" } : { type: "miss", lives };
  }
  const inputStep = state.inputStep + 1;
  return inputStep >= state.sequence.length
    ? { type: "victory", score: state.score + 1 }
    : { type: "step", inputStep };
}
