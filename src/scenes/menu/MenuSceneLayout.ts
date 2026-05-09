import Phaser from "phaser";

export interface CardLayout {
  x: number; y: number; cardW: number; cardH: number;
  scale: number; alpha: number; active: boolean; visible: boolean;
}

export interface CarouselConfig {
  cx: number; cy: number; activeW: number; sideW: number; sideOffX: number;
}

export function computeCardLayout(
  index: number,
  currentIndex: number,
  total: number,
  carousel: CarouselConfig,
): CardLayout {
  const { cx, cy, activeW, sideW, sideOffX } = carousel;
  let offset = index - currentIndex;
  if (offset > total / 2)  offset -= total;
  if (offset < -total / 2) offset += total;

  const active  = offset === 0;
  const visible = Math.abs(offset) <= 1;
  return {
    x:      active ? cx : cx + offset * sideOffX,
    y:      active ? cy : cy + 30,
    cardW:  active ? activeW : sideW,
    cardH:  active ? 340 : 240,
    scale:  active ? 1 : 0.80,
    alpha:  1,
    active,
    visible,
  };
}

export interface RotatedRectSpec { x: number; y: number; rectW: number; rectH: number; angleDeg: number; }

export function drawRotatedRect(gfx: Phaser.GameObjects.Graphics, spec: RotatedRectSpec): void {
  const { x, y, rectW, rectH, angleDeg } = spec;
  const rad = Phaser.Math.DegToRad(angleDeg);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const halfW = rectW / 2;
  const halfH = rectH / 2;
  const corners: [number, number][] = [[-halfW, -halfH], [halfW, -halfH], [halfW, halfH], [-halfW, halfH]];
  const rotated = corners.map(([px, py]): [number, number] => [
    x + px * cos - py * sin,
    y + px * sin + py * cos,
  ]);
  gfx.beginPath();
  gfx.moveTo(rotated[0][0], rotated[0][1]);
  rotated.slice(1).forEach(([rx, ry]) => gfx.lineTo(rx, ry));
  gfx.closePath();
  gfx.fillPath();
}

export interface WebcamRenderParams {
  tex: Phaser.Textures.CanvasTexture;
  videoEl: HTMLVideoElement;
  width: number;
  height: number;
}

export function renderWebcamToCanvas(params: WebcamRenderParams): void {
  const { tex, videoEl, width, height } = params;
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;
  if (!vw || !vh) return;
  const scale = Math.max(width / vw, height / vh);
  const srcW = width / scale;
  const srcH = height / scale;
  const ctx = tex.getContext();
  ctx.save();
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(videoEl, (vw - srcW) / 2, (vh - srcH) / 2, srcW, srcH, 0, 0, width, height);
  ctx.restore();
  tex.refresh();
}
