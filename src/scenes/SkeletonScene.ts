import Phaser from "phaser";
import { handTracker } from "../camera/HandTracker";
import { bodyTracker } from "../camera/BodyTracker";
import type { BodyPayload, PoseLandmark } from "../camera/BodyTracker";
import { WebcamLayer } from "./WebcamLayer";
import { COLOR, HEX, DEPTH, FONT } from "../design-system/tokens";
import { DwellButton } from "../design-system/DwellButton";

const POSE_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  [11, 12], [11, 23], [12, 24], [23, 24],
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [23, 25], [25, 27], [27, 29], [29, 31], [27, 31],
  [24, 26], [26, 28], [28, 30], [30, 32], [28, 32],
];

const VIS_THRESHOLD = 0.4;
const LEFT_HAND_PROXY = 19;
const RIGHT_HAND_PROXY = 20;
const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;
const TRACKER_TARGET_FPS = 15;
const SKELETON_RENDER_FPS = 30;
const SKELETON_RENDER_FRAME_MS = 1000 / SKELETON_RENDER_FPS;

export class SkeletonScene extends Phaser.Scene {
  private webcam!: WebcamLayer;
  private gfx!: Phaser.GameObjects.Graphics;
  private poseLandmarks: PoseLandmark[] = [];
  private btnBack!: DwellButton;
  private handPositions: ({ x: number; y: number } | null)[] = [null, null];
  private nextVisualRenderAt = 0;

  constructor() {
    super({ key: "SkeletonScene" });
  }

  async create() {
    const { width, height } = this.scale;

    // Initialiser gfx avant tout await pour éviter l'accès undefined dans update()
    this.gfx = this.add.graphics().setDepth(DEPTH.game);
    this.webcam = new WebcamLayer(this);

    this.add.rectangle(width / 2, height / 2, width, height, HEX.bgCanvas, 0.35).setDepth(DEPTH.bg);

    this.add
      .text(width / 2, 16, "SQUELETTE", {
        fontSize: "13px",
        fontFamily: FONT.ui,
        color: COLOR.textMuted,
        letterSpacing: 4,
      })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.hud);

    this.buildLegend(width, height);

    this.btnBack = new DwellButton(this, 100, height * 0.12, {
      label: "← MENU",
      fontSize: "20px",
      onActivate: () => this.doQuit(),
      depth: DEPTH.hud,
      dwellMs: 1000,
    });

    const videoEl = await handTracker.initCamera();
    this.webcam.setup(videoEl, width, height);

    this.add
      .text(width / 2, height - 16, "[Q]  Retour au menu", {
        fontSize: "13px",
        fontFamily: FONT.ui,
        color: COLOR.textMuted,
      })
      .setOrigin(0.5, 1)
      .setAlpha(0.55)
      .setDepth(DEPTH.hud);

    await this.initTrackers(width, height);
    this.setupListeners();
  }

  private async initTrackers(width: number, height: number): Promise<void> {
    try {
      await bodyTracker.initDetector();
      bodyTracker.start({ targetFps: TRACKER_TARGET_FPS });
    } catch (err) {
      console.error("[SkeletonScene] PoseLandmarker non disponible:", err);
      this.add
        .text(width / 2, height / 2, "Modèle de pose indisponible\n(réseau requis pour le premier chargement)", {
          fontSize: "20px",
          fontFamily: FONT.ui,
          color: COLOR.danger,
          align: "center",
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.hud);
    }
    handTracker.stop();
  }

  private setupListeners(): void {
    bodyTracker.on("body", this.onBody, this);
    this.events.once("shutdown", () => {
      bodyTracker.off("body", this.onBody, this);
      bodyTracker.stop();
    });
    this.input.keyboard!.on("keydown-Q", () => this.doQuit());
    this.input.keyboard!.on("keydown-ESCAPE", () => this.doQuit());
  }

  private buildLegend(width: number, height: number) {
    const items = [
      { color: COLOR.brandPrimary, label: "Corps / tête" },
      { color: COLOR.warning, label: "Mains via pose" },
    ];
    const x = 16;
    let y = height - 16;
    for (const item of items.reverse()) {
      this.add
        .text(x, y, `● ${item.label}`, {
          fontSize: "12px",
          fontFamily: FONT.ui,
          color: item.color,
        })
        .setOrigin(0, 1)
        .setAlpha(0.7)
        .setDepth(DEPTH.hud);
      y -= 18;
    }
  }

  private onBody = ({ pose }: BodyPayload): void => {
    this.poseLandmarks = pose;
    this.updateHandPositionsFromPose();
  };

  update(time: number, delta: number) {
    if (time >= this.nextVisualRenderAt) {
      this.webcam.render();
      this.drawSkeleton();
      this.nextVisualRenderAt = time + SKELETON_RENDER_FRAME_MS;
    }
    this.btnBack?.update(this.handPositions, delta);
  }

  private isVisible(lm: PoseLandmark): boolean {
    return (lm.visibility ?? 1) >= VIS_THRESHOLD;
  }

  private drawSkeleton() {
    const { width, height } = this.scale;
    const map = this.webcam.getLandmarkMapper(width, height);
    this.gfx.clear();
    this.drawPose(map);
    this.drawHandProxies(map);
  }

  private drawPose(map: (x: number, y: number) => { x: number; y: number }) {
    const lms = this.poseLandmarks;
    if (lms.length === 0) return;

    this.gfx.lineStyle(2.5, HEX.brandPrimary, 0.85);
    for (const [idxA, idxB] of POSE_CONNECTIONS) {
      if (!lms[idxA] || !lms[idxB]) continue;
      if (!this.isVisible(lms[idxA]) || !this.isVisible(lms[idxB])) continue;
      const pa = map(lms[idxA].x, lms[idxA].y);
      const pb = map(lms[idxB].x, lms[idxB].y);
      this.gfx.beginPath();
      this.gfx.moveTo(pa.x, pa.y);
      this.gfx.lineTo(pb.x, pb.y);
      this.gfx.strokePath();
    }

    this.gfx.fillStyle(HEX.brandPrimary, 0.9);
    for (const lm of lms) {
      if (!this.isVisible(lm)) continue;
      const pt = map(lm.x, lm.y);
      this.gfx.fillCircle(pt.x, pt.y, 4);
    }
  }

  private updateHandPositionsFromPose(): void {
    const { width, height } = this.scale;
    const map = this.webcam.getLandmarkMapper(width, height);
    const left = this.getVisiblePosePoint(LEFT_HAND_PROXY) ?? this.getVisiblePosePoint(LEFT_WRIST);
    const right = this.getVisiblePosePoint(RIGHT_HAND_PROXY) ?? this.getVisiblePosePoint(RIGHT_WRIST);
    this.handPositions = [
      left ? map(left.x, left.y) : null,
      right ? map(right.x, right.y) : null,
    ];
  }

  private getVisiblePosePoint(index: number): PoseLandmark | null {
    const lm = this.poseLandmarks[index];
    if (!lm || !this.isVisible(lm)) return null;
    return lm;
  }

  private drawHandProxies(map: (x: number, y: number) => { x: number; y: number }): void {
    this.gfx.fillStyle(HEX.warning, 0.95);
    for (const lm of [
      this.getVisiblePosePoint(LEFT_HAND_PROXY) ?? this.getVisiblePosePoint(LEFT_WRIST),
      this.getVisiblePosePoint(RIGHT_HAND_PROXY) ?? this.getVisiblePosePoint(RIGHT_WRIST),
    ]) {
      if (!lm) continue;
      const pt = map(lm.x, lm.y);
      this.gfx.fillCircle(pt.x, pt.y, 7);
    }
  }

  private doQuit() {
    this.scene.start("MenuScene", { selectedGameKey: this.sys.settings.key });
  }
}
