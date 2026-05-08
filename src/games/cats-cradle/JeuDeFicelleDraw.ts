import { COLOR } from "../../design-system/tokens";
import { FINGER_PALETTE } from "./JeuDeFicelleCords";
import type { CordStyle } from "./JeuDeFicelleCords";
import type { Particle, TrailSegment } from "./JeuDeFicelleParticles";

export const RESONANCE_MS = 520;
export const SMOOTH_BASE_SPEED = 18;
export const SMOOTH_FAST_SPEED = 42;

type Point = { x: number; y: number };

export function createAtmosphereCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const cx = width / 2;
  const cy = height / 2;
  const glow = ctx.createRadialGradient(cx, cy, height * 0.08, cx, cy, Math.max(width, height) * 0.72);
  glow.addColorStop(0, "rgba(37, 244, 225, 0.09)");
  glow.addColorStop(0.45, "rgba(5, 12, 32, 0.34)");
  glow.addColorStop(1, "rgba(0, 4, 16, 0.68)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = "#25f4e1";
  ctx.lineWidth = 1;
  for (let x = width * 0.08; x < width; x += 72) {
    ctx.beginPath();
    ctx.moveTo(x, height * 0.18);
    ctx.lineTo(x - width * 0.08, height);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.03;
  ctx.fillStyle = "#000";
  for (let scanY = 0; scanY < height; scanY += 4) ctx.fillRect(0, scanY, width, 1);
  ctx.restore();

  return canvas;
}

export function drawResonanceWash(ctx: CanvasRenderingContext2D, size: { width: number; height: number }, visualTime: number, lastResonanceAt: number): void {
  const { width, height } = size;
  const resonanceT = Math.max(0, 1 - (visualTime - lastResonanceAt) / RESONANCE_MS);
  if (resonanceT <= 0) return;
  const cx = width / 2;
  const cy = height / 2;
  const glow = ctx.createRadialGradient(cx, cy, height * 0.05, cx, cy, Math.max(width, height) * 0.62);
  glow.addColorStop(0, `rgba(255, 255, 255, ${0.03 * resonanceT})`);
  glow.addColorStop(0.42, `rgba(37, 244, 225, ${0.12 * resonanceT})`);
  glow.addColorStop(1, "rgba(37, 244, 225, 0)");
  ctx.save();
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

export function drawFingertipDots(ctx: CanvasRenderingContext2D, smoothTips: (Point | null)[][], style: CordStyle): void {
  const isBlueWeb = style === "blueWeb";
  for (let hi = 0; hi < 4; hi++) {
    for (let fi = 0; fi < 5; fi++) {
      const tip = smoothTips[hi][fi];
      if (tip) drawSingleFingertipDot(ctx, tip, fi, isBlueWeb);
    }
  }
}

function drawSingleFingertipDot(ctx: CanvasRenderingContext2D, tip: Point, fi: number, isBlueWeb: boolean): void {
  const color = isBlueWeb ? (fi % 2 === 0 ? COLOR.brandPrimary : COLOR.info) : FINGER_PALETTE[fi];
  const outerRadius = isBlueWeb ? 18 : 14;
  const coreRadius = isBlueWeb ? 5.8 : 4.8;

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = isBlueWeb ? 34 : 24;
  ctx.fillStyle = color;

  ctx.globalAlpha = isBlueWeb ? 0.18 : 0.14;
  ctx.beginPath(); ctx.arc(tip.x, tip.y, outerRadius, 0, Math.PI * 2); ctx.fill();

  ctx.globalAlpha = isBlueWeb ? 0.55 : 0.42;
  ctx.beginPath(); ctx.arc(tip.x, tip.y, outerRadius * 0.48, 0, Math.PI * 2); ctx.fill();

  ctx.globalAlpha = 0.95;
  ctx.shadowBlur = isBlueWeb ? 18 : 14;
  ctx.fillStyle = isBlueWeb ? "#e9ffff" : color;
  ctx.beginPath(); ctx.arc(tip.x, tip.y, coreRadius, 0, Math.PI * 2); ctx.fill();

  ctx.globalAlpha = 0.72;
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(tip.x, tip.y, Math.max(2.2, coreRadius * 0.42), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawTrailLayer(ctx: CanvasRenderingContext2D, trails: TrailSegment[]): void {
  for (let i = trails.length - 1; i >= 0; i--) {
    const trail = trails[i];
    const alpha = trail.life / trail.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha * 0.18;
    ctx.shadowColor = trail.color;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = trail.color;
    ctx.lineWidth = 0.6 + alpha * 0.9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(trail.from.x, trail.from.y);
    ctx.lineTo(trail.to.x, trail.to.y);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawParticleLayer(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const particle of particles) {
    const alpha = particle.life / particle.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function updateSmoothedTips(smoothTips: (Point | null)[][], targetTips: (Point | null)[][], delta: number): void {
  const dt = Math.min(delta, 50) / 1000;
  for (let hi = 0; hi < 4; hi++) {
    for (let fi = 0; fi < 5; fi++) {
      const target = targetTips[hi][fi];
      if (!target) { smoothTips[hi][fi] = null; continue; }
      const prev = smoothTips[hi][fi];
      if (!prev) { smoothTips[hi][fi] = { ...target }; continue; }
      const dist = Math.hypot(target.x - prev.x, target.y - prev.y);
      const speed = dist > 44 ? SMOOTH_FAST_SPEED : SMOOTH_BASE_SPEED;
      const alpha = 1 - Math.exp(-speed * dt);
      prev.x += (target.x - prev.x) * alpha;
      prev.y += (target.y - prev.y) * alpha;
    }
  }
}

export function areFingertipsTouching(t0: (Point | null)[], t1: (Point | null)[]): { touching: boolean; touchPoint: Point | null } {
  for (let fi = 0; fi < 5; fi++) {
    const tipLeft = t0[fi];
    const tipRight = t1[fi];
    if (tipLeft && tipRight && Math.hypot(tipLeft.x - tipRight.x, tipLeft.y - tipRight.y) < 30) {
      return { touching: true, touchPoint: { x: (tipLeft.x + tipRight.x) / 2, y: (tipLeft.y + tipRight.y) / 2 } };
    }
  }
  return { touching: false, touchPoint: null };
}
