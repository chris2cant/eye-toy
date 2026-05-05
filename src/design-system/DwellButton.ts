import Phaser from "phaser";
import { HEX, COLOR, FONT } from "./tokens";

const CORNER = 10;
const SHAKE_THRESHOLD = 4;

export type DwellButtonConfig = {
  label: string;
  onActivate: () => void;
  dwellMs?: number;
  drainMs?: number;
  zonePad?: number;
  depth?: number;
  fontSize?: string;
};

export class DwellButton extends Phaser.GameObjects.Container {
  private _bg!: Phaser.GameObjects.Graphics;
  private _ring!: Phaser.GameObjects.Graphics;
  private _label!: Phaser.GameObjects.Text;
  private _w = 0;
  private _h = 0;
  private _progress = 0;
  private _activated = false;
  private _prevPositions: ({ x: number; y: number } | null)[] = [null, null];

  private readonly _chargeMs: number;
  private readonly _drainMs: number;
  private readonly _zonePad: number;
  private readonly _onActivate: () => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: DwellButtonConfig,
  ) {
    super(scene, x, y);
    this._onActivate = config.onActivate;
    this._chargeMs = config.dwellMs ?? 1200;
    this._drainMs = config.drainMs ?? 500;
    this._zonePad = config.zonePad ?? 60;

    this._bg = scene.add.graphics();
    this._ring = scene.add.graphics();
    this._label = scene.add
      .text(0, 0, config.label, {
        fontSize: config.fontSize ?? "44px",
        fontFamily: FONT.identity,
        color: COLOR.textPrimary,
        padding: { x: 32, y: 16 },
      })
      .setOrigin(0.5);

    this._w = this._label.width;
    this._h = this._label.height;

    this.setSize(this._w, this._h);
    this.add([this._bg, this._label, this._ring]);
    scene.add.existing(this);

    if (config.depth !== undefined) this.setDepth(config.depth);

    this.setInteractive();
    this.on("pointerdown", () => this._fire());
    this.on("pointerover", () => this._drawBg(true));
    this.on("pointerout", () => this._drawBg(false));

    this._drawBg(false);
  }

  private _fire() {
    if (this._activated) return;
    this._activated = true;
    this._onActivate();
  }

  private _drawBg(active: boolean) {
    const gfx = this._bg;
    const hw = this._w / 2;
    const hh = this._h / 2;

    gfx.clear();

    gfx.fillStyle(active ? HEX.brandPrimaryMuted : HEX.bgElevated, active ? 0.9 : 0.92);
    gfx.fillRect(-hw, -hh, this._w, this._h);

    gfx.lineStyle(active ? 2 : 1.5, HEX.brandPrimary, active ? 1 : 0.65);
    gfx.strokeRect(-hw, -hh, this._w, this._h);

    gfx.lineStyle(2.5, HEX.brandPrimary, 1);
    gfx.beginPath();
    gfx.moveTo(-hw, -hh + CORNER);
    gfx.lineTo(-hw, -hh);
    gfx.lineTo(-hw + CORNER, -hh);
    gfx.strokePath();

    gfx.beginPath();
    gfx.moveTo(hw - CORNER, -hh);
    gfx.lineTo(hw, -hh);
    gfx.lineTo(hw, -hh + CORNER);
    gfx.strokePath();

    gfx.beginPath();
    gfx.moveTo(-hw, hh - CORNER);
    gfx.lineTo(-hw, hh);
    gfx.lineTo(-hw + CORNER, hh);
    gfx.strokePath();

    gfx.beginPath();
    gfx.moveTo(hw - CORNER, hh);
    gfx.lineTo(hw, hh);
    gfx.lineTo(hw, hh - CORNER);
    gfx.strokePath();
  }

  private _drawRing() {
    const gfx = this._ring;
    gfx.clear();
    if (this._progress <= 0) return;

    const ringRadius = Math.max(this._w, this._h) / 2 + 24;

    gfx.lineStyle(4, HEX.textPrimary, 0.12);
    gfx.beginPath();
    gfx.arc(0, 0, ringRadius, 0, Math.PI * 2);
    gfx.strokePath();

    const color = this._progress >= 1 ? HEX.success : HEX.brandPrimary;
    gfx.lineStyle(4, color, 0.9);
    gfx.beginPath();
    gfx.arc(0, 0, ringRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this._progress);
    gfx.strokePath();
  }

  update(hands: ({ x: number; y: number } | null)[], delta: number) {
    if (this._activated) return;

    const hw = this._w / 2 + this._zonePad;
    const hh = this._h / 2 + this._zonePad;

    let totalMotion = 0;
    let handInZone = false;

    hands.forEach((hand, i) => {
      if (hand === null) {
        this._prevPositions[i] = null;
        return;
      }

      const inZone = Math.abs(hand.x - this.x) < hw && Math.abs(hand.y - this.y) < hh;

      if (inZone) {
        handInZone = true;
        const prev = this._prevPositions[i];
        if (prev !== null) {
          const dx = hand.x - prev.x;
          const dy = hand.y - prev.y;
          totalMotion += Math.sqrt(dx * dx + dy * dy);
        }
      }

      this._prevPositions[i] = hand;
    });

    const isShaking = handInZone && totalMotion > SHAKE_THRESHOLD;

    if (isShaking) {
      this._progress = Math.min(1, this._progress + delta / this._chargeMs);
      if (this._progress >= 1) this._fire();
    } else {
      this._progress = Math.max(0, this._progress - delta / this._drainMs);
    }

    const scale = 1 + this._progress * 0.4;
    this.setScale(scale);

    this._drawBg(handInZone);
    this._drawRing();
  }

  reset() {
    this._progress = 0;
    this._activated = false;
    this._prevPositions = [null, null];
    this.setScale(1);
    this._drawBg(false);
    this._drawRing();
  }
}
