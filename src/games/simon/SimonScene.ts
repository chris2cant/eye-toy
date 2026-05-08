import Phaser from "phaser";
import { handTracker } from "../../camera/HandTracker";
import type { LandmarksPayload } from "../../camera/HandTracker";
import { WebcamLayer } from "../../scenes/WebcamLayer";
import { DwellButton } from "../../design-system/DwellButton";
import { HEX, DEPTH } from "../../design-system/tokens";
import type { ScoreBadgeHandle } from "../../design-system/components/ScoreBadge";
import type { LivesBadgeHandle } from "../../design-system/components/LivesBadge";
import { SimonZone } from "./SimonZone";
import { simonAudio } from "./SimonAudio";
import type { SimonColor } from "./SimonAudio";
import { audioFX } from "../../audio/AudioFX";
import { createGameOverPanel, createSimonHUD, showGameOverDisplay } from "./SimonSceneUI";
import {
  ZONE_SETUP, SIMON_COLORS, FLASH_MS, PAUSE_MS, MAX_LIVES,
  DWELL_ZONE_MS, DWELL_START_MS, TRACKER_FPS, WEBCAM_FPS, HS_KEY,
} from "./SimonSceneConfig";

type GameState = "idle" | "show" | "input" | "gameover";

export class SimonScene extends Phaser.Scene {
  private webcam!: WebcamLayer;
  private zones: SimonZone[] = [];
  private btnBack!: DwellButton;
  private btnStart!: DwellButton;

  private handPositions: ({ x: number; y: number } | null)[] = [null, null];

  private state: GameState = "idle";
  private sequence: SimonColor[] = [];
  private inputStep = 0;
  private lives = MAX_LIVES;
  private score = 0;

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

    const videoEl = await handTracker.initCamera();
    this.webcam = new WebcamLayer(this);
    this.webcam.setup(videoEl, width, height);

    for (const cfg of ZONE_SETUP) {
      const zone = new SimonZone(this, cfg.color, cfg.quadrant, DWELL_ZONE_MS);
      zone.setDepth(3);
      zone.layout(width, height);
      this.zones.push(zone);
    }

    const hud = createSimonHUD(this, width, height, parseInt(localStorage.getItem(HS_KEY) ?? "0", 10));
    ({ scoreBadge: this.scoreBadge, livesBadge: this.livesBadge, txtProgress: this.txtProgress } = hud);
    const goPanel = createGameOverPanel(this, width, height);
    ({ overlay: this.gameOverOverlay, txtScore: this.txtGameOverScore, txtBest: this.txtGameOverBest } = goPanel);

    this.btnBack = new DwellButton(this, 100, height * 0.12, {
      label: "← MENU",
      fontSize: "20px",
      onActivate: () => this.scene.start("MenuScene"),
      depth: DEPTH.hud,
      dwellMs: 1000,
      fillColor: HEX.nightBlue,
    });

    this.btnStart = new DwellButton(this, width / 2, height * 0.45, {
      label: "► JOUER",
      fontSize: "32px",
      onActivate: () => this.startGame(),
      depth: DEPTH.hud,
      dwellMs: DWELL_START_MS,
    });

    await handTracker.initDetector({ numHands: 2 });
    handTracker.start({ targetFps: TRACKER_FPS });
    handTracker.on("landmarks", this.onLandmarks, this);

    this.events.once("shutdown", () => {
      handTracker.off("landmarks", this.onLandmarks, this);
    });

    this.enterIdle();
  }

  private onLandmarks = ({ hands }: LandmarksPayload): void => {
    const mapper = this.webcam.getLandmarkMapper(this.scale.width, this.scale.height);
    hands.forEach((hand, i) => {
      this.handPositions[i] = mapper(hand[0].x, hand[0].y);
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
    this.btnStart.setVisible(true);
    this.btnStart.reset();
    this.gameOverOverlay.setVisible(false);
  }

  private startGame(): void {
    this.btnStart.setVisible(false);
    this.gameOverOverlay.setVisible(false);
    this.sequence = [this.randomColor()];
    this.lives = MAX_LIVES;
    this.score = 0;
    this.updateHUD();
    this.showSequence();
  }

  private showSequence(): void {
    this.state = "show";
    this.zones.forEach((z) => z.resetProgress());
    this.txtProgress.setText("Observe…");

    let delay = 500;
    for (const color of this.sequence) {
      const zone = this.zones.find((z) => z.color === color)!;
      this.time.delayedCall(delay, () => {
        zone.flash(FLASH_MS);
        simonAudio.playTone(color, FLASH_MS);
      });
      delay += FLASH_MS + PAUSE_MS;
    }

    this.time.delayedCall(delay, () => {
      this.state = "input";
      this.inputStep = 0;
      this.updateProgress();
    });
  }

  private onZoneValidated(color: SimonColor): void {
    this.state = "show";
    simonAudio.playTone(color, 350);
    this.zones.find((z) => z.color === color)!.flash(350);
    this.zones.forEach((z) => z.resetProgress());

    if (color === this.sequence[this.inputStep]) {
      this.inputStep++;
      if (this.inputStep >= this.sequence.length) {
        this.score++;
        this.updateHUD();
        this.sequence.push(this.randomColor());
        this.time.delayedCall(850, () => this.showSequence());
      } else {
        this.updateProgress();
        this.time.delayedCall(420, () => {
          this.state = "input";
        });
      }
    } else {
      simonAudio.playError();
      this.lives--;
      this.updateHUD();
      if (this.lives <= 0) {
        this.time.delayedCall(700, () => this.triggerGameOver());
      } else {
        this.time.delayedCall(950, () => this.showSequence());
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
    this.btnStart.setVisible(true);
    this.btnStart.reset();
  }

  private updateHUD(): void {
    this.scoreBadge.setValue(this.score);
    this.livesBadge.setLives(this.lives);
  }

  private updateProgress(): void {
    this.txtProgress.setText(`Étape ${this.inputStep + 1} / ${this.sequence.length}`);
  }

  private randomColor(): SimonColor {
    return SIMON_COLORS[Math.floor(Math.random() * SIMON_COLORS.length)];
  }

  update(time: number, delta: number): void {
    if (!this.webcam) return;
    this.webcam.render(time, WEBCAM_FPS);
    this.btnBack.update(this.handPositions, delta);

    if (this.state === "idle" || this.state === "gameover") {
      this.btnStart.update(this.handPositions, delta);
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
}
