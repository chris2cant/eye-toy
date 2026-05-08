import type { SimonColor } from "./SimonAudio";
import type { Quadrant } from "./SimonZone";

export const ZONE_SETUP: Array<{ color: SimonColor; quadrant: Quadrant }> = [
  { color: "vert",  quadrant: "top-left" },
  { color: "rouge", quadrant: "top-right" },
  { color: "jaune", quadrant: "bottom-left" },
  { color: "bleu",  quadrant: "bottom-right" },
];

export const SIMON_COLORS: SimonColor[] = ["vert", "rouge", "jaune", "bleu"];
export const FLASH_MS = 600;
export const PAUSE_MS = 300;
export const MAX_LIVES = 3;
export const DWELL_ZONE_MS = 800;
export const DWELL_START_MS = 2000;
export const TRACKER_FPS = 24;
export const WEBCAM_FPS = 20;
export const HS_KEY = "simon-eyetoy-highscore";
