import { HEX } from "../../design-system/tokens";
import type { NinjaState, NinjaVariant } from "./Ninja";

export function drawNinjaBody(
  graphics: Phaser.GameObjects.Graphics,
  state: { variant: NinjaVariant; animTime: number; waitRemaining: number; waitTotal: number; ninjaState: NinjaState },
): void {
  graphics.clear();
  drawBodyLower(graphics, state.variant, state.animTime);
  drawBodyUpper(graphics, state.variant, state.animTime);
  drawHead(graphics, state.variant);
  drawWaitBar(graphics, state.ninjaState, state.waitRemaining, state.waitTotal);
}

function drawBodyLower(graphics: Phaser.GameObjects.Graphics, variant: NinjaVariant, animTime: number): void {
  const isGold = variant === "powerup";
  const legSwing = Math.sin(animTime * 0.012) * 7;
  const glowHex = isGold ? HEX.warning : HEX.danger;
  graphics.fillStyle(glowHex, 0.10);
  graphics.fillCircle(0, -10, 68);
  graphics.fillStyle(0x000000, 0.4);
  graphics.fillEllipse(0, 64, 52, 12);
  const legColor = isGold ? HEX.warning : 0x1a1a2e;
  graphics.fillStyle(0xffffff, 0.22);
  graphics.fillRect(-20, 22 + legSwing, 15, 32);
  graphics.fillStyle(legColor, 1);
  graphics.fillRect(-19, 23 + legSwing, 13, 30);
  graphics.fillStyle(0xffffff, 0.22);
  graphics.fillRect(6, 22 - legSwing, 15, 32);
  graphics.fillStyle(legColor, 1);
  graphics.fillRect(7, 23 - legSwing, 13, 30);
  graphics.fillStyle(0x111111, 1);
  graphics.fillRect(-21, 50 + legSwing, 15, 10);
  graphics.fillRect(7, 50 - legSwing, 15, 10);
  graphics.fillTriangle(-21, 60 + legSwing, -6, 60 + legSwing, -24, 67 + legSwing);
  graphics.fillTriangle(7, 60 - legSwing, 22, 60 - legSwing, 25, 67 - legSwing);
}

function drawBodyUpper(graphics: Phaser.GameObjects.Graphics, variant: NinjaVariant, animTime: number): void {
  const isGold = variant === "powerup";
  const bodyColor = isGold ? HEX.warning : HEX.danger;
  graphics.fillStyle(0xffffff, 0.28);
  graphics.fillRect(-22, -25, 44, 50);
  graphics.fillStyle(bodyColor, 1);
  graphics.fillRect(-21, -24, 42, 48);
  graphics.fillStyle(0x000000, 0.18);
  graphics.fillRect(-4, -24, 8, 48);
  graphics.fillStyle(0x111111, 1);
  graphics.fillRect(-21, -4, 42, 10);
  graphics.fillStyle(0xffffff, 0.7);
  graphics.fillRect(-5, -2, 10, 7);
  graphics.fillStyle(bodyColor, 1);
  graphics.fillRect(-3, 0, 6, 3);
  graphics.fillStyle(0xffffff, 0.2);
  graphics.fillRect(-31, -22, 13, 24);
  graphics.fillStyle(bodyColor, 1);
  graphics.fillRect(-30, -21, 11, 22);
  graphics.fillStyle(0xffffff, 0.2);
  graphics.fillRect(19, -25, 13, 24);
  graphics.fillStyle(bodyColor, 1);
  graphics.fillRect(20, -24, 11, 22);
  graphics.fillStyle(0xddaa77, 1);
  graphics.fillCircle(-25, 3, 8);
  graphics.fillCircle(26, -4, 8);
  drawShuriken(graphics, { x: 14, y: 0 }, { radius: 9, color: isGold ? HEX.warning : 0xcccccc }, animTime);
}

function drawHead(graphics: Phaser.GameObjects.Graphics, variant: NinjaVariant): void {
  const isGold = variant === "powerup";
  graphics.fillStyle(0xffffff, 0.28);
  graphics.fillCircle(0, -44, 21);
  const headColor = isGold ? HEX.warning : 0x1a1a2e;
  graphics.fillStyle(headColor, 1);
  graphics.fillCircle(0, -44, 19);
  const eyeColor = isGold ? 0xffff44 : HEX.brandPrimary;
  graphics.fillStyle(eyeColor, 0.25);
  graphics.fillRect(-16, -52, 16, 12);
  graphics.fillRect(1, -52, 16, 12);
  graphics.fillStyle(eyeColor, 1);
  graphics.fillRect(-15, -50, 12, 5);
  graphics.fillRect(3, -50, 12, 5);
  const bandColor = isGold ? 0x8B4513 : HEX.brandPrimary;
  graphics.fillStyle(bandColor, 1);
  graphics.fillRect(-21, -55, 42, 11);
  graphics.fillStyle(0xffffff, 0.85);
  graphics.fillCircle(0, -49, 4);
  graphics.fillStyle(isGold ? HEX.warning : HEX.danger, 1);
  graphics.fillCircle(0, -49, 2);
  graphics.fillStyle(bandColor, 0.75);
  graphics.fillTriangle(-21, -55, -21, -44, -34, -49);
}

function drawWaitBar(graphics: Phaser.GameObjects.Graphics, state: NinjaState, waitRemaining: number, waitTotal: number): void {
  if (state !== "waiting" && state !== "spawning") return;
  const ratio = Math.max(0, waitRemaining / waitTotal);
  const barHalfW = 22;
  const barHeight = 5;
  const barY = -83;
  const fillHalf = barHalfW * ratio;
  graphics.fillStyle(0x000000, 0.6);
  graphics.fillRect(-barHalfW - 1, barY - 1, (barHalfW + 1) * 2, barHeight + 2);
  const barColor = ratio > 0.55 ? 0x44dd44 : ratio > 0.28 ? HEX.warning : HEX.danger;
  graphics.fillStyle(barColor, 0.92);
  graphics.fillRect(-fillHalf, barY, fillHalf * 2, barHeight);
}

function drawShuriken(
  graphics: Phaser.GameObjects.Graphics,
  center: { x: number; y: number },
  config: { radius: number; color: number },
  animTime: number,
): void {
  const { x: cx, y: cy } = center;
  const { radius: shurikenRadius, color } = config;
  const rot = animTime * 0.003;
  graphics.fillStyle(color, 0.95);
  for (let index = 0; index < 4; index++) {
    const angle = rot + (index * Math.PI) / 2;
    const x1 = cx + Math.cos(angle) * shurikenRadius;
    const y1 = cy + Math.sin(angle) * shurikenRadius;
    const x2 = cx + Math.cos(angle + Math.PI / 4) * shurikenRadius * 0.4;
    const y2 = cy + Math.sin(angle + Math.PI / 4) * shurikenRadius * 0.4;
    const x3 = cx + Math.cos(angle + Math.PI / 2) * shurikenRadius;
    const y3 = cy + Math.sin(angle + Math.PI / 2) * shurikenRadius;
    graphics.fillTriangle(cx, cy, x1, y1, x2, y2);
    graphics.fillTriangle(cx, cy, x2, y2, x3, y3);
  }
  graphics.fillStyle(0x333333, 1);
  graphics.fillCircle(cx, cy, shurikenRadius * 0.28);
}

export function drawNinjaAura(auraGfx: Phaser.GameObjects.Graphics, hitboxRadius: number): void {
  auraGfx.clear();
  auraGfx.lineStyle(4, HEX.warning, 0.7);
  auraGfx.strokeCircle(0, 0, hitboxRadius - 5);
  auraGfx.lineStyle(2, HEX.warning, 0.25);
  auraGfx.strokeCircle(0, 0, hitboxRadius + 8);
}
