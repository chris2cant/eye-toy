import Phaser from "phaser";
import { audioFX } from "../audio/AudioFX";
import { HEX, COLOR, FONT, DEPTH, GAME_CIRCLE_PALETTE } from "../design-system/tokens";

const MAX_CIRCLES = 5;
const SPAWN_TWEEN_MS = 220;
const POP_TWEEN_MS = 180;
const EXPIRE_TWEEN_MS = 350;
const HIT_TOLERANCE = 0;
const PALETTE = [...GAME_CIRCLE_PALETTE];
const PARTICLE_COUNT = 5;
const PARTICLE_ORBIT_FACTOR = 1.65;
const PARTICLE_SPEED = 0.00072; // rad/ms
const PULSE_DURATION = 1300; // ms per ring cycle

export type HandBounds = { x1: number; y1: number; x2: number; y2: number };
export type CircleConfig = { radius: number; expireDelay: number; points: number };

type GameCircle = {
  container: Phaser.GameObjects.Container;
  core: Phaser.GameObjects.Graphics;
  pulseRings: Phaser.GameObjects.Graphics[];
  pulseTweens: Phaser.Tweens.Tween[];
  particles: Phaser.GameObjects.Graphics[];
  radius: number;
  circleColor: number;
  spawnTime: number;
  expireTimer: Phaser.Time.TimerEvent;
  expireDelay: number;
  points: number;
  active: boolean;
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
    this.timerGraphics = scene.add.graphics().setDepth(DEPTH.game + 1);
  }

  get count(): number { return this.circles.length; }
  get isAtCapacity(): boolean { return this.circles.length >= MAX_CIRCLES; }

  spawn(x: number, y: number, cfg: CircleConfig, onExpired: (scoreDelta: number) => void): void {
    const { radius, expireDelay, points } = cfg;
    const color = Phaser.Utils.Array.GetRandom(PALETTE) as number;

    const container = this.scene.add.container(x, y).setDepth(DEPTH.game).setScale(0);

    // 2 pulsing rings expanding outward, staggered
    const pulseRings: Phaser.GameObjects.Graphics[] = [];
    const pulseTweens: Phaser.Tweens.Tween[] = [];
    for (let i = 0; i < 2; i++) {
      const ring = this.scene.add.graphics();
      ring.lineStyle(2, color, 0.65);
      ring.strokeCircle(0, 0, radius * 0.9);
      ring.setAlpha(0).setScale(1);
      container.add(ring);
      pulseRings.push(ring);

      const tween = this.scene.tweens.add({
        targets: ring,
        scaleX: 2.4,
        scaleY: 2.4,
        alpha: { from: 0.65, to: 0 },
        duration: PULSE_DURATION,
        delay: i * (PULSE_DURATION / 2),
        repeat: -1,
        ease: "Sine.Out",
      });
      pulseTweens.push(tween);
    }

    // Opaque core — readable on any webcam background
    const core = this.scene.add.graphics();
    this.drawCore(core, color, radius);
    container.add(core);

    // Orbiting particles
    const orbitR = radius * PARTICLE_ORBIT_FACTOR;
    const particles: Phaser.GameObjects.Graphics[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = this.scene.add.graphics();
      const pr = i % 2 === 0 ? 3.5 : 2.5;
      p.fillStyle(color, 0.9);
      p.fillCircle(0, 0, pr);
      p.fillStyle(0xffffff, 0.4);
      p.fillCircle(-pr * 0.3, -pr * 0.3, pr * 0.5);
      const a0 = (i * Math.PI * 2) / PARTICLE_COUNT;
      p.setPosition(Math.cos(a0) * orbitR, Math.sin(a0) * orbitR);
      container.add(p);
      particles.push(p);
    }

    const circle: GameCircle = {
      container, core, pulseRings, pulseTweens, particles,
      radius, circleColor: color,
      spawnTime: this.scene.time.now,
      expireDelay, points, active: true,
      expireTimer: {} as Phaser.Time.TimerEvent,
    };

    circle.expireTimer = this.scene.time.addEvent({
      delay: expireDelay,
      callback: () => {
        const idx = this.circles.indexOf(circle);
        if (idx !== -1) this.expireAt(idx, onExpired);
      },
    });

    this.circles.push(circle);
    this.scene.tweens.add({
      targets: container,
      scale: 1,
      duration: SPAWN_TWEEN_MS,
      ease: "Back.Out",
    });
  }

  private drawCore(gfx: Phaser.GameObjects.Graphics, color: number, radius: number): void {
    gfx.clear();
    // Dark shadow halo — contrast on bright webcam backgrounds
    gfx.fillStyle(0x000000, 0.28);
    gfx.fillCircle(0, 0, radius + 4);
    // Main solid fill
    gfx.fillStyle(color, 0.93);
    gfx.fillCircle(0, 0, radius);
    // Specular highlight (top-left)
    gfx.fillStyle(0xffffff, 0.28);
    gfx.fillCircle(-radius * 0.25, -radius * 0.28, radius * 0.42);
    // Crisp white border
    gfx.lineStyle(2.5, 0xffffff, 0.72);
    gfx.strokeCircle(0, 0, radius);
  }

  popAt(index: number, onScore: (scoreDelta: number) => void): void {
    const circle = this.circles[index];
    circle.active = false;
    circle.expireTimer.destroy();
    this.circles.splice(index, 1);
    circle.pulseTweens.forEach((t) => t.stop());
    onScore(circle.points);
    audioFX.pop();
    this.spawnFloatText(circle.container.x, circle.container.y, `+${circle.points}`, "#ffff00");
    this.animatePop(circle);
  }

  private animatePop(circle: GameCircle): void {
    const orbitR = circle.radius * PARTICLE_ORBIT_FACTOR;
    // Particles burst outward
    circle.particles.forEach((p, i) => {
      const a = (i * Math.PI * 2) / PARTICLE_COUNT;
      this.scene.tweens.add({
        targets: p,
        x: Math.cos(a) * orbitR * 3.2,
        y: Math.sin(a) * orbitR * 3.2,
        alpha: 0,
        scaleX: 1.8,
        scaleY: 1.8,
        duration: POP_TWEEN_MS * 2.2,
        ease: "Power2.Out",
      });
    });
    // Core flash
    this.scene.tweens.add({
      targets: circle.core,
      scaleX: 2.2,
      scaleY: 2.2,
      alpha: 0,
      duration: POP_TWEEN_MS,
      ease: "Power2.Out",
    });
    // Rings final burst
    circle.pulseRings.forEach((ring) => {
      this.scene.tweens.add({
        targets: ring,
        scaleX: 3.5,
        scaleY: 3.5,
        alpha: 0,
        duration: POP_TWEEN_MS * 1.8,
        ease: "Power2.Out",
      });
    });
    this.scene.time.delayedCall(POP_TWEEN_MS * 2.5, () => circle.container.destroy());
  }

  private expireAt(index: number, onScore: (scoreDelta: number) => void): void {
    const circle = this.circles[index];
    circle.active = false;
    this.circles.splice(index, 1);
    onScore(-5);
    audioFX.expire();
    this.spawnFloatText(circle.container.x, circle.container.y, "-5", "#ff4444");
    circle.pulseTweens.forEach((t) => t.stop());
    this.drawCore(circle.core, HEX.danger, circle.radius);
    this.scene.tweens.add({
      targets: circle.container,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: EXPIRE_TWEEN_MS,
      ease: "Power2.In",
      onComplete: () => circle.container.destroy(),
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
      const { x, y } = circle.container;
      const nearestX = Phaser.Math.Clamp(x, bounds.x1, bounds.x2);
      const nearestY = Phaser.Math.Clamp(y, bounds.y1, bounds.y2);
      const dist = Phaser.Math.Distance.Between(x, y, nearestX, nearestY);
      if (dist < circle.radius + HIT_TOLERANCE) this.popAt(i, onScore);
    }
  }

  renderTimerArcs(now: number): void {
    this.timerGraphics.clear();
    for (const circle of this.circles) {
      if (!circle.active) continue;

      // Update orbiting particle positions
      const baseAngle = now * PARTICLE_SPEED;
      const orbitR = circle.radius * PARTICLE_ORBIT_FACTOR;
      circle.particles.forEach((p, i) => {
        const a = baseAngle + (i * Math.PI * 2) / PARTICLE_COUNT;
        p.setPosition(Math.cos(a) * orbitR, Math.sin(a) * orbitR);
      });

      // Countdown arc in world coords (outside container scale)
      const { x, y } = circle.container;
      const elapsed = now - circle.spawnTime;
      const remaining = 1 - Math.min(elapsed / circle.expireDelay, 1);
      if (remaining <= 0) continue;
      const startAngle = -Math.PI / 2;
      const arcColor = remaining > 0.4 ? 0xffffff : 0xff6600;
      this.timerGraphics.lineStyle(4, arcColor, 0.9);
      this.timerGraphics.beginPath();
      this.timerGraphics.arc(x, y, circle.radius + 8, startAngle, startAngle + 2 * Math.PI * remaining, false);
      this.timerGraphics.strokePath();
    }
  }

  clearAll(): void {
    this.circles.forEach((circle) => {
      circle.expireTimer.destroy();
      circle.pulseTweens.forEach((t) => t.stop());
      circle.container.destroy();
    });
    this.circles = [];
    this.timerGraphics.clear();
  }
}

export function computeHandBounds(
  hand: { x: number; y: number }[],
  mapper: (lmX: number, lmY: number) => { x: number; y: number },
): HandBounds {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const lm of hand) {
    const { x: sx, y: sy } = mapper(lm.x, lm.y);
    if (sx < minX) minX = sx;
    if (sx > maxX) maxX = sx;
    if (sy < minY) minY = sy;
    if (sy > maxY) maxY = sy;
  }
  return { x1: minX, y1: minY, x2: maxX, y2: maxY };
}
