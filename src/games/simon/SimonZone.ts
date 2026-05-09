import Phaser from "phaser";
import { FONT } from "../../design-system/tokens";
import type { SimonColor } from "./SimonAudio";

export type SimonAnchor = "top-left" | "top-right" | "left" | "right";

const PROGRESS_EPSILON = 0.003;

const ZONE_COLORS: Record<SimonColor, { hex: number; css: string }> = {
  vert: { hex: 0x2fffaa, css: "#2FFFAA" },
  rouge: { hex: 0xff5c7a, css: "#FF5C7A" },
  jaune: { hex: 0xffd166, css: "#FFD166" },
  bleu: { hex: 0x5ab8ff, css: "#5AB8FF" },
};

const LABEL_FR: Record<SimonColor, string> = {
  vert: "VERT",
  rouge: "ROUGE",
  jaune: "JAUNE",
  bleu: "BLEU",
};

export class SimonZone extends Phaser.GameObjects.Container {
  readonly color: SimonColor;
  readonly anchor: SimonAnchor;

  private halo!: Phaser.GameObjects.Graphics;
  private target!: Phaser.GameObjects.Graphics;
  private progressRing!: Phaser.GameObjects.Graphics;
  private label!: Phaser.GameObjects.Text;
  private centerX = 0;
  private centerY = 0;
  private radius = 56;
  private hitRadius = 70;

  private dwellMs: number;
  private progress = 0;
  private lastRingProgress = -1;
  private flashIntensity = 0;
  private flashTween: Phaser.Tweens.Tween | null = null;

  constructor(
    scene: Phaser.Scene,
    color: SimonColor,
    anchor: SimonAnchor,
    dwellMs = 800,
  ) {
    super(scene, 0, 0);
    this.color = color;
    this.anchor = anchor;
    this.dwellMs = dwellMs;

    this.halo = scene.add.graphics();
    this.target = scene.add.graphics();
    this.progressRing = scene.add.graphics();
    this.label = scene.add.text(0, 0, LABEL_FR[color], {
      fontSize: "28px",
      fontFamily: FONT.display,
      color: ZONE_COLORS[color].css,
    }).setOrigin(0.5).setAlpha(0.8);

    this.add([this.halo, this.target, this.progressRing, this.label]);
    scene.add.existing(this);
  }

  layout(screenW: number, screenH: number, radius: number): void {
    this.radius = radius;
    this.hitRadius = radius * 1.2;
    const anchorPosition = this.resolveAnchorPosition(screenW, screenH);
    this.centerX = anchorPosition.x;
    this.centerY = anchorPosition.y;
    this.label.setPosition(this.centerX, this.centerY + this.radius + 22);
    this.drawTarget();
    this.progressRing.clear();
    this.lastRingProgress = -1;
  }

  flash(durationMs: number): void {
    if (this.flashTween) {
      this.flashTween.stop();
      this.flashTween = null;
    }

    this.flashIntensity = 1;
    this.label.setAlpha(1);
    this.drawTarget();

    this.flashTween = this.scene.tweens.addCounter({
      from: 100,
      to: 0,
      duration: durationMs,
      ease: "Cubic.Out",
      onUpdate: (tween) => {
        this.flashIntensity = (tween.getValue() ?? 0) / 100;
        this.label.setAlpha(0.8 + this.flashIntensity * 0.2);
        this.drawTarget();
      },
      onComplete: () => {
        this.flashIntensity = 0;
        this.label.setAlpha(0.8);
        this.drawTarget();
        this.flashTween = null;
      },
    });
  }

  containsPoint(px: number, py: number): boolean {
    const dx = px - this.centerX;
    const dy = py - this.centerY;
    return dx * dx + dy * dy <= this.hitRadius * this.hitRadius;
  }

  updateHand(pos: { x: number; y: number } | null, delta: number): boolean {
    const inZone = pos !== null && this.containsPoint(pos.x, pos.y);

    if (inZone) {
      this.progress = Math.min(1, this.progress + delta / this.dwellMs);
    } else {
      this.progress = Math.max(0, this.progress - delta / (this.dwellMs * 0.5));
    }

    if (Math.abs(this.progress - this.lastRingProgress) > PROGRESS_EPSILON) {
      this.drawProgressRing();
    }

    if (this.progress >= 1) {
      this.progress = 0;
      this.lastRingProgress = -1;
      this.progressRing.clear();
      return true;
    }

    return false;
  }

  resetProgress(): void {
    this.progress = 0;
    this.lastRingProgress = -1;
    this.progressRing.clear();
  }

  private drawTarget(): void {
    const baseHex = ZONE_COLORS[this.color].hex;
    const haloRadius = this.radius * 1.9;
    const outerRingRadius = this.radius + 10;
    const flashBoost = this.flashIntensity;

    this.halo.clear();
    this.halo.fillStyle(baseHex, 0.12 + flashBoost * 0.22);
    this.halo.fillCircle(this.centerX, this.centerY, haloRadius);

    this.target.clear();
    this.target.fillStyle(baseHex, 0.22 + flashBoost * 0.45);
    this.target.fillCircle(this.centerX, this.centerY, this.radius);
    this.target.lineStyle(4, 0xffffff, 0.85 + flashBoost * 0.15);
    this.target.strokeCircle(this.centerX, this.centerY, this.radius - 4);
    this.target.lineStyle(3, baseHex, 0.7 + flashBoost * 0.3);
    this.target.strokeCircle(this.centerX, this.centerY, outerRingRadius);
    this.target.fillStyle(0xffffff, 0.18 + flashBoost * 0.2);
    this.target.fillCircle(this.centerX, this.centerY, this.radius * 0.52);
  }

  private drawProgressRing(): void {
    this.lastRingProgress = this.progress;
    this.progressRing.clear();
    if (this.progress <= 0) return;

    const hex = ZONE_COLORS[this.color].hex;
    const ringRadius = this.radius + 18;

    this.progressRing.lineStyle(4, 0xffffff, 0.2);
    this.progressRing.beginPath();
    this.progressRing.arc(this.centerX, this.centerY, ringRadius, 0, Math.PI * 2);
    this.progressRing.strokePath();

    const endAngle = -Math.PI / 2 + Math.PI * 2 * this.progress;
    this.progressRing.lineStyle(6, hex, 0.96);
    this.progressRing.beginPath();
    this.progressRing.arc(this.centerX, this.centerY, ringRadius, -Math.PI / 2, endAngle);
    this.progressRing.strokePath();
  }

  private resolveAnchorPosition(screenW: number, screenH: number): { x: number; y: number } {
    if (this.anchor === "top-left") {
      return { x: screenW * 0.28, y: screenH * 0.28 };
    }
    if (this.anchor === "top-right") {
      return { x: screenW * 0.72, y: screenH * 0.28 };
    }
    if (this.anchor === "left") {
      return { x: screenW * 0.2, y: screenH * 0.6 };
    }
    return { x: screenW * 0.8, y: screenH * 0.6 };
  }
}
