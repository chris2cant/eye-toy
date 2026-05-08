import Phaser from "phaser";
import { FONT } from "../../design-system/tokens";
import type { SimonColor } from "./SimonAudio";

export type Quadrant = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const PROGRESS_EPSILON = 0.003;

const ZONE_COLORS: Record<SimonColor, { hex: number; css: string }> = {
  vert:  { hex: 0x2fffaa, css: "#2FFFAA" },
  rouge: { hex: 0xff5c7a, css: "#FF5C7A" },
  jaune: { hex: 0xffd166, css: "#FFD166" },
  bleu:  { hex: 0x5ab8ff, css: "#5AB8FF" },
};

const LABEL_FR: Record<SimonColor, string> = {
  vert:  "VERT",
  rouge: "ROUGE",
  jaune: "JAUNE",
  bleu:  "BLEU",
};

export class SimonZone extends Phaser.GameObjects.Container {
  readonly color: SimonColor;
  readonly quadrant: Quadrant;

  private bg!: Phaser.GameObjects.Graphics;
  private ring!: Phaser.GameObjects.Graphics;
  private label!: Phaser.GameObjects.Text;
  private zoneW = 0;
  private zoneH = 0;
  private zoneX = 0;
  private zoneY = 0;

  private dwellMs: number;
  private progress = 0;
  private lastRingProgress = -1;
  private ringX = 0;
  private ringY = 0;

  private flashTween: Phaser.Tweens.Tween | null = null;

  constructor(
    scene: Phaser.Scene,
    color: SimonColor,
    quadrant: Quadrant,
    dwellMs = 800,
  ) {
    super(scene, 0, 0);
    this.color = color;
    this.quadrant = quadrant;
    this.dwellMs = dwellMs;

    this.bg = scene.add.graphics();
    this.ring = scene.add.graphics();
    this.label = scene.add.text(0, 0, LABEL_FR[color], {
      fontSize: "28px",
      fontFamily: FONT.display,
      color: ZONE_COLORS[color].css,
    }).setOrigin(0.5).setAlpha(0.5);

    this.add([this.bg, this.label, this.ring]);
    scene.add.existing(this);
  }

  layout(screenW: number, screenH: number): void {
    this.zoneW = screenW / 2;
    this.zoneH = screenH / 2;

    const left = this.quadrant === "top-left" || this.quadrant === "bottom-left";
    const top  = this.quadrant === "top-left" || this.quadrant === "top-right";

    this.zoneX = left ? 0 : screenW / 2;
    this.zoneY = top  ? 0 : screenH / 2;

    this.bg.clear();
    this.bg.fillStyle(ZONE_COLORS[this.color].hex, 0.08);
    this.bg.fillRect(this.zoneX, this.zoneY, this.zoneW, this.zoneH);
    this.bg.lineStyle(2, ZONE_COLORS[this.color].hex, 0.25);
    this.bg.strokeRect(this.zoneX, this.zoneY, this.zoneW, this.zoneH);

    const cx = this.zoneX + this.zoneW / 2;
    const cy = this.zoneY + this.zoneH / 2;
    this.label.setPosition(cx, cy);

    this.ring.clear();
    this.lastRingProgress = -1;
  }

  flash(durationMs: number): void {
    if (this.flashTween) {
      this.flashTween.stop();
      this.flashTween = null;
    }

    const hex = ZONE_COLORS[this.color].hex;
    this.bg.clear();
    this.bg.fillStyle(hex, 0.6);
    this.bg.fillRect(this.zoneX, this.zoneY, this.zoneW, this.zoneH);
    this.bg.lineStyle(3, hex, 1);
    this.bg.strokeRect(this.zoneX, this.zoneY, this.zoneW, this.zoneH);
    this.label.setAlpha(1);

    this.flashTween = this.scene.tweens.addCounter({
      from: 100,
      to: 8,
      duration: durationMs,
      ease: "Cubic.Out",
      onUpdate: (tween) => {
        const alpha = (tween.getValue() ?? 8) / 100;
        this.bg.clear();
        this.bg.fillStyle(hex, alpha * 0.6);
        this.bg.fillRect(this.zoneX, this.zoneY, this.zoneW, this.zoneH);
        this.bg.lineStyle(2, hex, alpha);
        this.bg.strokeRect(this.zoneX, this.zoneY, this.zoneW, this.zoneH);
        this.label.setAlpha(alpha);
      },
      onComplete: () => {
        this.bg.clear();
        this.bg.fillStyle(hex, 0.08);
        this.bg.fillRect(this.zoneX, this.zoneY, this.zoneW, this.zoneH);
        this.bg.lineStyle(2, hex, 0.25);
        this.bg.strokeRect(this.zoneX, this.zoneY, this.zoneW, this.zoneH);
        this.label.setAlpha(0.5);
        this.flashTween = null;
      },
    });
  }

  containsPoint(px: number, py: number): boolean {
    return (
      px >= this.zoneX &&
      px < this.zoneX + this.zoneW &&
      py >= this.zoneY &&
      py < this.zoneY + this.zoneH
    );
  }

  updateHand(pos: { x: number; y: number } | null, delta: number): boolean {
    const inZone = pos !== null && this.containsPoint(pos.x, pos.y);

    if (inZone) {
      this.progress = Math.min(1, this.progress + delta / this.dwellMs);
      this.ringX = pos.x;
      this.ringY = pos.y;
    } else {
      this.progress = Math.max(0, this.progress - delta / (this.dwellMs * 0.5));
    }

    if (Math.abs(this.progress - this.lastRingProgress) > PROGRESS_EPSILON) {
      this._drawRing();
    }

    if (this.progress >= 1) {
      this.progress = 0;
      this.lastRingProgress = -1;
      this.ring.clear();
      return true;
    }

    return false;
  }

  resetProgress(): void {
    this.progress = 0;
    this.lastRingProgress = -1;
    this.ring.clear();
  }

  private _drawRing(): void {
    this.lastRingProgress = this.progress;
    this.ring.clear();
    if (this.progress <= 0) return;

    const hex = ZONE_COLORS[this.color].hex;
    const ringRadius = 36;

    this.ring.lineStyle(3, 0xffffff, 0.12);
    this.ring.beginPath();
    this.ring.arc(this.ringX, this.ringY, ringRadius, 0, Math.PI * 2);
    this.ring.strokePath();

    const endAngle = -Math.PI / 2 + Math.PI * 2 * this.progress;
    this.ring.lineStyle(4, hex, 0.95);
    this.ring.beginPath();
    this.ring.arc(this.ringX, this.ringY, ringRadius, -Math.PI / 2, endAngle);
    this.ring.strokePath();
  }
}
