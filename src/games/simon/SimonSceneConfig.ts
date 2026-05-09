import type { SimonColor } from "./SimonAudio";
import type { SimonAnchor } from "./SimonZone";

export const ZONE_SETUP: Array<{ color: SimonColor; anchor: SimonAnchor }> = [
  { color: "vert", anchor: "top-left" },
  { color: "rouge", anchor: "top-right" },
  { color: "jaune", anchor: "left" },
  { color: "bleu", anchor: "right" },
];

export const SIMON_COLORS: SimonColor[] = ["vert", "rouge", "jaune", "bleu"];
export const MAX_LIVES = 3;

export type Difficulty = "easy" | "medium" | "hard";
export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
export const DIFFICULTY_CONFIGS: Record<Difficulty, { label: string; flashMs: number; pauseMs: number }> = {
  easy:   { label: "FACILE",    flashMs: 800, pauseMs: 400 },
  medium: { label: "MOYEN",     flashMs: 500, pauseMs: 250 },
  hard:   { label: "DIFFICILE", flashMs: 300, pauseMs: 150 },
};
export const DWELL_ZONE_MS = 800;
export const DWELL_START_MS = 2000;
export const TRACKER_FPS = 24;
export const WEBCAM_FPS = 20;
export const HS_KEY = "simon-eyetoy-highscore";
export const ZONE_RADIUS_RATIO = 0.07;
