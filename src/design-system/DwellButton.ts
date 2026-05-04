import Phaser from "phaser";
import { HEX, COLOR, FONT } from "./tokens";

const CORNER = 10;

export class DwellButton extends Phaser.GameObjects.Container {
  private _bg!: Phaser.GameObjects.Graphics;
  private _ring!: Phaser.GameObjects.Graphics;
  private _label!: Phaser.GameObjects.Text;
  private _w = 0;
  private _h = 0;
  private _progress = 0;
  private _activated = false;

  private readonly _dwellMs: number;
  private readonly _drainMs: number;
  private readonly _zonePad: number;
  private readonly _onActivate: () => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    onActivate: () => void,
    opts: { dwellMs?: number; drainMs?: number; zonePad?: number; depth?: number } = {},
  ) {
    super(scene, x, y);
    this._onActivate = onActivate;
    this._dwellMs = opts.dwellMs ?? 1500;
    this._drainMs = opts.drainMs ?? 600;
    this._zonePad = opts.zonePad ?? 60;

    this._bg = scene.add.graphics();
    this._ring = scene.add.graphics();
    this._label = scene.add
      .text(0, 0, label, {
        fontSize: "44px",
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

    if (opts.depth !== undefined) this.setDepth(opts.depth);

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
    const g = this._bg;
    const hw = this._w / 2;
    const hh = this._h / 2;

    g.clear();

    g.fillStyle(active ? HEX.brandPrimaryMuted : HEX.bgElevated, active ? 0.9 : 0.92);
    g.fillRect(-hw, -hh, this._w, this._h);

    g.lineStyle(active ? 2 : 1.5, HEX.brandPrimary, active ? 1 : 0.65);
    g.strokeRect(-hw, -hh, this._w, this._h);

    // Corner L-accents
    g.lineStyle(2.5, HEX.brandPrimary, 1);
    g.beginPath();
    g.moveTo(-hw, -hh + CORNER);
    g.lineTo(-hw, -hh);
    g.lineTo(-hw + CORNER, -hh);
    g.strokePath();

    g.beginPath();
    g.moveTo(hw - CORNER, -hh);
    g.lineTo(hw, -hh);
    g.lineTo(hw, -hh + CORNER);
    g.strokePath();

    g.beginPath();
    g.moveTo(-hw, hh - CORNER);
    g.lineTo(-hw, hh);
    g.lineTo(-hw + CORNER, hh);
    g.strokePath();

    g.beginPath();
    g.moveTo(hw - CORNER, hh);
    g.lineTo(hw, hh);
    g.lineTo(hw, hh - CORNER);
    g.strokePath();
  }

  private _drawRing() {
    const g = this._ring;
    g.clear();
    if (this._progress <= 0) return;

    const r = Math.max(this._w, this._h) / 2 + 24;

    g.lineStyle(4, HEX.textPrimary, 0.12);
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.strokePath();

    const color = this._progress >= 1 ? HEX.success : HEX.brandPrimary;
    g.lineStyle(4, color, 0.9);
    g.beginPath();
    g.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this._progress);
    g.strokePath();
  }

  update(hands: ({ x: number; y: number } | null)[], delta: number) {
    if (this._activated) return;

    const hw = this._w / 2 + this._zonePad;
    const hh = this._h / 2 + this._zonePad;

    const handOver = hands.some(
      (p) => p !== null && Math.abs(p.x - this.x) < hw && Math.abs(p.y - this.y) < hh,
    );

    if (handOver) {
      this._progress = Math.min(1, this._progress + delta / this._dwellMs);
      if (this._progress >= 1) this._fire();
    } else {
      this._progress = Math.max(0, this._progress - delta / this._drainMs);
    }

    this._drawBg(handOver);
    this._drawRing();
  }

  reset() {
    this._progress = 0;
    this._activated = false;
    this._drawBg(false);
    this._drawRing();
  }
}
