const SPRITE_SIZE = 64;
const MAX_CACHE = 128;

const cache = new Map<string, HTMLCanvasElement>();

function createGlowSprite(color: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE_SIZE;
  canvas.height = SPRITE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const half = SPRITE_SIZE / 2;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  // Masque radial : opaque au centre, transparent au bord.
  const mask = ctx.createRadialGradient(half, half, 0, half, half, half);
  mask.addColorStop(0, "rgba(255,255,255,1)");
  mask.addColorStop(0.35, "rgba(255,255,255,0.45)");
  mask.addColorStop(1, "rgba(255,255,255,0)");
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = mask;
  ctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  return canvas;
}

function getGlowSprite(color: string): HTMLCanvasElement {
  const cached = cache.get(color);
  if (cached) return cached;
  // Les couleurs HSL animées (style arcade) peuvent produire beaucoup d'entrées.
  if (cache.size >= MAX_CACHE) cache.clear();
  const sprite = createGlowSprite(color);
  cache.set(color, sprite);
  return sprite;
}

export type GlowSpec = { x: number; y: number; radius: number; alpha: number };

/** Halo lumineux pré-rendu : remplace `shadowBlur`, bien plus coûteux en Canvas2D. */
export function drawGlow(ctx: CanvasRenderingContext2D, color: string, spec: GlowSpec): void {
  const { x, y, radius, alpha } = spec;
  if (radius <= 0 || alpha <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.drawImage(getGlowSprite(color), x - radius, y - radius, radius * 2, radius * 2);
}
