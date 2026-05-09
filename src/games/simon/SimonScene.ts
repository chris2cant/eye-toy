import Phaser from "phaser";
import { handTracker } from "../../camera/HandTracker";
import type { LandmarksPayload } from "../../camera/HandTracker";
import { WebcamLayer } from "../../scenes/WebcamLayer";
import { DwellButton } from "../../design-system/DwellButton";
import { DEPTH } from "../../design-system/tokens";
import type { ScoreBadgeHandle } from "../../design-system/components/ScoreBadge";
import type { LivesBadgeHandle } from "../../design-system/components/LivesBadge";
import { SimonZone } from "./SimonZone";
import { simonAudio } from "./SimonAudio";
import type { SimonColor } from "./SimonAudio";
import { audioFX } from "../../audio/AudioFX";
import { createGameOverPanel, createSimonHUD, showGameOverDisplay, createDifficultySelector } from "./SimonSceneUI";
import {
  ZONE_SETUP, MAX_LIVES, DWELL_ZONE_MS, DWELL_START_MS, TRACKER_FPS, WEBCAM_FPS, HS_KEY,
  ZONE_RADIUS_RATIO, DIFFICULTY_CONFIGS, DIFFICULTIES,
} from "./SimonSceneConfig";
import type { Difficulty } from "./SimonSceneConfig";
import { nextColor, scheduleSequenceFlash, handleZoneInput } from "./SimonGameplay";
import type { ZoneResult } from "./SimonGameplay";

type GameState = "idle" | "show" | "input" | "gameover";

export class SimonScene extends Phaser.Scene {
  private webcam!: WebcamLayer;
  private zones: SimonZone[] = [];
  private btnStart!: DwellButton;
  private difficultyBtns: DwellButton[] = [];
  private handPositions: ({ x: number; y: number } | null)[] = [null, null];

  private state: GameState = "idle";
  private sequence: SimonColor[] = [];
  private inputStep = 0;
  private lives = MAX_LIVES;
  private score = 0;
  private difficulty: Difficulty = "medium";

  private scoreBadge!: ScoreBadgeHandle;
  private livesBadge!: LivesBadgeHandle;
  private txtProgress!: Phaser.GameObjects.Text;
  private gameOverOverlay!: Phaser.GameObjects.Container;
  private txtGameOverScore!: Phaser.GameObjects.Text;
  private txtGameOverBest!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "SimonScene" });
  }

  async create(): Promise<void> {
    const { width, height } = this.scale;

    this.input.keyboard?.on("keydown-Q", this.onQuitToMenu);
    this.events.once("shutdown", () => {
      handTracker.off("landmarks", this.onLandmarks, this);
      this.input.keyboard?.off("keydown-Q", this.onQuitToMenu);
    });

    const videoEl = await handTracker.initCamera();
    this.webcam = new WebcamLayer(this);
    this.webcam.setup(videoEl, width, height);

    this.setupZones(width, height);

    const hud = createSimonHUD(this, width, height, parseInt(localStorage.getItem(HS_KEY) ?? "0", 10));
    ({ scoreBadge: this.scoreBadge, livesBadge: this.livesBadge, txtProgress: this.txtProgress } = hud);
    const goPanel = createGameOverPanel(this, width, height);
    ({ overlay: this.gameOverOverlay, txtScore: this.txtGameOverScore, txtBest: this.txtGameOverBest } = goPanel);

    this.btnStart = new DwellButton(this, width / 2, height * 0.45, {
      label: "► JOUER",
      fontSize: "32px",
      onActivate: () => this.startGame(),
      depth: DEPTH.hud,
      dwellMs: DWELL_START_MS,
    });

    this.difficultyBtns = createDifficultySelector(this, width / 2, height * 0.73, (diff) => this.selectDifficulty(diff));
    this.updateDifficultyBtns();

    await handTracker.initDetector({ numHands: 2 });
    handTracker.start({ targetFps: TRACKER_FPS });
    handTracker.on("landmarks", this.onLandmarks, this);

    this.enterIdle();
  }

  private setupZones(width: number, height: number): void {
    const zoneRadius = Math.max(44, Math.min(width, height) * ZONE_RADIUS_RATIO);
    for (const cfg of ZONE_SETUP) {
      const zone = new SimonZone(this, cfg.color, cfg.anchor, DWELL_ZONE_MS);
      zone.setDepth(3);
      zone.layout(width, height, zoneRadius);
      this.zones.push(zone);
    }
  }

  private onLandmarks = ({ hands }: LandmarksPayload): void => {
    const mapper = this.webcam.getLandmarkMapper(this.scale.width, this.scale.height);
    hands.forEach((hand, i) => {
      const palm = hand[9] ?? hand[0];
      this.handPositions[i] = mapper(palm.x, palm.y);
    });
    for (let i = hands.length; i < 2; i++) {
      this.handPositions[i] = null;
    }
  };

  private enterIdle(): void {
    this.state = "idle";
    this.sequence = [];
    this.scoreBadge.setValue(0);
    this.livesBadge.setLives(MAX_LIVES);
    this.txtProgress.setText("Dwell sur JOUER pour commencer");
    this.gameOverOverlay.setVisible(false);
    [this.btnStart, ...this.difficultyBtns].forEach((btn) => { btn.setVisible(true); btn.reset(); });
  }

  private startGame(): void {
    this.btnStart.setVisible(false);
    this.difficultyBtns.forEach((btn) => btn.setVisible(false));
    this.gameOverOverlay.setVisible(false);
    this.sequence = [nextColor(null)];
    this.lives = MAX_LIVES;
    this.score = 0;
    this.scoreBadge.setValue(0);
    this.livesBadge.setLives(MAX_LIVES);
    this.showSequence();
  }

  private showSequence(): void {
    this.state = "show";
    this.zones.forEach((z) => z.resetProgress());
    this.txtProgress.setText("Observe…");
    const { flashMs, pauseMs } = DIFFICULTY_CONFIGS[this.difficulty];
    scheduleSequenceFlash(this.time, this.zones, this.sequence, {
      flashMs,
      pauseMs,
      onComplete: () => {
        this.state = "input";
        this.inputStep = 0;
        this.txtProgress.setText(`Étape 1 / ${this.sequence.length}`);
      },
    });
  }

  private onZoneValidated(color: SimonColor): void {
    this.state = "show";
    simonAudio.playTone(color, 350);
    this.zones.find((z) => z.color === color)!.flash(350);
    this.zones.forEach((z) => z.resetProgress());
    this.applyZoneResult(
      handleZoneInput(color, { sequence: this.sequence, inputStep: this.inputStep, lives: this.lives, score: this.score }),
    );
  }

  private applyZoneResult(result: ZoneResult): void {
    if (result.type === "step") {
      this.inputStep = result.inputStep;
      this.txtProgress.setText(`Étape ${this.inputStep + 1} / ${this.sequence.length}`);
      this.time.delayedCall(420, () => { this.state = "input"; });
    } else if (result.type === "victory") {
      this.score = result.score;
      this.scoreBadge.setValue(this.score);
      this.sequence.push(nextColor(this.sequence[this.sequence.length - 1]));
      audioFX.victory();
      this.time.delayedCall(850, () => this.showSequence());
    } else {
      simonAudio.playError();
      if (result.type === "miss") {
        this.lives = result.lives;
        this.livesBadge.setLives(this.lives);
        this.time.delayedCall(950, () => this.showSequence());
      } else {
        this.time.delayedCall(700, () => this.triggerGameOver());
      }
    }
  }

  private triggerGameOver(): void {
    this.state = "gameover";
    audioFX.gameOver();
    showGameOverDisplay(this, {
      txtGameOverScore: this.txtGameOverScore,
      txtGameOverBest: this.txtGameOverBest,
      gameOverOverlay: this.gameOverOverlay,
    }, { score: this.score, hsKey: HS_KEY });
    const best = Math.max(this.score, parseInt(localStorage.getItem(HS_KEY) ?? "0", 10));
    this.scoreBadge.setValue(this.score, best);
    this.txtProgress.setText("Dwell sur JOUER pour rejouer");
    [this.btnStart, ...this.difficultyBtns].forEach((btn) => { btn.setVisible(true); btn.reset(); });
  }

  private selectDifficulty(diff: Difficulty): void {
    this.difficulty = diff;
    this.updateDifficultyBtns();
    this.difficultyBtns.forEach((btn) => btn.reset());
  }

  private updateDifficultyBtns(): void {
    DIFFICULTIES.forEach((diff, i) => this.difficultyBtns[i]?.setAlpha(diff === this.difficulty ? 1 : 0.4));
  }

  update(time: number, delta: number): void {
    if (!this.webcam) return;
    this.webcam.render(time, WEBCAM_FPS);

    if (this.state === "idle" || this.state === "gameover") {
      this.btnStart.update(this.handPositions, delta);
      for (const btn of this.difficultyBtns) btn.update(this.handPositions, delta);
    }

    if (this.state === "input") {
      for (const zone of this.zones) {
        const handForZone =
          this.handPositions.find((pos) => pos !== null && zone.containsPoint(pos.x, pos.y)) ?? null;
        const triggered = zone.updateHand(handForZone, delta);
        if (triggered) {
          this.onZoneValidated(zone.color);
          break;
        }
      }
    }
  }

  private readonly onQuitToMenu = (): void => {
    this.scene.start("MenuScene", { selectedGameKey: this.sys.settings.key });
  };
}
