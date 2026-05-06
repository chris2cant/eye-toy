import Phaser from "phaser";
import { handTracker } from "../../camera/HandTracker";
import type { LandmarksPayload } from "../../camera/HandTracker";
import { COLOR, FONT, DEPTH, HEX } from "../../design-system/tokens";
import { DwellButton } from "../../design-system/DwellButton";
import { HandCursors } from "../../design-system/HandCursors";
import { WebcamLayer } from "../../scenes/WebcamLayer";
import { MotionDetector } from "./MotionDetector";
import { SandParticleSystem } from "./SandParticleSystem";

const PALM_LANDMARK = 9;

export class SableMagiqueScene extends Phaser.Scene {
  private webcam!: WebcamLayer;
  private motionDetector!: MotionDetector;
  private particleSystem!: SandParticleSystem;
  private btnBack!: DwellButton;
  private cursors!: HandCursors;
  private scoreTxt!: Phaser.GameObjects.Text;
  private handPositions: ({ x: number; y: number } | null)[] = [null, null];

  constructor() {
    super({ key: "SableMagiqueScene" });
  }

  async create() {
    const { width, height } = this.scale;

    // --- Webcam ---
    const videoEl = await handTracker.initCamera();
    this.webcam = new WebcamLayer(this);
    this.webcam.setup(videoEl, width, height);

    await handTracker.initDetector();
    handTracker.start();
    handTracker.on("landmarks", this.onLandmarks, this);

    // --- Motion detection & particles (order matters: particles first) ---
    this.particleSystem = new SandParticleSystem(this);
    this.motionDetector = new MotionDetector(videoEl, width, height, (clusters) => {
      clusters.forEach((cl) => this.particleSystem.burst(cl));
    });

    // --- UI ---
    this.cursors = new HandCursors(this, DEPTH.cursor);
    this.buildUI(width, height);

    // --- Cleanup on scene stop ---
    this.events.once("shutdown", () => {
      handTracker.off("landmarks", this.onLandmarks, this);
      this.motionDetector.destroy();
    });
  }

  private buildUI(width: number, height: number): void {
    // Top bar background
    this.add
      .rectangle(width / 2, 0, width, 56, HEX.bgCanvas, 0.72)
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.hud - 1);

    // Score counter — top right, arcade style
    this.scoreTxt = this.add
      .text(width - 20, 14, "SABLE  0", {
        fontSize: "22px",
        fontFamily: FONT.identity,
        color: COLOR.warning,
        shadow: { offsetX: 0, offsetY: 0, color: COLOR.warning, blur: 12, fill: true },
      })
      .setOrigin(1, 0)
      .setDepth(DEPTH.topUi);

    // Back button — top left, well within y ≤ height × 0.50 rule
    this.btnBack = new DwellButton(this, 100, height * 0.12, {
      label: "← MENU",
      fontSize: "20px",
      onActivate: () => this.scene.start("MenuScene"),
      depth: DEPTH.hud,
      dwellMs: 1000,
    });

    // Hint label
    this.add
      .text(width / 2, height * 0.94, "Bouge les mains — le sable suit le mouvement", {
        fontSize: "14px",
        fontFamily: FONT.ui,
        color: COLOR.textMuted,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
  }

  private onLandmarks = ({ hands }: LandmarksPayload): void => {
    const { width, height } = this.scale;
    const mapper = this.webcam.getLandmarkMapper(width, height);
    this.handPositions = [null, null];
    hands.forEach((hand, i) => {
      if (!hand || hand.length === 0) return;
      const lm = hand[PALM_LANDMARK];
      const { x, y } = mapper(lm.x, lm.y);
      this.handPositions[i] = { x, y };
    });
  };

  update(_time: number, delta: number): void {
    if (!this.webcam) return;
    this.webcam.render();
    this.motionDetector.tick();
    this.cursors.update(this.handPositions);
    this.btnBack.update(this.handPositions, delta);
    this.scoreTxt.setText(`SABLE  ${this.particleSystem.total.toLocaleString("fr-FR")}`);
  }
}
