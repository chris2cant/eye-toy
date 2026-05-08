import Phaser from "phaser";
import { COLOR, HEX, FONT, DEPTH } from "../../design-system/tokens";
import { DwellButton } from "../../design-system/DwellButton";
import type { HandLandmark } from "../../camera/HandTracker";

type Point = { x: number; y: number };
const SMOOTHING = 0.62;

export function mapLandmark(
  hand: HandLandmark[],
  landmarkIndex: number,
  mapper: (lmX: number, lmY: number) => Point,
): Point | null {
  const lm = hand[landmarkIndex];
  if (!lm || lm.x < 0 || lm.x > 1 || lm.y < 0 || lm.y > 1) return null;
  return mapper(lm.x, lm.y);
}

export function getPinchDrawPosition(hand: HandLandmark[], thumbTip: number, indexTip: number, mapper: (lmX: number, lmY: number) => Point): Point {
  const thumb = hand[thumbTip];
  const index = hand[indexTip];
  return mapper((thumb.x + index.x) / 2, (thumb.y + index.y) / 2);
}

export function smoothPoint(previous: Point | null, next: Point): Point {
  if (!previous) return next;
  return { x: previous.x * SMOOTHING + next.x * (1 - SMOOTHING), y: previous.y * SMOOTHING + next.y * (1 - SMOOTHING) };
}

export type Tool = "brush" | "eraser";
export type PaintColor = { label: string; color: string; hex: number };

export const PALETTE: PaintColor[] = [
  { label: "NOIR",   color: "#111827", hex: 0x111827 },
  { label: "BLANC",  color: "#F8FAFC", hex: 0xf8fafc },
  { label: "ROUGE",  color: "#FF3B5C", hex: 0xff3b5c },
  { label: "JAUNE",  color: "#FFD166", hex: HEX.warning },
  { label: "BLEU",   color: "#36A3FF", hex: 0x36a3ff },
  { label: "VERT",   color: "#2FFFAA", hex: HEX.success },
  { label: "VIOLET", color: "#A78BFA", hex: 0xa78bfa },
];

export interface ToolHudState { activeTool: Tool; activeColor: PaintColor; }
export interface ToolHudContext { gfx: Phaser.GameObjects.Graphics; scene: Phaser.Scene; width: number; height: number; toolButtons: Phaser.GameObjects.GameObject[]; }

export function redrawToolHud(ctx: ToolHudContext, state: ToolHudState): void {
  const { gfx, scene, width, height, toolButtons } = ctx;
  gfx.clear();
  const hexColor = state.activeTool === "eraser" ? HEX.textPrimary : state.activeColor.hex;
  gfx.lineStyle(2, hexColor, 0.95);
  gfx.strokeRect(width / 2 - 92, height * 0.135, 184, 34);
  gfx.fillStyle(HEX.bgElevated, 0.72);
  gfx.fillRect(width / 2 - 92, height * 0.135, 184, 34);
  gfx.fillStyle(hexColor, 1);
  gfx.fillCircle(width / 2 - 68, height * 0.135 + 17, state.activeTool === "eraser" ? 10 : 8);
  addActiveLabel(scene, state.activeTool === "eraser" ? "GOMME" : state.activeColor.label, width / 2 - 46, height * 0.135 + 17);
  drawPaletteIndicators(gfx, state, height, toolButtons);
  drawEraserIndicator(gfx, state, height, toolButtons);
}

function addActiveLabel(scene: Phaser.Scene, label: string, x: number, y: number): void {
  const existing = scene.children.getByName("paint-active-label");
  if (existing) existing.destroy();
  scene.add.text(x, y, label, { fontSize: "15px", fontFamily: FONT.ui, fontStyle: "700", color: COLOR.textPrimary })
    .setName("paint-active-label").setOrigin(0, 0.5).setDepth(DEPTH.hud);
}

function drawPaletteIndicators(gfx: Phaser.GameObjects.Graphics, state: ToolHudState, height: number, toolButtons: Phaser.GameObjects.GameObject[]): void {
  const paletteY = height * 0.25;
  PALETTE.forEach((color, index) => {
    const btn = toolButtons[index] as DwellButton;
    if (!btn) return;
    gfx.fillStyle(color.hex, 1);
    gfx.fillRect(btn.x - 17, paletteY + 31, 34, 8);
    if (state.activeTool === "brush" && color === state.activeColor) {
      gfx.lineStyle(2, color.hex, 1);
      gfx.strokeRect(btn.x - 23, paletteY + 25, 46, 20);
    }
  });
}

function drawEraserIndicator(gfx: Phaser.GameObjects.Graphics, state: ToolHudState, height: number, toolButtons: Phaser.GameObjects.GameObject[]): void {
  const eraserBtn = toolButtons[PALETTE.length] as DwellButton;
  if (!eraserBtn) return;
  const paletteY = height * 0.25;
  gfx.lineStyle(2, HEX.textPrimary, state.activeTool === "eraser" ? 1 : 0.38);
  gfx.strokeRect(eraserBtn.x - 24, paletteY + 25, 48, 20);
  gfx.lineStyle(3, HEX.danger, 0.9);
  gfx.beginPath();
  gfx.moveTo(eraserBtn.x - 13, paletteY + 38); gfx.lineTo(eraserBtn.x + 13, paletteY + 28);
  gfx.strokePath();
}

export interface CursorSpec { positions: ({ x: number; y: number } | null)[]; drawingHands: Set<number>; tool: Tool; color: PaintColor; brushSize: number; eraserSize: number; }

export function drawHandCursors(gfx: Phaser.GameObjects.Graphics, spec: CursorSpec): void {
  gfx.clear();
  spec.positions.forEach((pos, i) => {
    if (!pos) return;
    const drawing = spec.drawingHands.has(i);
    const color = spec.tool === "eraser" ? HEX.textPrimary : spec.color.hex;
    const radius = spec.tool === "eraser" ? spec.eraserSize / 2 : spec.brushSize / 2;
    gfx.lineStyle(drawing ? 4 : 2, color, drawing ? 1 : 0.72);
    gfx.strokeCircle(pos.x, pos.y, drawing ? radius + 5 : radius + 2);
    gfx.fillStyle(color, drawing ? 0.42 : 0.18);
    gfx.fillCircle(pos.x, pos.y, Math.max(5, radius * 0.45));
    if (!drawing) {
      gfx.lineStyle(1, color, 0.45);
      gfx.beginPath();
      gfx.moveTo(pos.x - radius, pos.y); gfx.lineTo(pos.x + radius, pos.y);
      gfx.moveTo(pos.x, pos.y - radius); gfx.lineTo(pos.x, pos.y + radius);
      gfx.strokePath();
    }
  });
}

export interface PaletteOpts { scene: Phaser.Scene; width: number; height: number; }
export type OnToolChange = (tool: Tool, color: PaintColor | null) => void;

export function buildPaletteButtons(opts: PaletteOpts, onToolChange: OnToolChange): DwellButton[] {
  const { scene, width, height } = opts;
  const tools = [
    ...PALETTE.map((color) => ({ label: color.label, color, tool: "brush" as const })),
    { label: "GOMME", color: null as PaintColor | null, tool: "eraser" as const },
  ];
  const paletteY = height * 0.25;
  const spacing = Math.min(118, Math.max(76, (width - 192) / Math.max(1, tools.length - 1)));
  const startX = width / 2 - ((tools.length - 1) * spacing) / 2;
  return tools.map((entry, index) => {
    const btn = new DwellButton(scene, startX + index * spacing, paletteY, {
      label: entry.label, fontSize: "14px",
      onActivate: () => { onToolChange(entry.tool, entry.color); btn.reset(); },
      depth: DEPTH.hud, dwellMs: 850, zonePad: 42,
    });
    return btn;
  });
}

export interface StrokeContext { positions: ({ x: number; y: number } | null)[]; last: ({ x: number; y: number } | null)[]; drawing: Set<number>; tool: Tool; color: PaintColor; brushSize: number; eraserSize: number; }

export function applyActiveStrokes(tex: Phaser.Textures.CanvasTexture, ctx: StrokeContext): ({ x: number; y: number } | null)[] {
  const canvas = tex.getContext();
  if (!canvas) return ctx.last;
  const last = [...ctx.last];
  let changed = false;
  for (let i = 0; i < 2; i++) {
    const current = ctx.positions[i];
    if (!current || !ctx.drawing.has(i)) { last[i] = null; continue; }
    const previous = last[i] ?? current;
    canvas.save();
    canvas.lineCap = "round"; canvas.lineJoin = "round";
    canvas.lineWidth = ctx.tool === "eraser" ? ctx.eraserSize : ctx.brushSize;
    canvas.globalCompositeOperation = ctx.tool === "eraser" ? "destination-out" : "source-over";
    canvas.strokeStyle = ctx.color.color;
    canvas.beginPath(); canvas.moveTo(previous.x, previous.y); canvas.lineTo(current.x, current.y); canvas.stroke();
    canvas.restore();
    last[i] = { ...current };
    changed = true;
  }
  if (changed) tex.refresh();
  return last;
}
