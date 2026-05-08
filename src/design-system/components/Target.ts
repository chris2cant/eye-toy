import Phaser from "phaser";
import { HEX } from "../tokens";

export type TargetVariant = "pink" | "yellow" | "turquoise" | "purple";
export type TargetState = "idle" | "active" | "hit" | "missed";

export interface TargetConfig {
  variant?: TargetVariant;
  radius?: number;
}

const VARIANT_COLORS: Record<TargetVariant, number> = {
  pink:      HEX.punchyPink,
  yellow:    HEX.sunYellow,
  turquoise: HEX.turquoise,
  purple:    HEX.popPurple,
};

export interface TargetHandle {
  container: Phaser.GameObjects.Container;
  setState(state: TargetState): void;
  destroy(): void;
}

function drawTargetGraphic(
  gfx: Phaser.GameObjects.Graphics,
  state: TargetState,
  color: number,
  radius: number,
): void {
  gfx.clear();
  const col = state === "missed" ? HEX.textMuted : color;
  const alpha = state === "missed" ? 0.45 : 1;

  gfx.fillStyle(0x000000, 0.08);
  gfx.fillCircle(3, 5, radius);

  gfx.fillStyle(col, alpha);
  gfx.fillCircle(0, 0, radius);

  gfx.lineStyle(2, HEX.nightBlue, 0.18);
  gfx.strokeCircle(0, 0, radius);

  gfx.fillStyle(HEX.white, alpha);
  gfx.fillCircle(0, 0, radius * 0.68);

  gfx.fillStyle(col, alpha);
  gfx.fillCircle(0, 0, radius * 0.42);

  gfx.fillStyle(HEX.white, alpha);
  gfx.fillCircle(0, 0, radius * 0.14);
}

interface TargetStateContext {
  scene: Phaser.Scene;
  container: Phaser.GameObjects.Container;
  gfx: Phaser.GameObjects.Graphics;
  color: number;
  radius: number;
  pulseTween: Phaser.Tweens.Tween | null;
}

function applyTargetState(ctx: TargetStateContext, state: TargetState): Phaser.Tweens.Tween | null {
  if (ctx.pulseTween) {
    ctx.pulseTween.stop();
    ctx.container.setScale(1);
  }
  drawTargetGraphic(ctx.gfx, state, ctx.color, ctx.radius);

  if (state === "active") {
    return ctx.scene.tweens.add({
      targets: ctx.container,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }
  if (state === "hit") {
    ctx.scene.tweens.add({
      targets: ctx.container,
      scaleX: 1.4,
      scaleY: 1.4,
      alpha: 0,
      duration: 280,
      ease: "Cubic.easeOut",
      onComplete: () => ctx.container.destroy(),
    });
  }
  return null;
}

export function createTarget(
  scene: Phaser.Scene,
  x: number,
  y: number,
  config: TargetConfig = {},
): TargetHandle {
  const variant = config.variant ?? "pink";
  const radius = config.radius ?? 52;
  const color = VARIANT_COLORS[variant];
  const container = scene.add.container(x, y);
  const gfx = scene.add.graphics();
  container.add(gfx);

  let pulseTween: Phaser.Tweens.Tween | null = null;
  drawTargetGraphic(gfx, "idle", color, radius);

  return {
    container,
    setState(state: TargetState) {
      pulseTween = applyTargetState({ scene, container, gfx, color, radius, pulseTween }, state);
    },
    destroy() {
      pulseTween?.stop();
      container.destroy();
    },
  };
}
