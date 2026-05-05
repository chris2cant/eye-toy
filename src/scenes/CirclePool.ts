import Phaser from "phaser";
import { audioFX } from "../audio/AudioFX";
import { HEX, COLOR, FONT, DEPTH, GAME_CIRCLE_PALETTE } from "../design-system/tokens";

const MAX_CIRCLES = 5;
const SPAWN_TWEEN_MS = 200;
const POP_TWEEN_MS = 150;
const EXPIRE_TWEEN_MS = 300;
const HIT_TOLERANCE = 0;
const PALETTE = [...GAME_CIRCLE_PALETTE];

export type HandBounds = { x1: number; y1: number; x2: number; y2: number };
export type CircleConfig = { radius: number; expireDelay: number; points: number };

type GameCircle = Phaser.GameObjects.Graphics & {
  radius: number;
  circleColor: number;
  spawnTime: number;
  expireTimer: Phaser.Time.TimerEvent;
  expireDelay: number;
  points: number;
  glowFx: Phaser.FX.Glow;
  glowTween: Phaser.Tweens.Tween;
};

const FLOAT_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: "28px",
  fontFamily: FONT.identity,
  color: COLOR.brandPrimary,
  stroke: COLOR.bgCanvas,
  strokeThickness: 3,
};

export class CirclePool {
  private circles: GameCircle[] = [];
  private readonly timerGraphics: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {
    this.timerGraphics = scene.add.graphics().setDepth(6);
  }

  get count(): number { return this.circles.length; }
  get isAtCapacity(): boolean { return this.circles.length >= MAX_CIRCLES; }

  spawn(x: number, y: number, cfg: CircleConfig, onExpired: (scoreDelta: number) => void): void {
    const { radius, expireDelay, points } = cfg;
    const color = Phaser.Utils.Array.GetRandom(PALETTE) as number;
    const circle = this.scene.add.graphics() as GameCircle;
    circle.setPosition(x, y).setDepth(DEPTH.game).setScale(0);
    circle.radius = radius;
    circle.circleColor = color;
    this.drawReticle(circle, color, radius);

    circle.spawnTime = this.scene.time.now;
    circle.expireDelay = expireDelay;
    circle.points = points;
    circle.expireTimer = this.scene.time.addEvent({
      delay: expireDelay,
      callback: () => {
        const idx = this.circles.indexOf(circle);
        if (idx !== -1) this.expireAt(idx, onExpired);
      },
    });

    this.circles.push(circle);
    this.scene.tweens.add({ targets: circle, scale: 1, duration: SPAWN_TWEEN_MS, ease: "Back.Out" });

    circle.glowFx = circle.postFX.addGlow(color, 2, 0, false, 0.1, 12);
    circle.glowTween = this.scene.tweens.add({
      targets: circle.glowFx,
      outerStrength: 10,
      yoyo: true,
      repeat: -1,
      duration: 900,
      ease: "Sine.InOut",
    });
  }

  private drawReticle(gfx: Phaser.GameObjects.Graphics, color: number, radius: number): void {
    gfx.clear();
    gfx.fillStyle(color, 0.82);
    gfx.fillCircle(0, 0, radius);
    gfx.lineStyle(3, 0xffffff, 0.55);
    gfx.strokeCircle(0, 0, radius);
  }

  popAt(index: number, onScore: (scoreDelta: number) => void): void {
    const circle = this.circles[index];
    circle.setActive(false);
    circle.expireTimer.destroy();
    this.circles.splice(index, 1);
    circle.glowTween?.stop();
    circle.postFX?.clear();
    onScore(circle.points);
    audioFX.pop();
    this.spawnFloatText(circle.x, circle.y, `+${circle.points}`, "#ffff00");
    this.scene.tweens.add({
      targets: circle,
      scale: 0,
      alpha: 0,
      duration: POP_TWEEN_MS,
      ease: "Power2.In",
      onComplete: () => circle.destroy(),
    });
  }

  private expireAt(index: number, onScore: (scoreDelta: number) => void): void {
    const circle = this.circles[index];
    circle.setActive(false);
    this.circles.splice(index, 1);
    onScore(-5);
    audioFX.expire();
    this.spawnFloatText(circle.x, circle.y, "-5", "#ff4444");
    circle.glowTween?.stop();
    circle.postFX?.clear();
    this.drawReticle(circle, HEX.danger, circle.radius);
    this.scene.tweens.add({
      targets: circle,
      scale: 0,
      alpha: 0,
      duration: EXPIRE_TWEEN_MS,
      ease: "Power2.In",
      onComplete: () => circle.destroy(),
    });
  }

  private spawnFloatText(x: number, y: number, label: string, color: string): void {
    const txt = this.scene.add
      .text(x, y, label, { ...FLOAT_TEXT_STYLE, color })
      .setOrigin(0.5)
      .setDepth(15);
    this.scene.tweens.add({
      targets: txt,
      y: y - 60,
      alpha: 0,
      duration: 600,
      ease: "Power1.Out",
      onComplete: () => txt.destroy(),
    });
  }

  checkAndProcess(bounds: HandBounds, onScore: (scoreDelta: number) => void): void {
    for (let i = this.circles.length - 1; i >= 0; i--) {
      const circle = this.circles[i];
      if (!circle.active) continue;
      const nearestX = Phaser.Math.Clamp(circle.x, bounds.x1, bounds.x2);
      const nearestY = Phaser.Math.Clamp(circle.y, bounds.y1, bounds.y2);
      const dist = Phaser.Math.Distance.Between(circle.x, circle.y, nearestX, nearestY);
      if (dist < circle.radius + HIT_TOLERANCE) this.popAt(i, onScore);
    }
  }

  renderTimerArcs(now: number): void {
    this.timerGraphics.clear();
    for (const circle of this.circles) {
      if (!circle.active) continue;
      const elapsed = now - circle.spawnTime;
      const remaining = 1 - Math.min(elapsed / circle.expireDelay, 1);
      if (remaining <= 0) continue;
      const startAngle = -Math.PI / 2;
      const arcColor = remaining > 0.4 ? 0xffffff : 0xff6600;
      this.timerGraphics.lineStyle(4, arcColor, 0.9);
      this.timerGraphics.beginPath();
      this.timerGraphics.arc(circle.x, circle.y, circle.radius + 6, startAngle, startAngle + 2 * Math.PI * remaining, false);
      this.timerGraphics.strokePath();
    }
  }

  clearAll(): void {
    this.circles.forEach((circle) => { circle.expireTimer.destroy(); circle.destroy(); });
    this.circles = [];
    this.timerGraphics.clear();
  }
}

export function computeHandBounds(
  hand: { x: number; y: number }[],
  width: number,
  height: number,
): HandBounds {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const lm of hand) {
    const sx = (1 - lm.x) * width;
    const sy = lm.y * height;
    if (sx < minX) minX = sx;
    if (sx > maxX) maxX = sx;
    if (sy < minY) minY = sy;
    if (sy > maxY) maxY = sy;
  }
  return { x1: minX, y1: minY, x2: maxX, y2: maxY };
}
