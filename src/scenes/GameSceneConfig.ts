import { runCountdown } from "../design-system/components/Countdown";

export { runCountdown as runCountdownSequence };

export const GAME_DURATION = 60;
export const GAME_TRACKER_FPS = 24;
export const GAME_WEBCAM_FPS = 24;
export const TIMER_ARC_FPS = 30;
export const TIMER_ARC_FRAME_MS = 1000 / TIMER_ARC_FPS;
export const BACKGROUND_MUSIC_KEY = "music-background-funny-cartoon";

export interface DifficultyTier {
  threshold: number;
  spawnDelay: number;
  radius: number;
  expireDelay: number;
  points: number;
}

export const TIERS: DifficultyTier[] = [
  { threshold: 0,    spawnDelay: 2000, radius: 40, expireDelay: 5000, points: 10 },
  { threshold: 0.33, spawnDelay: 1500, radius: 33, expireDelay: 4000, points: 15 },
  { threshold: 0.66, spawnDelay: 1000, radius: 26, expireDelay: 3000, points: 20 },
];

