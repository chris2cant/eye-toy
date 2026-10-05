import Phaser from "phaser";
import { audioFX } from "../audio/AudioFX";
import { startMusic } from "../audio/music";
import type { MusicHandle } from "../audio/music";
import { handTracker } from "../camera/HandTracker";
import type { LandmarksPayload } from "../camera/HandTracker";
import { DEPTH, HEX } from "../design-system/tokens";
import { CirclePool, computeHandBounds } from "./CirclePool";
import type { HandBounds, CircleConfig } from "./CirclePool";
import { WebcamLayer } from "./WebcamLayer";
import { bindQuitKey, listenLandmarks, showCameraError } from "./sceneHelpers";
import {
  GAME_DURATION, GAME_TRACKER_FPS,
  TIMER_ARC_FRAME_MS, BACKGROUND_MUSIC_KEY, TIERS, runCountdownSequence,
} from "./GameSceneConfig";
import type { DifficultyTier } from "./GameSceneConfig";

const PALM_LANDMARK = 9;

export class GameScene extends Phaser.Scene {
  private pool!: CirclePool;
  private webcam!: WebcamLayer;
  private debugGraphics!: Phaser.GameObjects.Graphics;
  private debugMode = false;
  private handBounds: (HandBounds | null)[] = [null, null];
  private score = 0;
  private timeLeft = GAME_DURATION;
  private gameActive = false;
  private currentTierIndex = 0;
  private spawnTimer!: Phaser.Time.TimerEvent;
  private gameStartTimestamp = 0;
  private lastTickSecond = GAME_DURATION;
  private handPositions: ({ x: number; y: number } | null)[] = [null, null];
  private nextTimerArcRenderAt = 0;
  private backgroundMusic: MusicHandle | null = null;

  constructor() { super({ key: "GameScene" }); }

  async create() {
    this.pool = new CirclePool(this);
    this.webcam = new WebcamLayer(this);
    bindQuitKey(this);
    listenLandmarks(this, this.onLandmarks);
    this.debugGraphics = this.add.graphics().setDepth(DEPTH.topUi);
    const onDebug = (active: boolean) => {
      this.debugMode = active;
      if (!active) this.debugGraphics.clear();
    };
    this.game.events.on("debug:toggle", onDebug);
    this.events.once("shutdown", () => this.game.events.off("debug:toggle", onDebug));
    this.events.once("shutdown", () => this.stopBackgroundMusic());
    try {
      const videoEl = await handTracker.initCamera();
      this.webcam.setup(videoEl);
      await handTracker.initDetector({ numHands: 2 });
      handTracker.start({ targetFps: GAME_TRACKER_FPS });
      this.runCountdown();
    } catch (err) {
      console.error("[GameScene] erreur d'initialisation:", err);
      showCameraError(this);
    }
  }

  private get tier(): DifficultyTier { return TIERS[this.currentTierIndex]; }

  private runCountdown() {
    runCountdownSequence(this, () => this.startGame());
  }

  private startGame() {
    this.currentTierIndex = 0;
    this.timeLeft = GAME_DURATION;
    this.lastTickSecond = GAME_DURATION;
    this.score = 0;
    this.gameStartTimestamp = performance.now();
    this.scene.launch("UIScene");
    this.game.events.emit("score:update", 0);
    this.game.events.emit("timer:update", GAME_DURATION);
    this.startBackgroundMusic();
    this.spawnTimer = this.time.addEvent({
      delay: this.tier.spawnDelay, loop: true, callback: this.spawnCircle, callbackScope: this,
    });
    this.gameActive = true;
  }

  private onTick(newTimeLeft: number): void {
    this.timeLeft = newTimeLeft;
    this.game.events.emit("timer:update", this.timeLeft);
    const elapsed = (GAME_DURATION - this.timeLeft) / GAME_DURATION;
    const newTierIndex = TIERS.reduce((best, tier, i) => elapsed >= tier.threshold ? i : best, 0);
    if (newTierIndex !== this.currentTierIndex) {
      this.currentTierIndex = newTierIndex;
      this.spawnTimer.reset({ delay: this.tier.spawnDelay, loop: true, callback: this.spawnCircle, callbackScope: this });
    }
    if (this.timeLeft <= 0) this.endGame();
  }

  private endGame() {
    this.gameActive = false;
    this.stopBackgroundMusic();
    this.pool.clearAll();
    this.scene.stop("UIScene");
    audioFX.gameOver();
    this.scene.launch("GameOverScene", { score: this.score });
  }

  private startBackgroundMusic(): void {
    this.backgroundMusic ??= startMusic(this, BACKGROUND_MUSIC_KEY, { loop: true, volume: 0.35 });
  }

  private stopBackgroundMusic(): void {
    this.backgroundMusic?.stop();
    this.backgroundMusic = null;
  }

  private spawnCircle = (): void => {
    if (!this.gameActive || this.pool.isAtCapacity) return;
    const { width, height } = this.scale;
    const { radius, expireDelay, points } = this.tier;
    const margin = radius + 20;
    const cfg: CircleConfig = { radius, expireDelay, points };
    this.pool.spawn(
      Phaser.Math.Between(margin, width - margin),
      Phaser.Math.Between(margin, height - margin),
      cfg,
      (delta) => this.updateScore(delta),
    );
  };

  private updateScore(delta: number) {
    this.score = Math.max(0, this.score + delta);
    this.game.events.emit("score:update", this.score);
  }

  private onLandmarks = ({ hands }: LandmarksPayload): void => {
    const { width, height } = this.scale;
    const mapper = this.webcam.getLandmarkMapper(width, height);
    this.handBounds = [null, null];

    hands.forEach((hand, i) => {
      if (!hand || hand.length === 0) {
        this.handPositions[i] = null;
        return;
      }
      const palm = hand[PALM_LANDMARK];
      this.handPositions[i] = mapper(palm.x, palm.y);
      if (!this.gameActive) return;
      const bounds = computeHandBounds(hand, mapper);
      this.handBounds[i] = bounds;
      this.pool.checkAndProcess(bounds, (delta) => this.updateScore(delta));
    });
  };

  update(time: number, _delta: number) {
    this.renderDebugBounds();
    if (time >= this.nextTimerArcRenderAt) {
      this.pool.renderTimerArcs(this.time.now);
      this.nextTimerArcRenderAt = time + TIMER_ARC_FRAME_MS;
    }
    if (this.gameActive) {
      const elapsed = (performance.now() - this.gameStartTimestamp) / 1000;
      const newTimeLeft = Math.max(0, GAME_DURATION - Math.floor(elapsed));
      if (newTimeLeft !== this.lastTickSecond) {
        this.lastTickSecond = newTimeLeft;
        this.onTick(newTimeLeft);
      }
    }
  }

  private renderDebugBounds() {
    if (!this.debugMode) return;
    this.debugGraphics.clear();
    const DEBUG_COLORS = [HEX.brandPrimary, HEX.info];
    this.handBounds.forEach((bounds, i) => {
      if (!bounds) return;
      const color = DEBUG_COLORS[i];
      const boundsWidth = bounds.x2 - bounds.x1;
      const boundsHeight = bounds.y2 - bounds.y1;
      this.debugGraphics.fillStyle(color, 0.10);
      this.debugGraphics.fillRect(bounds.x1, bounds.y1, boundsWidth, boundsHeight);
      this.debugGraphics.lineStyle(2, color, 0.9);
      this.debugGraphics.strokeRect(bounds.x1, bounds.y1, boundsWidth, boundsHeight);
    });
  }
}
