import Phaser from "phaser";
import { HEX, DEPTH } from "../../design-system/tokens";
import { drawNinjaAura, drawNinjaBody } from "./NinjaRender";
import { spawnNinjaDeathFlash, spawnNinjaDeathParticles } from "./NinjaEffects";

export type NinjaVariant = "normal" | "powerup";
export type NinjaState   = "spawning" | "waiting" | "jumping" | "hit" | "dying";
export type NinjaSide    = "left" | "right";

export interface NinjaConfig {
  variant: NinjaVariant;
  pointValue: number;
  side: NinjaSide;
  stageIdx: 0 | 1;
  waitMs: number;
  jumpTargetX: number;
  jumpTargetY: number;
  jumpDurationMs: number;
  jumpArcHeight: number;
}

const HITBOX_RADIUS = 52;
const HIT_COOLDOWN_MS = 250;
const SPAWN_DURATION_MS = 380;
const PRE_JUMP_WARN_MS = 550;
const REDRAW_INTERVAL_MS = 50;

export class Ninja extends Phaser.GameObjects.Container {
  readonly variant: NinjaVariant;
  readonly pointValue: number;
  readonly side: NinjaSide;
  readonly stageIdx: 0 | 1;
  sniperHit = false;
  state: NinjaState = "spawning";
  lastHitAt = 0;

  private readonly scaleSign: 1 | -1;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private auraGfx?: Phaser.GameObjects.Graphics;
  private animTime = 0;
  private lastRedrawAt = 0;

  private spawnProgress = 0;
  private waitRemaining: number;
  private readonly waitTotal: number;
  private jumpProgress = 0;
  private readonly jumpStartX: number;
  private readonly jumpStartY: number;
  private readonly jumpTargetX: number;
  private readonly jumpTargetY: number;
  private readonly jumpDurationMs: number;
  private readonly jumpArcHeight: number;

  constructor(scene: Phaser.Scene, x: number, y: number, config: NinjaConfig) {
    super(scene, x, y);
    this.variant    = config.variant;
    this.pointValue = config.pointValue;
    this.side       = config.side;
    this.stageIdx   = config.stageIdx;
    this.scaleSign  = config.side === "right" ? -1 : 1;

    this.waitRemaining  = config.waitMs;
    this.waitTotal      = config.waitMs;
    this.jumpStartX     = x;
    this.jumpStartY     = y;
    this.jumpTargetX    = config.jumpTargetX;
    this.jumpTargetY    = config.jumpTargetY;
    this.jumpDurationMs = config.jumpDurationMs;
    this.jumpArcHeight  = config.jumpArcHeight;

    this.gfx = scene.add.graphics();
    this.add(this.gfx);
    this.setupAura(scene, config.variant);
    this.drawBody();
    this.setDepth(DEPTH.game);
    this.setScale(0, 0);
    this.setAlpha(0);
    this.startIdleTween(scene);
    scene.add.existing(this);
  }

  private setupAura(scene: Phaser.Scene, variant: NinjaVariant): void {
    if (variant !== "powerup") return;
    this.auraGfx = scene.add.graphics();
    this.add(this.auraGfx);
    drawNinjaAura(this.auraGfx, HITBOX_RADIUS);
    scene.tweens.add({
      targets: this.auraGfx,
      alpha: { from: 0.2, to: 0.9 },
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
  }

  private startIdleTween(scene: Phaser.Scene): void {
    scene.tweens.add({
      targets: this.gfx,
      y: { from: -4, to: 4 },
      duration: 380,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
  }

  advance(delta: number): void {
    if (this.state === "spawning") { this.advanceSpawning(delta); return; }
    if (this.state === "waiting")  { this.advanceWaiting(delta);  return; }
    if (this.state === "jumping")  { this.advanceJumping(delta); }
  }

  private advanceSpawning(delta: number): void {
    this.spawnProgress = Math.min(1, this.spawnProgress + delta / SPAWN_DURATION_MS);
    const spawnT = this.spawnProgress;
    const scaleValue = this.easeBackOut(spawnT);
    this.setScale(this.scaleSign * scaleValue, scaleValue);
    this.setAlpha(Math.min(1, spawnT * 2.5));
    if (spawnT >= 1) {
      this.setScale(this.scaleSign, 1);
      this.setAlpha(1);
      this.state = "waiting";
    }
    this.tickAnim(delta);
  }

  private advanceWaiting(delta: number): void {
    this.waitRemaining -= delta;
    if (this.waitRemaining < PRE_JUMP_WARN_MS) {
      const blink = Math.sin(this.waitRemaining * 0.028) > 0;
      this.setAlpha(blink ? 1 : 0.4);
    }
    if (this.waitRemaining <= 0) {
      this.setAlpha(1);
      this.state = "jumping";
      this.jumpProgress = 0;
    }
    this.tickAnim(delta);
  }

  private advanceJumping(delta: number): void {
    this.jumpProgress = Math.min(1, this.jumpProgress + delta / this.jumpDurationMs);
    const jumpT = this.jumpProgress;
    const ease = jumpT < 0.5 ? 4 * jumpT * jumpT * jumpT : 1 - (-2 * jumpT + 2) ** 3 / 2;
    this.x = this.jumpStartX + (this.jumpTargetX - this.jumpStartX) * ease;
    const arc = Math.sin(jumpT * Math.PI) * this.jumpArcHeight;
    this.y = this.jumpStartY + (this.jumpTargetY - this.jumpStartY) * ease - arc;
    this.tickAnim(delta);
  }

  private tickAnim(delta: number): void {
    this.animTime += delta;
    this.lastRedrawAt += delta;
    if (this.lastRedrawAt >= REDRAW_INTERVAL_MS) {
      this.lastRedrawAt = 0;
      this.drawBody();
    }
  }

  getHitBox(): { x: number; y: number; radius: number } {
    return { x: this.x, y: this.y, radius: HITBOX_RADIUS };
  }

  hasReachedCenter(): boolean {
    return this.state === "jumping" && this.jumpProgress >= 1;
  }

  receiveHit(): boolean {
    if (this.state !== "waiting" && this.state !== "jumping") return false;
    const now = performance.now();
    if (now - this.lastHitAt < HIT_COOLDOWN_MS) return false;
    this.lastHitAt = now;
    this.sniperHit = this.state === "waiting";
    this.state = "hit";
    this.die();
    return true;
  }

  private easeBackOut(progress: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);
  }

  private drawBody(): void {
    drawNinjaBody(this.gfx, {
      variant: this.variant,
      animTime: this.animTime,
      waitRemaining: this.waitRemaining,
      waitTotal: this.waitTotal,
      ninjaState: this.state,
    });
  }

  private die(): void {
    this.state = "dying";
    const burstColor = this.variant === "powerup" ? HEX.warning : HEX.danger;
    spawnNinjaDeathParticles(this.scene, { x: this.x, y: this.y }, burstColor);
    spawnNinjaDeathFlash(this.scene, this);
    this.scene.tweens.add({
      targets: this,
      scaleY: 0,
      alpha: 0,
      duration: 260,
      ease: "Power2.In",
      onComplete: () => this.destroy(),
    });
  }
}
