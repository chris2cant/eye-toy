import Phaser from "phaser";
import { audioFX } from "../../audio/AudioFX";
import { showFeedback } from "../../design-system/components/FeedbackBurst";
import { DEPTH, HEX } from "../../design-system/tokens";
import type { MotionCluster } from "../sable-magique/MotionDetector";
import { Ninja } from "./Ninja";
import { WaveManager } from "./WaveManager";
import type { Difficulty, Platform } from "./WaveManager";
import {
  KF_BETWEEN_WAVES_MS, KF_GAME_DURATION, KF_HIT_TOLERANCE, KF_TURBO_DURATION_MS, KF_WOOSH_COOLDOWN_MS, KF_WOOSH_INTENSITY,
  KF_MIN_INTENSITY, JUMP_DURATION_MAX, JUMP_DURATION_MIN, MAX_LIVES, NINJA_ON_PLAT_X, STAGE_Y_FRACS,
} from "./KungFooState";
import type { KungFooState } from "./KungFooState";

export function initWaveManager(state: KungFooState, difficulty: Difficulty): void {
  state.waveManager = new WaveManager(difficulty);
}

export function startGame(scene: Phaser.Scene, state: KungFooState): void {
  state.score = 0;
  state.lives = MAX_LIVES;
  state.gameStartTimestamp = performance.now();
  state.lastTickSecond = KF_GAME_DURATION;
  scene.scene.launch("UIScene");
  scene.scene.bringToTop("UIScene");
  scene.game.events.emit("score:update", 0);
  scene.game.events.emit("timer:update", KF_GAME_DURATION);
  state.gameActive = true;
  startBgMusic(scene, state);
  spawnNextWave(scene, state);
}

export function spawnNextWave(scene: Phaser.Scene, state: KungFooState): void {
  if (!state.waveManager || !state.gameActive) return;
  state.wavePaused = true;
  scene.time.delayedCall(KF_BETWEEN_WAVES_MS, () => {
    if (!state.waveManager || !state.gameActive) return;
    const config = state.waveManager.nextWave();
    state.currentWaveConfig = config;
    const schedule = state.waveManager.getSpawnSchedule(config);
    state.ninjasSpawnedInWave = 0;
    state.ninjasTotalInWave = schedule.length;
    state.wavePaused = false;
    schedule.forEach((entry) => {
      const timer = scene.time.delayedCall(entry.delayMs, () => {
        spawnNinja(scene, state, {
          platform: entry.platform,
          waitMs: entry.waitMs,
          pointValue: config.pointsPerKill,
          variant: entry.variant,
        });
      });
      state.spawnTimers.push(timer);
    });
  });
}

function spawnNinja(
  scene: Phaser.Scene,
  state: KungFooState,
  spec: { platform: Platform; waitMs: number; pointValue: number; variant: "normal" | "powerup" },
): void {
  const { platform, waitMs, pointValue, variant } = spec;
  if (!state.gameActive) return;
  if (state.ninjas.some((ninja) => ninja.side === platform.side && ninja.stageIdx === platform.stageIdx)) return;
  const { width, height } = scene.scale;
  const platformX = platform.side === "left" ? NINJA_ON_PLAT_X : width - NINJA_ON_PLAT_X;
  const platformY = STAGE_Y_FRACS[platform.stageIdx] * height;
  const jumpTargetX = width / 2 + Phaser.Math.Between(-50, 50);
  const jumpTargetY = platform.stageIdx === 0 ? height * 0.38 : height * 0.56;
  const ninja = new Ninja(scene, platformX, platformY, {
    variant, pointValue, side: platform.side, stageIdx: platform.stageIdx, waitMs, jumpTargetX, jumpTargetY,
    jumpDurationMs: Phaser.Math.Between(JUMP_DURATION_MIN, JUMP_DURATION_MAX), jumpArcHeight: Phaser.Math.Between(160, 280),
  });
  state.ninjas.push(ninja);
  state.ninjasSpawnedInWave++;
}

export function processMotion(scene: Phaser.Scene, state: KungFooState, clusters: MotionCluster[]): void {
  if (!state.gameActive) return;
  for (const cluster of clusters) {
    if (cluster.intensity < KF_MIN_INTENSITY) continue;
    for (const ninja of state.ninjas) {
      if (ninja.state !== "waiting" && ninja.state !== "jumping") continue;
      const hb = ninja.getHitBox();
      const dist = Math.hypot(cluster.x - hb.x, cluster.y - hb.y);
      if (dist <= hb.radius + KF_HIT_TOLERANCE) { processNinjaHit(scene, state, ninja); break; }
    }
  }
  const hasStrongMotion = clusters.some((cluster) => cluster.intensity > KF_WOOSH_INTENSITY);
  const now = performance.now();
  if (hasStrongMotion && now - state.lastWooshAt >= KF_WOOSH_COOLDOWN_MS) {
    scene.sound.play("sfx-woosh-hand", { volume: 0.5 });
    state.lastWooshAt = now;
  }
}

function processNinjaHit(scene: Phaser.Scene, state: KungFooState, ninja: Ninja): void {
  const killed = ninja.receiveHit();
  if (!killed) return;
  const base = state.turboActive ? ninja.pointValue * 2 : ninja.pointValue;
  const points = ninja.sniperHit ? base * 2 : base;
  const prevScore = state.score;
  state.score += points;
  scene.game.events.emit("score:update", state.score);
  if (ninja.variant === "powerup") { scene.sound.play("sfx-punch", { volume: 0.9 }); audioFX.powerupHit(); activateTurbo(state); }
  else scene.sound.play("sfx-punch", { volume: 0.7 });
  checkMilestone(state, prevScore, state.score);
  showFeedback(scene, { x: ninja.x, y: ninja.y, points, label: ninja.sniperHit ? "SNIPER!" : undefined });
  state.ninjas = state.ninjas.filter((activeNinja) => activeNinja !== ninja);
}

function checkMilestone(state: KungFooState, prevScore: number, newScore: number): void {
  while (state.nextMilestoneIdx < state.milestones.length && newScore >= state.milestones[state.nextMilestoneIdx] && prevScore < state.milestones[state.nextMilestoneIdx]) {
    audioFX.milestone((state.nextMilestoneIdx + 1) as 1 | 2 | 3 | 4);
    state.nextMilestoneIdx++;
  }
}

function activateTurbo(state: KungFooState): void {
  state.turboActive = true;
  state.turboTimeLeftMs = KF_TURBO_DURATION_MS;
  state.turboOverlay?.setAlpha(0.06).setVisible(true);
  state.turboBackground?.setVisible(true);
  state.turboText?.setVisible(true);
}

function updateTurbo(state: KungFooState, delta: number): void {
  if (!state.turboActive) return;
  state.turboTimeLeftMs -= delta;
  if (state.turboTimeLeftMs <= 0) {
    state.turboActive = false;
    state.turboOverlay?.setVisible(false);
    state.turboBackground?.setVisible(false);
    state.turboText?.setVisible(false);
  }
}

export function advanceGame(scene: Phaser.Scene, state: KungFooState, delta: number): void {
  state.motionDetector?.tick();
  state.ninjas.forEach((ninja) => ninja.advance(delta));
  checkNinjasReachedCenter(scene, state);
  checkWaveComplete(scene, state);
  updateTurbo(state, delta);
}

function checkNinjasReachedCenter(scene: Phaser.Scene, state: KungFooState): void {
  if (!state.gameActive) return;
  const toRemove: Ninja[] = [];
  for (const ninja of state.ninjas) if (ninja.hasReachedCenter()) { toRemove.push(ninja); loseLife(scene, state); }
  for (const ninja of toRemove) { ninja.destroy(); state.ninjas = state.ninjas.filter((remainingNinja) => remainingNinja !== ninja); }
}

function loseLife(scene: Phaser.Scene, state: KungFooState): void {
  if (!state.gameActive) return;
  state.lives = Math.max(0, state.lives - 1);
  audioFX.expire();
  state.livesBadge?.setLives(state.lives);
  flashDanger(scene);
  if (state.lives <= 0) scene.time.delayedCall(400, () => endGame(scene, state));
}

function flashDanger(scene: Phaser.Scene): void {
  const { width, height } = scene.scale;
  const flash = scene.add.rectangle(width / 2, height / 2, width, height, HEX.danger, 0).setDepth(DEPTH.topUi - 1);
  scene.tweens.add({ targets: flash, alpha: { from: 0, to: 0.4 }, duration: 150, yoyo: true, repeat: 1, onComplete: () => flash.destroy() });
}

function checkWaveComplete(scene: Phaser.Scene, state: KungFooState): void {
  if (state.wavePaused || !state.gameActive || !state.currentWaveConfig) return;
  if (state.ninjasSpawnedInWave >= state.ninjasTotalInWave && state.ninjas.length === 0) { state.currentWaveConfig = undefined; spawnNextWave(scene, state); }
}

export function tickTimer(scene: Phaser.Scene, state: KungFooState): void {
  const elapsed = (performance.now() - state.gameStartTimestamp) / 1000;
  const newTimeLeft = Math.max(0, KF_GAME_DURATION - Math.floor(elapsed));
  if (newTimeLeft !== state.lastTickSecond) {
    state.lastTickSecond = newTimeLeft;
    scene.game.events.emit("timer:update", newTimeLeft);
    if (newTimeLeft <= 0) endGame(scene, state);
  }
}

function startBgMusic(scene: Phaser.Scene, state: KungFooState): void {
  if (state.bgMusic?.isPlaying) return;
  state.bgMusic = scene.sound.add("music-background-ninja-fight", { loop: true, volume: 0.4 });
  state.bgMusic.play();
}

function stopBgMusic(state: KungFooState): void {
  if (!state.bgMusic) return;
  state.bgMusic.stop();
  state.bgMusic.destroy();
  state.bgMusic = null;
}

export function endGame(scene: Phaser.Scene, state: KungFooState): void {
  if (!state.gameActive) return;
  state.gameActive = false;
  stopBgMusic(state);
  state.spawnTimers.forEach((timer) => timer.remove(false));
  state.spawnTimers = [];
  state.ninjas.forEach((ninja) => ninja.destroy());
  state.ninjas = [];
  state.motionDetector?.destroy();
  state.motionDetector = undefined;
  scene.scene.stop("UIScene");
  audioFX.gameOver();
  scene.scene.launch("GameOverScene", { score: state.score, gameName: "Kung Foo", gameKey: "KungFooScene" });
}
