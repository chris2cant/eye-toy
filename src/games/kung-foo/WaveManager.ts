export type Difficulty = "easy" | "medium" | "hard";

export interface Platform {
  side: "left" | "right";
  stageIdx: 0 | 1;
}

export interface WaveConfig {
  waveIndex: number;
  speedPx: number;
  pointsPerKill: number;
  hasPowerup: boolean;
}

export interface SpawnEntry {
  delayMs: number;
  platform: Platform;
  variant: "normal" | "powerup";
  waitMs: number;
}

interface DifficultyParams {
  speedIncrement: number;
  ninjaRange: [number, number];
  powerupChance: number;
  waitRange: [number, number]; // ms sur la plateforme avant de sauter
}

const DIFFICULTY_PARAMS: Record<Difficulty, DifficultyParams> = {
  easy:   { speedIncrement: 0,  ninjaRange: [1, 2], powerupChance: 0.2,  waitRange: [2000, 3200] },
  medium: { speedIncrement: 0,  ninjaRange: [2, 3], powerupChance: 0.35, waitRange: [1200, 2200] },
  hard:   { speedIncrement: 0,  ninjaRange: [2, 4], powerupChance: 0.5,  waitRange: [500,  1400] },
};

const SPAWN_INTERVAL_MS = 600;
const BASE_POINTS = 100;
const POINTS_INCREMENT = 20;

const ALL_PLATFORMS: Platform[] = [
  { side: "left",  stageIdx: 0 },
  { side: "left",  stageIdx: 1 },
  { side: "right", stageIdx: 0 },
  { side: "right", stageIdx: 1 },
];

export class WaveManager {
  private waveIndex = 0;
  private readonly params: DifficultyParams;

  constructor(difficulty: Difficulty) {
    this.params = DIFFICULTY_PARAMS[difficulty];
  }

  nextWave(): WaveConfig {
    const idx = this.waveIndex++;
    const pointsPerKill = BASE_POINTS + idx * POINTS_INCREMENT;
    const hasPowerup = Math.random() < this.params.powerupChance;
    return { waveIndex: idx, speedPx: 0, pointsPerKill, hasPowerup };
  }

  getSpawnSchedule(config: WaveConfig): SpawnEntry[] {
    const [min, max] = this.params.ninjaRange;
    const count = Math.floor(Math.random() * (max - min + 1)) + min;
    const [waitMin, waitMax] = this.params.waitRange;

    const shuffled = [...ALL_PLATFORMS].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    return selected.map((platform, i) => ({
      delayMs: i * SPAWN_INTERVAL_MS,
      platform,
      variant: (config.hasPowerup && i === count - 1) ? "powerup" : "normal",
      waitMs: Math.floor(Math.random() * (waitMax - waitMin + 1)) + waitMin,
    }));
  }
}
