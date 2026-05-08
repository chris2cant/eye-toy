import type { DwellButton } from "../../design-system/DwellButton";
import type { LivesBadgeHandle } from "../../design-system/components/LivesBadge";
import type { Ninja } from "./Ninja";
import type { Difficulty, WaveConfig, WaveManager } from "./WaveManager";
import type { MotionDetector } from "../sable-magique/MotionDetector";

export const PALM_LANDMARK = 9;
export const KF_GAME_DURATION = 60;
export const KF_WEBCAM_FPS = 24;
export const KF_HAND_TRACKER_FPS = 15;
export const KF_MIN_INTENSITY = 0.15;
export const KF_WOOSH_INTENSITY = 0.45;
export const KF_WOOSH_COOLDOWN_MS = 1000;
export const KF_HIT_TOLERANCE = 20;
export const KF_TURBO_DURATION_MS = 5000;
export const KF_BETWEEN_WAVES_MS = 2000;
export const MAX_LIVES = 3;
export const PLAT_W = 160;
export const NINJA_ON_PLAT_X = PLAT_W / 2;
export const STAGE_Y_FRACS = [0.28, 0.55] as const;
export const JUMP_DURATION_MIN = 650;
export const JUMP_DURATION_MAX = 950;

export interface KungFooState {
  handPositions: ({ x: number; y: number } | null)[];
  motionDetector?: MotionDetector;
  btnBack?: DwellButton;
  ninjas: Ninja[];
  waveManager?: WaveManager;
  currentWaveConfig?: WaveConfig;
  ninjasSpawnedInWave: number;
  ninjasTotalInWave: number;
  wavePaused: boolean;
  spawnTimers: Phaser.Time.TimerEvent[];
  score: number;
  lives: number;
  gameActive: boolean;
  gameStartTimestamp: number;
  lastTickSecond: number;
  turboActive: boolean;
  turboTimeLeftMs: number;
  turboOverlay?: Phaser.GameObjects.Rectangle;
  turboText?: Phaser.GameObjects.Text;
  turboBackground?: Phaser.GameObjects.Rectangle;
  livesBadge?: LivesBadgeHandle;
  difficultyButtons: DwellButton[];
  difficultyUiElements: Phaser.GameObjects.GameObject[];
  milestones: number[];
  nextMilestoneIdx: number;
  bgMusic: Phaser.Sound.BaseSound | null;
  lastWooshAt: number;
  difficulty?: Difficulty;
}

export function createKungFooState(): KungFooState {
  return {
    handPositions: [null, null],
    ninjas: [],
    ninjasSpawnedInWave: 0,
    ninjasTotalInWave: 0,
    wavePaused: false,
    spawnTimers: [],
    score: 0,
    lives: MAX_LIVES,
    gameActive: false,
    gameStartTimestamp: 0,
    lastTickSecond: KF_GAME_DURATION,
    turboActive: false,
    turboTimeLeftMs: 0,
    difficultyButtons: [],
    difficultyUiElements: [],
    milestones: [],
    nextMilestoneIdx: 0,
    bgMusic: null,
    lastWooshAt: 0,
  };
}
