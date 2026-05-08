import Phaser from "phaser";
import { HEX, COLOR, FONT } from "../tokens";

const PROGRESS_EPSILON = 0.002;
const DEFAULT_DWELL_MS = 900;
const DEFAULT_DRAIN_MS = 400;
const DEFAULT_ZONE_PAD = 64;
const DEFAULT_COOLDOWN_MS = 500;

export type NavArrowDirection = "left" | "right";

export interface NavArrowConfig {
  direction: NavArrowDirection;
  onActivate: () => void;
  radius?: number;
  dwellMs?: number;
  drainMs?: number;
  zonePad?: number;
  cooldownMs?: number;
  depth?: number;
  fillColor?: number;
}

export class NavArrow extends Phaser.GameObjects.Container {
  private _bg!: Phaser.GameObjects.Graphics;
  private _ring!: Phaser.GameObjects.Graphics;
  private _label!: Phaser.GameObjects.Text;
  private _radius: number;
  private _progress = 0;
  private _activated = false;
  private _cooldownRemainingMs = 0;
  private _lastBgActive: boolean | null = null;
  private _lastRingProgress = -1;
  private _lastScale = 1;
  private _fillColor: number;

  private readonly _chargeMs: number;
  private readonly _drainMs: number;
  private readonly _zonePad: number;
  private readonly _cooldownMs: number;
  private readonly _onActivate: () => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: NavArrowConfig,
  ) {
    super(scene, x, y);
    this._onActivate = config.onActivate;
    this._chargeMs = config.dwellMs ?? DEFAULT_DWELL_MS;
    this._drainMs = config.drainMs ?? DEFAULT_DRAIN_MS;
    this._zonePad = config.zonePad ?? DEFAULT_ZONE_PAD;
    this._cooldownMs = config.cooldownMs ?? DEFAULT_COOLDOWN_MS;
    this._radius = config.radius ?? 44;
    this._fillColor = config.fillColor ?? HEX.nightBlue;

    const arrow = config.direction === "left" ? "◀" : "▶";

    this._bg = scene.add.graphics();
    this._ring = scene.add.graphics();
    this._label = scene.add
      .text(0, 1, arrow, {
        fontSize: "24px",
        fontFamily: FONT.display,
        color: COLOR.white,
      })
      .setOrigin(0.5);

    this.setSize(this._radius * 2, this._radius * 2);
    this.add([this._bg, this._label, this._ring]);
    scene.add.existing(this);

    if (config.depth !== undefined) this.setDepth(config.depth);

    this.setInteractive({ useHandCursor: true });
    this.on("pointerdown", () => this._fire());
    this.on("pointerover", () => this._drawBg(true));
    this.on("pointerout", () => this._drawBg(false));

    this._drawBg(false);
  }

  private _fire() {
    if (this._activated) return;
    this._activated = true;
    this._cooldownRemainingMs = this._cooldownMs;
    this._onActivate();
  }

  private _drawBg(active: boolean) {
    this._lastBgActive = active;
    const radius = this._radius;

    this._bg.clear();

    this._bg.fillStyle(0x000000, active ? 0.16 : 0.1);
    this._bg.fillCircle(3, 5, radius);

    this._bg.fillStyle(this._fillColor, active ? 1 : 0.88);
    this._bg.fillCircle(0, 0, radius);

    this._bg.fillStyle(HEX.white, active ? 0.14 : 0.08);
    this._bg.fillEllipse(0, -radius * 0.25, radius * 1.2, radius * 0.9);
  }

  private _drawRing() {
    const gfx = this._ring;
    gfx.clear();
    this._lastRingProgress = this._progress;
    if (this._progress <= 0) return;

    const ringR = this._radius + 10;

    gfx.lineStyle(4, HEX.nightBlue, 0.08);
    gfx.beginPath();
    gfx.arc(0, 0, ringR, 0, Math.PI * 2);
    gfx.strokePath();

    const color = this._progress >= 1 ? HEX.sunYellow : HEX.punchyPink;
    gfx.lineStyle(4, color, 0.95);
    gfx.beginPath();
    gfx.arc(0, 0, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this._progress);
    gfx.strokePath();
  }

  private _isHandInZone(hands: ({ x: number; y: number } | null)[]): boolean {
    const zone = this._radius + this._zonePad;
    for (const hand of hands) {
      if (hand !== null && Math.hypot(hand.x - this.x, hand.y - this.y) < zone) {
        return true;
      }
    }
    return false;
  }

  private _updateProgress(handInZone: boolean, delta: number): void {
    if (this._cooldownRemainingMs > 0) {
      this._cooldownRemainingMs = Math.max(0, this._cooldownRemainingMs - delta);
      this._progress = 0;
    } else if (handInZone) {
      this._progress = Math.min(1, this._progress + delta / this._chargeMs);
      if (this._progress >= 1) this._fire();
    } else {
      this._progress = Math.max(0, this._progress - delta / this._drainMs);
    }
  }

  private _syncVisuals(handInZone: boolean): void {
    const scale = 1 + this._progress * 0.1;
    if (Math.abs(scale - this._lastScale) > PROGRESS_EPSILON) {
      this._lastScale = scale;
      this.setScale(scale);
    }
    if (this._lastBgActive !== handInZone) this._drawBg(handInZone);
    if (Math.abs(this._progress - this._lastRingProgress) > PROGRESS_EPSILON ||
        (this._progress === 0 && this._lastRingProgress !== 0)) {
      this._drawRing();
    }
  }

  update(hands: ({ x: number; y: number } | null)[], delta: number) {
    if (this._activated) return;
    const handInZone = this._isHandInZone(hands);
    this._updateProgress(handInZone, delta);
    this._syncVisuals(handInZone);
  }

  reset() {
    this._progress = 0;
    this._activated = false;
    this._cooldownRemainingMs = this._cooldownMs;
    this._lastScale = 1;
    this.setScale(1);
    this._drawBg(false);
    this._drawRing();
  }
}
