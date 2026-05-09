import Phaser from "phaser";
import { HEX } from "../tokens";

const PROGRESS_EPSILON = 0.002;

export interface PaintColorConfig {
  fillColor: number;
  onActivate: () => void;
  icon?: string;
  iconColor?: string;
  rainbow?: boolean;
  radius?: number;
  dwellMs?: number;
  drainMs?: number;
  zonePad?: number;
  cooldownMs?: number;
  depth?: number;
}

export interface PaintColorHandle {
  container: Phaser.GameObjects.Container;
  setActive(active: boolean): void;
  update(hands: ({ x: number; y: number } | null)[], delta: number): void;
  reset(): void;
  destroy(): void;
}

class PaintColorControl extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly activeRing: Phaser.GameObjects.Graphics;
  private readonly fillColor: number;
  private readonly onActivate: () => void;
  private readonly rainbow: boolean;
  private readonly chargeMs: number;
  private readonly drainMs: number;
  private readonly zonePad: number;
  private readonly cooldownMs: number;
  private readonly radius: number;
  private progress = 0;
  private activated = false;
  private cooldownRemainingMs = 0;
  private lastHovering: boolean | null = null;
  private lastProgress = -1;
  private lastScale = 1;
  private isActive = false;

  constructor(scene: Phaser.Scene, x: number, y: number, config: PaintColorConfig) {
    super(scene, x, y);
    this.fillColor = config.fillColor;
    this.onActivate = config.onActivate;
    this.rainbow = config.rainbow ?? false;
    this.chargeMs = config.dwellMs ?? 850;
    this.drainMs = config.drainMs ?? 350;
    this.zonePad = config.zonePad ?? 44;
    this.cooldownMs = config.cooldownMs ?? 380;
    this.radius = config.radius ?? 34;

    this.bg = scene.add.graphics();
    this.ring = scene.add.graphics();
    this.activeRing = scene.add.graphics();
    this.attachChildren(scene, config.icon, config.iconColor);
    this.setSize(this.radius * 2, this.radius * 2);
    scene.add.existing(this);

    if (config.depth !== undefined) this.setDepth(config.depth);

    this.setInteractive({ useHandCursor: true });
    this.on("pointerdown", () => this.fire());
    this.on("pointerover", () => this.drawBg(true));
    this.on("pointerout", () => this.drawBg(false));

    this.drawBg(false);
    this.drawActiveRing();
  }

  setActive(active: boolean): void {
    this.isActive = active;
    this.drawActiveRing();
  }

  update(hands: ({ x: number; y: number } | null)[], delta: number): void {
    if (this.activated) return;
    const hovering = this.isHandInZone(hands);
    this.updateProgress(hovering, delta);
    this.syncVisuals(hovering);
  }

  reset(): void {
    this.progress = 0;
    this.activated = false;
    this.cooldownRemainingMs = this.cooldownMs;
    this.lastScale = 1;
    this.setScale(1);
    this.drawBg(false);
    this.drawRing();
  }

  private fire(): void {
    if (this.activated) return;
    this.activated = true;
    this.cooldownRemainingMs = this.cooldownMs;
    this.onActivate();
  }

  private drawBg(hovering: boolean): void {
    this.lastHovering = hovering;
    this.bg.clear();
    this.bg.fillStyle(0x000000, hovering ? 0.15 : 0.1);
    this.bg.fillCircle(2, 4, this.radius);
    this.bg.fillStyle(HEX.white, 0.92);
    this.bg.fillCircle(0, 0, this.radius);
    this.drawInnerFill(hovering);
    this.bg.fillStyle(HEX.white, hovering ? 0.22 : 0.14);
    this.bg.fillEllipse(0, -(this.radius - 6) * 0.32, (this.radius - 6) * 1.35, (this.radius - 6) * 0.9);
  }

  private attachChildren(scene: Phaser.Scene, icon?: string, iconColor?: string): void {
    const iconLabel = this.createIconLabel(scene, icon, iconColor);
    if (iconLabel) {
      this.add([this.bg, this.activeRing, iconLabel, this.ring]);
      return;
    }
    this.add([this.bg, this.activeRing, this.ring]);
  }

  private createIconLabel(scene: Phaser.Scene, icon?: string, iconColor?: string): Phaser.GameObjects.Text | null {
    if (!icon) return null;
    return scene.add.text(0, 0, icon, {
      fontSize: "26px",
      fontFamily: '"Fredoka", sans-serif',
      color: iconColor ?? "#1D2340",
    }).setOrigin(0.5);
  }

  private drawInnerFill(hovering: boolean): void {
    if (!this.rainbow) {
      this.bg.fillStyle(this.fillColor, hovering ? 1 : 0.94);
      this.bg.fillCircle(0, 0, this.radius - 5);
      return;
    }
    const radius = this.radius - 6;
    const rainbowColors = [0xff3b5c, 0xffa533, 0xffd166, 0x2fffaa, 0x36a3ff, 0x7b61ff];
    const orbit = radius * 0.44;
    for (let i = 0; i < rainbowColors.length; i++) {
      const angle = (Math.PI * 2 * i) / rainbowColors.length;
      const x = Math.cos(angle) * orbit;
      const y = Math.sin(angle) * orbit;
      this.bg.fillStyle(rainbowColors[i], hovering ? 1 : 0.94);
      this.bg.fillCircle(x, y, radius * 0.48);
    }
    this.bg.fillStyle(HEX.white, 0.5);
    this.bg.fillCircle(0, 0, radius * 0.45);
  }

  private drawActiveRing(): void {
    this.activeRing.clear();
    this.activeRing.lineStyle(4, this.isActive ? HEX.sunYellow : HEX.nightBlue, this.isActive ? 0.98 : 0.22);
    this.activeRing.beginPath();
    this.activeRing.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
    this.activeRing.strokePath();
  }

  private drawRing(): void {
    this.ring.clear();
    this.lastProgress = this.progress;
    if (this.progress <= 0) return;
    this.ring.lineStyle(4, HEX.nightBlue, 0.08);
    this.ring.beginPath();
    this.ring.arc(0, 0, this.radius + 12, 0, Math.PI * 2);
    this.ring.strokePath();
    const color = this.progress >= 1 ? HEX.sunYellow : HEX.punchyPink;
    this.ring.lineStyle(4, color, 0.95);
    this.ring.beginPath();
    this.ring.arc(0, 0, this.radius + 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.progress);
    this.ring.strokePath();
  }

  private isHandInZone(hands: ({ x: number; y: number } | null)[]): boolean {
    const zone = this.radius + this.zonePad;
    for (const hand of hands) {
      if (hand !== null && Math.hypot(hand.x - this.x, hand.y - this.y) <= zone) return true;
    }
    return false;
  }

  private updateProgress(hovering: boolean, delta: number): void {
    if (this.cooldownRemainingMs > 0) {
      this.cooldownRemainingMs = Math.max(0, this.cooldownRemainingMs - delta);
      this.progress = 0;
      return;
    }
    if (hovering) {
      this.progress = Math.min(1, this.progress + delta / this.chargeMs);
      if (this.progress >= 1) this.fire();
      return;
    }
    this.progress = Math.max(0, this.progress - delta / this.drainMs);
  }

  private syncVisuals(hovering: boolean): void {
    const scale = 1 + this.progress * 0.09;
    if (Math.abs(scale - this.lastScale) > PROGRESS_EPSILON) {
      this.lastScale = scale;
      this.setScale(scale);
    }
    if (this.lastHovering !== hovering) this.drawBg(hovering);
    if (Math.abs(this.progress - this.lastProgress) > PROGRESS_EPSILON || (this.progress === 0 && this.lastProgress !== 0)) {
      this.drawRing();
    }
  }
}

export function createPaintColor(scene: Phaser.Scene, x: number, y: number, config: PaintColorConfig): PaintColorHandle {
  const control = new PaintColorControl(scene, x, y, config);
  return {
    container: control,
    setActive: (active: boolean) => control.setActive(active),
    update: (hands, delta) => control.update(hands, delta),
    reset: () => control.reset(),
    destroy: () => control.destroy(),
  };
}
