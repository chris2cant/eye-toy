import Phaser from "phaser";
import { COLOR, HEX, FONT, DEPTH } from "../../design-system/tokens";
import { createPaintColor } from "../../design-system/components/PaintColor";
import type { PaintColorHandle } from "../../design-system/components/PaintColor";
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
export type PaintColor = { label: string; color: string; hex: number; dynamic?: "rainbow" };
export type PaintToolButton = { button: PaintColorHandle; tool: Tool; color: PaintColor | null };

export const PALETTE: PaintColor[] = [
  { label: "NOIR",   color: "#111827", hex: 0x111827 },
  { label: "BLANC",  color: "#F8FAFC", hex: 0xf8fafc },
  { label: "ROUGE",  color: "#FF3B5C", hex: 0xff3b5c },
  { label: "JAUNE",  color: "#FFD166", hex: HEX.warning },
  { label: "BLEU",   color: "#36A3FF", hex: 0x36a3ff },
  { label: "VERT",   color: "#2FFFAA", hex: HEX.success },
  { label: "VIOLET", color: "#A78BFA", hex: 0xa78bfa },
  { label: "MULTI",  color: "#FF3B5C", hex: 0xff3b5c, dynamic: "rainbow" },
];

export interface ToolHudState { activeTool: Tool; activeColor: PaintColor; brushSize: number; }
export interface ToolHudContext { gfx: Phaser.GameObjects.Graphics; scene: Phaser.Scene; width: number; height: number; toolButtons: PaintToolButton[]; }

export function redrawToolHud(ctx: ToolHudContext, state: ToolHudState): void {
  const { gfx, scene, width, height, toolButtons } = ctx;
  gfx.clear();
  syncPaletteState(toolButtons, state);
  const chipX = width / 2;
  const chipY = height * 0.11;
  const chipColor = state.activeTool === "eraser" ? HEX.textPrimary : state.activeColor.hex;
  gfx.fillStyle(HEX.white, 0.94);
  gfx.fillRoundedRect(chipX - 108, chipY - 18, 216, 36, 18);
  gfx.lineStyle(2, HEX.bgElevated, 0.9);
  gfx.strokeRoundedRect(chipX - 108, chipY - 18, 216, 36, 18);
  gfx.fillStyle(chipColor, 1);
  gfx.fillCircle(chipX - 72, chipY, state.activeTool === "eraser" ? 10 : 9);
  addActiveLabel(scene, getActiveLabel(state), chipX - 50, chipY);
}

function getActiveLabel(state: ToolHudState): string {
  if (state.activeTool === "eraser") return "Gomme active";
  if (state.activeColor.dynamic === "rainbow") return `Multicolore • ${state.brushSize}px`;
  return `Couleur active • ${state.brushSize}px`;
}

function addActiveLabel(scene: Phaser.Scene, label: string, x: number, y: number): void {
  const existing = scene.children.getByName("paint-active-label");
  if (existing) existing.destroy();
  scene.add.text(x, y, label, { fontSize: "15px", fontFamily: FONT.ui, fontStyle: "700", color: COLOR.textPrimary })
    .setName("paint-active-label").setOrigin(0, 0.5).setDepth(DEPTH.hud);
}

function syncPaletteState(toolButtons: PaintToolButton[], state: ToolHudState): void {
  toolButtons.forEach(({ button, tool, color }) => {
    const isBrushActive = tool === "brush" && state.activeTool === "brush" && color === state.activeColor;
    button.setActive(isBrushActive || (tool === "eraser" && state.activeTool === "eraser"));
  });
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

export function buildPaletteButtons(opts: PaletteOpts, onToolChange: OnToolChange): PaintToolButton[] {
  const { scene, width, height } = opts;
  const layout = getPaletteLayout(width, height);
  const paletteButtons = [...PALETTE.map((color) => ({ tool: "brush" as const, color })), { tool: "eraser" as const, color: null as PaintColor | null }];
  const buttons: PaintToolButton[] = [];
  paletteButtons.forEach((entry, index) => {
    const x = layout.startX + index * layout.spacing;
    const y = layout.startY;
    buttons.push(createToolButton({
      scene,
      x,
      y,
      fillColor: getButtonFillColor(entry.color),
      tool: entry.tool,
      color: entry.color,
      icon: entry.tool === "eraser" ? "⌫" : undefined,
      rainbow: entry.color?.dynamic === "rainbow",
      onToolChange,
    }));
  });
  return buttons;
}

function getPaletteLayout(width: number, height: number): { startX: number; startY: number; spacing: number } {
  const total = PALETTE.length + 1;
  const menuSafeX = 220;
  const rightSafeX = width - 360;
  const spacing = Math.max(74, Math.min(96, (rightSafeX - menuSafeX) / Math.max(1, total - 1)));
  return {
    startX: menuSafeX,
    startY: Math.max(134, height * 0.18),
    spacing,
  };
}

function getButtonFillColor(color: PaintColor | null): number {
  if (!color) return HEX.bgElevated;
  if (color.dynamic === "rainbow") return HEX.white;
  return color.hex;
}

function createToolButton(config: {
  scene: Phaser.Scene;
  x: number;
  y: number;
  fillColor: number;
  tool: Tool;
  color: PaintColor | null;
  icon?: string;
  rainbow?: boolean;
  onToolChange: OnToolChange;
}): PaintToolButton {
  const button = createPaintColor(config.scene, config.x, config.y, {
    fillColor: config.fillColor,
    icon: config.icon,
    rainbow: config.rainbow,
    radius: 30,
    zonePad: 38,
    onActivate: () => {
      config.onToolChange(config.tool, config.color);
      button.reset();
    },
    depth: DEPTH.hud,
  });
  return { button, tool: config.tool, color: config.color };
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
    canvas.strokeStyle = getStrokeStyle(ctx.color, current);
    canvas.beginPath(); canvas.moveTo(previous.x, previous.y); canvas.lineTo(current.x, current.y); canvas.stroke();
    canvas.restore();
    last[i] = { ...current };
    changed = true;
  }
  if (changed) tex.refresh();
  return last;
}

function getStrokeStyle(color: PaintColor, point: Point): string {
  if (color.dynamic !== "rainbow") return color.color;
  const hue = Math.round((performance.now() * 0.14 + point.x * 0.2 + point.y * 0.2) % 360);
  return `hsl(${hue} 100% 52%)`;
}
