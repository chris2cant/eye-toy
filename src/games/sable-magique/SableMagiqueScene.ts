import Phaser from "phaser";
import { handTracker } from "../../camera/HandTracker";
import type { LandmarksPayload } from "../../camera/HandTracker";
import { COLOR, FONT, DEPTH, HEX } from "../../design-system/tokens";
import { DwellButton } from "../../design-system/DwellButton";
import { HandCursors } from "../../design-system/HandCursors";
import { WebcamLayer } from "../../scenes/WebcamLayer";
import { SandParticleSystem } from "./SandParticleSystem";
import { PARTICLES } from "./config";

const PALM_LANDMARK = 9;
// Fingertips + DIP joints (10 emission points per hand)
const FINGER_LANDMARKS = [4, 8, 12, 16, 20, 3, 7, 11, 15, 19];
const SAND_TRACKER_FPS = 24;
const SAND_WEBCAM_FPS = 20;

export class SableMagiqueScene extends Phaser.Scene {
  private webcam!: WebcamLayer;
  private particleSystem!: SandParticleSystem;
  private btnBack!: DwellButton;
  private cursors!: HandCursors;
  private scoreTxt!: Phaser.GameObjects.Text;
  // Palm positions used for cursor + dwell button
  private handPositions: ({ x: number; y: number } | null)[] = [null, null];
  // Per-finger positions and velocities [hand][finger]
  private fingerPositions: ({ x: number; y: number } | null)[][] = [
    Array(FINGER_LANDMARKS.length).fill(null),
    Array(FINGER_LANDMARKS.length).fill(null),
  ];
  private fingerVelocities: number[][] = [
    Array(FINGER_LANDMARKS.length).fill(0),
    Array(FINGER_LANDMARKS.length).fill(0),
  ];
  private lastScoreTotal = -1;

  constructor() {
    super({ key: "SableMagiqueScene" });
  }

  async create() {
    const { width, height } = this.scale;

    const videoEl = await handTracker.initCamera();
    this.webcam = new WebcamLayer(this);
    this.webcam.setup(videoEl, width, height);

    await handTracker.initDetector({ numHands: 2 });
    handTracker.start({ targetFps: SAND_TRACKER_FPS });
    handTracker.on("landmarks", this.onLandmarks, this);

    this.particleSystem = new SandParticleSystem(this);

    this.cursors = new HandCursors(this, DEPTH.cursor);
    this.buildUI(width, height);

    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
      this.particleSystem.updateBounds(gameSize.width, gameSize.height);
    });

    this.events.once("shutdown", () => {
      handTracker.off("landmarks", this.onLandmarks, this);
      this.scale.off("resize");
    });
  }

  private buildUI(width: number, height: number): void {
    this.add
      .rectangle(width / 2, 0, width, 56, HEX.bgCanvas, 0.72)
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.hud - 1);

    this.scoreTxt = this.add
      .text(width - 20, 14, "SABLE  0", {
        fontSize: "22px",
        fontFamily: FONT.identity,
        color: COLOR.warning,
        shadow: { offsetX: 0, offsetY: 0, color: COLOR.warning, blur: 12, fill: true },
      })
      .setOrigin(1, 0)
      .setDepth(DEPTH.topUi);

    this.btnBack = new DwellButton(this, 100, height * 0.12, {
      label: "← MENU",
      fontSize: "20px",
      onActivate: () => this.scene.start("MenuScene", { selectedGameKey: this.sys.settings.key }),
      depth: DEPTH.hud,
      dwellMs: 1000,
    });

    this.add
      .text(width / 2, height * 0.94, "Bouge les mains — le sable coule sous tes doigts", {
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

    hands.forEach((hand, i) => {
      if (!this.fingerPositions[i]) {
        this.fingerPositions[i] = Array(FINGER_LANDMARKS.length).fill(null);
        this.fingerVelocities[i] = Array(FINGER_LANDMARKS.length).fill(0);
      }
      if (!hand || hand.length === 0) {
        this.handPositions[i] = null;
        this.fingerPositions[i].fill(null);
        this.fingerVelocities[i].fill(0);
        return;
      }

      // Palm for cursor / dwell button
      const palm = hand[PALM_LANDMARK];
      this.handPositions[i] = mapper(palm.x, palm.y);

      // Each phalange for sand emission
      FINGER_LANDMARKS.forEach((lmIdx, fi) => {
        const lm = hand[lmIdx];
        if (!lm || lm.x < 0 || lm.x > 1 || lm.y < 0 || lm.y > 1) {
          this.fingerPositions[i][fi] = null;
          this.fingerVelocities[i][fi] = 0;
          return;
        }
        const pos = mapper(lm.x, lm.y);
        const prev = this.fingerPositions[i][fi];
        if (prev) {
          const dx = pos.x - prev.x;
          const dy = pos.y - prev.y;
          this.fingerVelocities[i][fi] = Math.sqrt(dx * dx + dy * dy);
        } else {
          this.fingerVelocities[i][fi] = 0;
        }
        this.fingerPositions[i][fi] = pos;
      });
    });
  };

  update(time: number, delta: number): void {
    if (!this.webcam) return;
    this.webcam.render(time, SAND_WEBCAM_FPS);
    this.particleSystem.update(delta);

    this.fingerPositions.forEach((fingers, i) => {
      fingers.forEach((pos, fi) => {
        if (!pos) return;
        const vel = this.fingerVelocities[i][fi];
        this.fingerVelocities[i][fi] = 0;
        if (vel > PARTICLES.MOTION_THRESHOLD) {
          const count = Math.min(
            Math.ceil(vel * PARTICLES.VELOCITY_SCALE),
            Math.ceil(PARTICLES.BURST_MAX / FINGER_LANDMARKS.length),
          );
          this.particleSystem.spawnAt(pos.x, pos.y, count);
        }
      });
    });

    this.cursors.update(this.handPositions);
    this.btnBack.update(this.handPositions, delta);
    if (this.particleSystem.total !== this.lastScoreTotal) {
      this.lastScoreTotal = this.particleSystem.total;
      this.scoreTxt.setText(`SABLE  ${this.particleSystem.total.toLocaleString("fr-FR")}`);
    }
  }
}
