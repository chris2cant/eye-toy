import Phaser from "phaser";
import { handTracker } from "../../camera/HandTracker";
import { COLOR, FONT, DEPTH, HEX } from "../../design-system/tokens";
import { WebcamLayer } from "../../scenes/WebcamLayer";
import { SandParticleSystem } from "./SandParticleSystem";
import { MotionDetector, type MotionCluster } from "./MotionDetector";
import { PARTICLES } from "./config";

const SAND_WEBCAM_FPS = 20;

const SCALE_STEPS = [0.25, 0.5, 1, 2, 4, 8, 16] as const;
const SCALE_DEFAULT_IDX = 2; // 1×

export class SableMagiqueScene extends Phaser.Scene {
  private webcam!: WebcamLayer;
  private particleSystem!: SandParticleSystem;
  private motionDetector!: MotionDetector;
  private scoreTxt!: Phaser.GameObjects.Text;
  // Top-2 motion clusters used to drive DwellButton
  private handPositions: ({ x: number; y: number } | null)[] = [null, null];
  private lastScoreTotal = -1;
  private sandScaleIdx = SCALE_DEFAULT_IDX;
  private sandScaleTxt!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "SableMagiqueScene" });
  }

  async create() {
    const { width, height } = this.scale;

    this.input.keyboard!.on("keydown-Q", () => this.scene.start("MenuScene", { selectedGameKey: this.sys.settings.key }));

    // Camera only — no MediaPipe, no neural-net inference on main thread
    const videoEl = await handTracker.initCamera();
    this.webcam = new WebcamLayer(this);
    this.webcam.setup(videoEl, width, height);

    // Pixel-diff motion detection runs entirely in a Web Worker
    this.motionDetector = new MotionDetector(videoEl, width, height, this.onClusters);

    this.particleSystem = new SandParticleSystem(this);
    this.buildUI(width, height);

    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
      this.particleSystem.updateBounds(gameSize.width, gameSize.height);
    });

    this.input.keyboard!
      .on("keydown-UP", () => this.changeSandScale(+1))
      .on("keydown-DOWN", () => this.changeSandScale(-1));

    this.events.once("shutdown", () => {
      this.motionDetector.destroy();
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
        fontFamily: FONT.display,
        color: COLOR.warning,
        shadow: { offsetX: 0, offsetY: 0, color: COLOR.warning, blur: 12, fill: true },
      })
      .setOrigin(1, 0)
      .setDepth(DEPTH.topUi);

    this.add
      .text(width / 2, height * 0.94, "Bouge les mains — le sable coule sous tes doigts", {
        fontSize: "14px",
        fontFamily: FONT.ui,
        color: COLOR.textMuted,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    this.buildSandControls(width);
  }

  private buildSandControls(width: number): void {
    const btnStyle = { fontSize: "22px", fontFamily: FONT.display, color: COLOR.warning };
    this.add
      .text(width / 2 - 60, 14, "−", btnStyle)
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.topUi)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.changeSandScale(-1));

    this.sandScaleTxt = this.add
      .text(width / 2, 14, this.sandScaleLabel(), {
        fontSize: "18px",
        fontFamily: FONT.display,
        color: COLOR.textMuted,
      })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.topUi);

    this.add
      .text(width / 2 + 60, 14, "+", btnStyle)
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.topUi)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.changeSandScale(+1));
  }

  private sandScaleLabel(): string {
    return `grains ×${SCALE_STEPS[this.sandScaleIdx]}`;
  }

  private changeSandScale(dir: 1 | -1): void {
    this.sandScaleIdx = Math.max(0, Math.min(SCALE_STEPS.length - 1, this.sandScaleIdx + dir));
    this.sandScaleTxt.setText(this.sandScaleLabel());
  }

  private onClusters = (clusters: MotionCluster[]): void => {
    const scale = SCALE_STEPS[this.sandScaleIdx];

    // Top-2 clusters by intensity drive the DwellButton
    const sorted = clusters.slice().sort((clusterA, clusterB) => clusterB.intensity - clusterA.intensity);
    this.handPositions[0] = sorted[0] ?? null;
    this.handPositions[1] = sorted[1] ?? null;

    for (const cl of clusters) {
      const densityBoost = Phaser.Math.Clamp(cl.spread / 16, 1.4, 4.8);
      const count = Math.max(1, Math.round(cl.intensity * PARTICLES.BURST_MAX * scale * densityBoost));
      this.particleSystem.spawnInDisk(cl.x, cl.y, cl.spread, count);
    }
  };

  update(time: number, delta: number): void {
    if (!this.webcam) return;
    this.webcam.render(time, SAND_WEBCAM_FPS);
    this.motionDetector.tick();
    this.particleSystem.update(delta);

    if (this.particleSystem.total !== this.lastScoreTotal) {
      this.lastScoreTotal = this.particleSystem.total;
      this.scoreTxt.setText(`SABLE  ${this.particleSystem.total.toLocaleString("fr-FR")}`);
    }
  }
}
