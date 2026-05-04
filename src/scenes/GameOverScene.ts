import Phaser from "phaser";
import { AudioFX } from "../audio/AudioFX";
import { handTracker } from "../camera/HandTracker";
import type { LandmarksPayload } from "../camera/HandTracker";

const PALM_LANDMARK = 9;
const DWELL_MS = 1500;
const DWELL_DRAIN_MS = 600;
const DWELL_ZONE_PAD = 60;

export class GameOverScene extends Phaser.Scene {
  private handCursors: Phaser.GameObjects.Arc[] = [];
  private dwellGraphics!: Phaser.GameObjects.Graphics;
  private btn!: Phaser.GameObjects.Text;
  private dwellProgress = 0;
  private dwellActivated = false;
  private handPositions: ({ x: number; y: number } | null)[] = [null, null];

  constructor() {
    super({ key: "GameOverScene" });
  }

  create() {
    const { width, height } = this.scale;
    const data = this.scene.settings.data as { score: number };
    const score = data?.score ?? 0;

    this.dwellProgress = 0;
    this.dwellActivated = false;
    this.handPositions = [null, null];

    const best = Math.max(score, parseInt(localStorage.getItem("eyetoy_best") ?? "0", 10));
    localStorage.setItem("eyetoy_best", String(best));

    AudioFX.gameOver();

    // Le flux webcam de GameScene est visible en fond via scene.launch
    // On pose juste un overlay semi-transparent
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setDepth(0);

    const cx = width / 2;

    this.add
      .text(cx, height * 0.28, "GAME OVER", {
        fontSize: "64px",
        fontFamily: "monospace",
        color: "#ff4444",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(1);

    this.add
      .text(cx, height * 0.45, `Score : ${score}`, {
        fontSize: "48px",
        fontFamily: "monospace",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(1);

    this.add
      .text(cx, height * 0.56, `Meilleur : ${best}`, {
        fontSize: "32px",
        fontFamily: "monospace",
        color: "#ffdd00",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(1);

    this.btn = this.add
      .text(cx, height * 0.72, "  REJOUER  ", {
        fontSize: "40px",
        fontFamily: "monospace",
        color: "#ffffff",
        backgroundColor: "#226622",
        stroke: "#000000",
        strokeThickness: 3,
        padding: { x: 20, y: 12 },
      })
      .setOrigin(0.5)
      .setDepth(1)
      .setInteractive({ useHandCursor: true });

    this.btn.on("pointerover", () => this.btn.setStyle({ backgroundColor: "#338833" }));
    this.btn.on("pointerout", () => this.btn.setStyle({ backgroundColor: "#226622" }));
    this.btn.on("pointerdown", () => this.doReplay());

    // Indice visuel dwell
    this.add
      .text(cx, height * 0.72 + 60, "✋  Maintiens ta main sur le bouton", {
        fontSize: "18px",
        fontFamily: "monospace",
        color: "#aaaaaa",
      })
      .setOrigin(0.5)
      .setDepth(1);

    this.dwellGraphics = this.add.graphics().setDepth(2);

    this.handCursors = [0x00ff88, 0x00aaff].map((color) =>
      this.add.circle(0, 0, 24, color, 0.8).setDepth(3).setVisible(false),
    );

    const onLandmarks = ({ hands }: LandmarksPayload) => {
      const { width: w, height: h } = this.scale;
      this.handPositions = [null, null];
      hands.forEach((hand, i) => {
        if (!hand || hand.length === 0) return;
        const lm = hand[PALM_LANDMARK];
        this.handPositions[i] = { x: (1 - lm.x) * w, y: lm.y * h };
      });
    };

    handTracker.on("landmarks", onLandmarks);
    this.events.once("shutdown", () => handTracker.off("landmarks", onLandmarks));
  }

  update(_time: number, delta: number) {
    // Curseurs mains
    this.handPositions.forEach((pos, i) => {
      const cursor = this.handCursors[i];
      if (!pos) { cursor.setVisible(false); return; }
      cursor.setPosition(pos.x, pos.y).setVisible(true);
    });

    // Zone de survol élargie
    const bounds = this.btn.getBounds();
    const hitZone = new Phaser.Geom.Rectangle(
      bounds.x - DWELL_ZONE_PAD,
      bounds.y - DWELL_ZONE_PAD,
      bounds.width + DWELL_ZONE_PAD * 2,
      bounds.height + DWELL_ZONE_PAD * 2,
    );

    const handOverButton = this.handPositions.some(
      (pos) => pos !== null && hitZone.contains(pos.x, pos.y),
    );

    if (handOverButton && !this.dwellActivated) {
      this.dwellProgress = Math.min(1, this.dwellProgress + delta / DWELL_MS);
      if (this.dwellProgress >= 1) {
        this.dwellActivated = true;
        AudioFX.pop();
        this.doReplay();
      }
    } else if (!handOverButton) {
      this.dwellProgress = Math.max(0, this.dwellProgress - delta / DWELL_DRAIN_MS);
    }

    this.drawDwellRing(bounds, this.dwellProgress);
    this.btn.setStyle({ backgroundColor: handOverButton ? "#338833" : "#226622" });
  }

  private drawDwellRing(bounds: Phaser.Geom.Rectangle, progress: number) {
    this.dwellGraphics.clear();
    if (progress <= 0) return;

    const cx = bounds.centerX;
    const cy = bounds.centerY;
    const r = Math.max(bounds.width, bounds.height) / 2 + 20;

    this.dwellGraphics.lineStyle(6, 0xffffff, 0.2);
    this.dwellGraphics.beginPath();
    this.dwellGraphics.arc(cx, cy, r, 0, Math.PI * 2);
    this.dwellGraphics.strokePath();

    const color = this.dwellProgress >= 1 ? 0x00ff00 : 0x00ff88;
    this.dwellGraphics.lineStyle(6, color, 0.95);
    this.dwellGraphics.beginPath();
    this.dwellGraphics.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    this.dwellGraphics.strokePath();
  }

  private doReplay() {
    this.scene.stop("GameScene");
    this.scene.start("MenuScene");
  }
}
