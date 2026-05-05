import Phaser from "phaser";
import { handTracker } from "../camera/HandTracker";
import type { LandmarksPayload, HandLandmark } from "../camera/HandTracker";
import { bodyTracker } from "../camera/BodyTracker";
import type { BodyPayload, PoseLandmark } from "../camera/BodyTracker";
import { WebcamLayer } from "./WebcamLayer";
import { COLOR, HEX, DEPTH, FONT } from "../design-system/tokens";

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [0, 5], [0, 17], [5, 9], [9, 13], [13, 17],
  [1, 2], [2, 3], [3, 4],
  [5, 6], [6, 7], [7, 8],
  [9, 10], [10, 11], [11, 12],
  [13, 14], [14, 15], [15, 16],
  [17, 18], [18, 19], [19, 20],
];

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

const HAND_COLORS: number[] = [HEX.warning, HEX.info];
const VIS_THRESHOLD = 0.4;

export class SkeletonScene extends Phaser.Scene {
  private webcam!: WebcamLayer;
  private gfx!: Phaser.GameObjects.Graphics;
  private handLandmarks: HandLandmark[][] = [[], []];
  private poseLandmarks: PoseLandmark[] = [];

  constructor() {
    super({ key: "SkeletonScene" });
  }

  async create() {
    const { width, height } = this.scale;

    // Initialiser gfx avant tout await pour éviter l'accès undefined dans update()
    this.gfx = this.add.graphics().setDepth(DEPTH.game);
    this.webcam = new WebcamLayer(this);

    this.add.rectangle(width / 2, height / 2, width, height, HEX.bgCanvas, 0.35).setDepth(DEPTH.bg);

    const videoEl = await handTracker.initCamera();
    this.webcam.setup(videoEl, width, height);

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

    this.add
      .text(width / 2, height - 16, "[Q]  Retour au menu", {
        fontSize: "13px",
        fontFamily: FONT.ui,
        color: COLOR.textMuted,
      })
      .setOrigin(0.5, 1)
      .setAlpha(0.55)
      .setDepth(DEPTH.hud);

    try {
      await bodyTracker.initDetector();
      bodyTracker.start();
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

    if (!handTracker.isInitialized) await handTracker.initDetector();
    handTracker.start();

    handTracker.on("landmarks", this.onHands, this);
    bodyTracker.on("body", this.onBody, this);

    this.events.once("shutdown", () => {
      handTracker.off("landmarks", this.onHands, this);
      bodyTracker.off("body", this.onBody, this);
      bodyTracker.stop();
    });

    this.input.keyboard!.on("keydown-Q", () => this.doQuit());
    this.input.keyboard!.on("keydown-ESCAPE", () => this.doQuit());
  }

  private buildLegend(width: number, height: number) {
    const items = [
      { color: COLOR.brandPrimary, label: "Corps / tête" },
      { color: COLOR.warning, label: "Main gauche" },
      { color: COLOR.info, label: "Main droite" },
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

  private onHands = ({ hands }: LandmarksPayload): void => {
    this.handLandmarks = [hands[0] ?? [], hands[1] ?? []];
  };

  private onBody = ({ pose }: BodyPayload): void => {
    this.poseLandmarks = pose;
  };

  update() {
    this.webcam.render();
    this.drawSkeleton();
  }

  private lmToScreen(lm: { x: number; y: number }, width: number, height: number) {
    return { x: (1 - lm.x) * width, y: lm.y * height };
  }

  private drawSkeleton() {
    const { width, height } = this.scale;
    this.gfx.clear();
    this.drawPose(width, height);
    this.handLandmarks.forEach((hand, i) => {
      if (hand.length > 0) this.drawHand(hand, i, width, height);
    });
  }

  private drawPose(width: number, height: number) {
    const lms = this.poseLandmarks;
    if (lms.length === 0) return;

    this.gfx.lineStyle(2.5, HEX.brandPrimary, 0.85);
    for (const [a, b] of POSE_CONNECTIONS) {
      if (!lms[a] || !lms[b]) continue;
      if ((lms[a].visibility ?? 1) < VIS_THRESHOLD || (lms[b].visibility ?? 1) < VIS_THRESHOLD) continue;
      const pa = this.lmToScreen(lms[a], width, height);
      const pb = this.lmToScreen(lms[b], width, height);
      this.gfx.beginPath();
      this.gfx.moveTo(pa.x, pa.y);
      this.gfx.lineTo(pb.x, pb.y);
      this.gfx.strokePath();
    }

    this.gfx.fillStyle(HEX.brandPrimary, 0.9);
    for (const lm of lms) {
      if ((lm.visibility ?? 1) < VIS_THRESHOLD) continue;
      const p = this.lmToScreen(lm, width, height);
      this.gfx.fillCircle(p.x, p.y, 4);
    }
  }

  private drawHand(hand: HandLandmark[], handIndex: number, width: number, height: number) {
    const color = HAND_COLORS[handIndex];
    this.gfx.lineStyle(2.5, color, 0.9);
    for (const [a, b] of HAND_CONNECTIONS) {
      if (!hand[a] || !hand[b]) continue;
      const pa = this.lmToScreen(hand[a], width, height);
      const pb = this.lmToScreen(hand[b], width, height);
      this.gfx.beginPath();
      this.gfx.moveTo(pa.x, pa.y);
      this.gfx.lineTo(pb.x, pb.y);
      this.gfx.strokePath();
    }
    this.gfx.fillStyle(color, 1);
    for (const lm of hand) {
      const p = this.lmToScreen(lm, width, height);
      this.gfx.fillCircle(p.x, p.y, 3.5);
    }
  }

  private doQuit() {
    this.scene.start("MenuScene");
  }
}
