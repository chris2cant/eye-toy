import Phaser from "phaser";
import { DEPTH, GAME_CIRCLE_PALETTE } from "../design-system/tokens";
import { triggerPop, triggerExpire } from "./CirclePoolFX";

const MAX_CIRCLES = 5;
const SPAWN_TWEEN_MS = 220;
const HIT_TOLERANCE = 0;
const PALETTE = [...GAME_CIRCLE_PALETTE];
const PARTICLE_COUNT = 5;
const PARTICLE_ORBIT_FACTOR = 1.65;
const PARTICLE_SPEED = 0.00072;
const PULSE_DURATION = 1300;

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

export class CirclePool {
  private circles: GameCircle[] = [];
  private readonly timerGraphics: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {
    this.timerGraphics = scene.add.graphics().setDepth(DEPTH.game + 1);
  }

  get count(): number { return this.circles.length; }
  get isAtCapacity(): boolean { return this.circles.length >= MAX_CIRCLES; }

  spawn(spawnX: number, spawnY: number, cfg: CircleConfig, onExpired: (scoreDelta: number) => void): void {
    const { radius, expireDelay, points } = cfg;
    const color = Phaser.Utils.Array.GetRandom(PALETTE) as number;

    const container = this.scene.add.container(spawnX, spawnY).setDepth(DEPTH.game).setScale(0);
    const { pulseRings, pulseTweens } = this.spawnPulseRings(container, color, radius);
    const core = this.scene.add.graphics();
    this.drawCore(core, color, radius);
    container.add(core);
    const particles = this.spawnOrbitParticles(container, color, radius);

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
    this.scene.tweens.add({ targets: container, scale: 1, duration: SPAWN_TWEEN_MS, ease: "Back.Out" });
  }

  private spawnPulseRings(
    container: Phaser.GameObjects.Container,
    color: number,
    radius: number,
  ): { pulseRings: Phaser.GameObjects.Graphics[]; pulseTweens: Phaser.Tweens.Tween[] } {
    const pulseRings: Phaser.GameObjects.Graphics[] = [];
    const pulseTweens: Phaser.Tweens.Tween[] = [];
    for (let index = 0; index < 2; index++) {
      const ring = this.scene.add.graphics();
      ring.lineStyle(2, color, 0.65);
      ring.strokeCircle(0, 0, radius * 0.9);
      ring.setAlpha(0).setScale(1);
      container.add(ring);
      pulseRings.push(ring);
      pulseTweens.push(this.scene.tweens.add({
        targets: ring,
        scaleX: 2.4, scaleY: 2.4,
        alpha: { from: 0.65, to: 0 },
        duration: PULSE_DURATION,
        delay: index * (PULSE_DURATION / 2),
        repeat: -1,
        ease: "Sine.Out",
      }));
    }
    return { pulseRings, pulseTweens };
  }

  private spawnOrbitParticles(
    container: Phaser.GameObjects.Container,
    color: number,
    radius: number,
  ): Phaser.GameObjects.Graphics[] {
    const orbitR = radius * PARTICLE_ORBIT_FACTOR;
    const particles: Phaser.GameObjects.Graphics[] = [];
    for (let index = 0; index < PARTICLE_COUNT; index++) {
      const particle = this.scene.add.graphics();
      const particleRadius = index % 2 === 0 ? 3.5 : 2.5;
      particle.fillStyle(color, 0.9);
      particle.fillCircle(0, 0, particleRadius);
      particle.fillStyle(0xffffff, 0.4);
      particle.fillCircle(-particleRadius * 0.3, -particleRadius * 0.3, particleRadius * 0.5);
      const angle = (index * Math.PI * 2) / PARTICLE_COUNT;
      particle.setPosition(Math.cos(angle) * orbitR, Math.sin(angle) * orbitR);
      container.add(particle);
      particles.push(particle);
    }
    return particles;
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
    triggerPop(this.scene, circle, onScore);
  }

  private expireAt(index: number, onScore: (scoreDelta: number) => void): void {
    const circle = this.circles[index];
    circle.active = false;
    this.circles.splice(index, 1);
    triggerExpire(this.scene, circle, onScore, this.drawCore.bind(this));
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
      circle.particles.forEach((particle, index) => {
        const angle = baseAngle + (index * Math.PI * 2) / PARTICLE_COUNT;
        particle.setPosition(Math.cos(angle) * orbitR, Math.sin(angle) * orbitR);
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
      circle.pulseTweens.forEach((tween) => tween.stop());
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
