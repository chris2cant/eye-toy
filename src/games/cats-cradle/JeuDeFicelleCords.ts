import { COLOR } from "../../design-system/tokens";
import type { ParticleSystem } from "./JeuDeFicelleParticles";

export type CordStyle = "neon" | "blueWeb" | "laser" | "arcade" | "dotted";

export const FINGER_PALETTE = ["#25f4e1", "#ff5c7a", "#ffd166", "#a78bfa", "#2fffaa"];

type Point = { x: number; y: number };

export interface DrawCordsSpec {
  t0: (Point | null)[];
  t1: (Point | null)[];
  distT: number;
  style: CordStyle;
}

interface CordSpec {
  from: Point;
  to: Point;
  distT: number;
  fromFingerIndex: number;
  toFingerIndex: number;
  linkIndex: number;
  style: CordStyle;
}

interface CordLayerSpec {
  from: Point;
  to: Point;
  color: string;
  lineWidth: number;
  pulse: number;
  resonanceT: number;
}

export interface CordRenderState {
  visualTime: number;
  lastResonanceAt: number;
  resonanceMs: number;
}

export function drawCords(ctx: CanvasRenderingContext2D, spec: DrawCordsSpec, state: CordRenderState, ps: ParticleSystem): void {
  const { t0, t1, distT, style } = spec;
  let linkIndex = 0;

  if (style === "blueWeb") {
    drawBlueWebCords(ctx, spec, state, ps);
    return;
  }

  for (let fi = 0; fi < 5; fi++) {
    const tipLeft = t0[fi];
    const tipRight = t1[fi];
    if (!tipLeft || !tipRight) continue;
    const color = getCordColor(style, { from: fi, to: fi }, linkIndex, state.visualTime);
    drawCord(ctx, { from: tipLeft, to: tipRight, distT, fromFingerIndex: fi, toFingerIndex: fi, linkIndex, style }, state);
    ps.pushTrail(tipLeft, tipRight, color, style);
    linkIndex++;
  }
}

function drawBlueWebCords(ctx: CanvasRenderingContext2D, spec: DrawCordsSpec, state: CordRenderState, ps: ParticleSystem): void {
  const { t0, t1, distT, style } = spec;
  let linkIndex = 0;
  for (let li = 0; li < 5; li++) {
    const tipLeft = t0[li];
    if (!tipLeft) continue;
    for (let ri = 0; ri < 5; ri++) {
      const tipRight = t1[ri];
      if (!tipRight) continue;
      const color = getCordColor(style, { from: li, to: ri }, linkIndex, state.visualTime);
      drawCord(ctx, { from: tipLeft, to: tipRight, distT, fromFingerIndex: li, toFingerIndex: ri, linkIndex, style }, state);
      ps.pushTrail(tipLeft, tipRight, color, style);
      linkIndex++;
    }
  }
}

function drawCord(ctx: CanvasRenderingContext2D, spec: CordSpec, state: CordRenderState): void {
  const { from, to, distT, fromFingerIndex, toFingerIndex, linkIndex, style } = spec;
  const { visualTime, lastResonanceAt, resonanceMs } = state;
  const color = getCordColor(style, { from: fromFingerIndex, to: toFingerIndex }, linkIndex, visualTime);
  const pulse = 0.5 + Math.sin(visualTime * 0.008 + linkIndex * 0.53 + fromFingerIndex * 1.7) * 0.5;
  const resonanceT = Math.max(0, 1 - (visualTime - lastResonanceAt) / resonanceMs);
  const lineWidth = getCordLineWidth(style, distT, pulse, resonanceT);

  ctx.save();
  ctx.lineCap = "round";
  if (style === "dotted") ctx.setLineDash([7, 11]);
  strokeCordLayers(ctx, style, { from, to, color, lineWidth, pulse, resonanceT });
  if (style === "dotted") ctx.setLineDash([]);
  ctx.restore();
}

function strokeCordLayers(ctx: CanvasRenderingContext2D, style: CordStyle, spec: CordLayerSpec): void {
  const { from, to, color, lineWidth, pulse, resonanceT } = spec;
  const isBlueWeb = style === "blueWeb";
  const strokeLine = () => {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  ctx.shadowColor = color;
  ctx.shadowBlur = getCordGlow(style, pulse, resonanceT);
  ctx.strokeStyle = color;
  ctx.globalAlpha = isBlueWeb ? 0.16 + resonanceT * 0.1 : 0.34 + resonanceT * 0.16;
  ctx.lineWidth = lineWidth * (isBlueWeb ? 2.2 : 3.5);
  strokeLine();

  ctx.shadowBlur = isBlueWeb ? 6 + resonanceT * 6 : style === "laser" ? 4 : 12 + pulse * 8;
  ctx.lineWidth = lineWidth;
  ctx.globalAlpha = isBlueWeb ? 0.78 : 0.94;
  strokeLine();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = style === "arcade" ? "#ffe66d" : "#ffffff";
  ctx.globalAlpha = isBlueWeb ? 0.26 : 0.35 + pulse * 0.2;
  ctx.lineWidth = isBlueWeb ? 0.45 : style === "laser" ? 1 : 0.8;
  strokeLine();
}

export function getCordColor(style: CordStyle, fi: { from: number; to: number }, linkIndex: number, visualTime: number): string {
  if (style === "blueWeb") return linkIndex % 3 === 0 ? "#dffcff" : linkIndex % 2 === 0 ? COLOR.brandPrimary : COLOR.info;
  if (style === "laser") return linkIndex % 2 === 0 ? "#ffffff" : "#9ffcff";
  if (style === "arcade") {
    const hue = Math.round((visualTime * 0.08 + linkIndex * 36 + fi.from * 18) % 360);
    return `hsl(${hue}, 100%, 62%)`;
  }
  if (style === "dotted") return fi.from % 2 === 0 ? "#ffd166" : "#ff5c7a";
  return FINGER_PALETTE[(fi.from + fi.to) % FINGER_PALETTE.length];
}

function getCordLineWidth(style: CordStyle, distT: number, pulse: number, resonanceT: number): number {
  if (style === "blueWeb") return 0.45 + (1 - distT) * 0.22 + resonanceT * 0.18;
  if (style === "laser") return 0.9 + resonanceT * 0.35;
  if (style === "arcade") return 2.1 + pulse * 0.45 + resonanceT * 0.9;
  if (style === "dotted") return 1.8 + pulse * 0.2 + resonanceT * 0.45;
  return 1.4 + (1 - distT) * 0.9 + pulse * 0.25 + resonanceT * 0.6;
}

function getCordGlow(style: CordStyle, pulse: number, resonanceT: number): number {
  if (style === "blueWeb") return 12 + resonanceT * 18;
  if (style === "laser") return 10 + resonanceT * 16;
  if (style === "arcade") return 30 + pulse * 12 + resonanceT * 32;
  if (style === "dotted") return 24 + pulse * 10 + resonanceT * 22;
  return 26 + pulse * 8 + resonanceT * 24;
}
