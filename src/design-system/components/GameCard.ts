import Phaser from "phaser";
import { HEX, COLOR, FONT } from "../tokens";

export interface GameCardConfig {
  name: string;
  desc: string;
  tag: string;
  icon: string;
  accentHex: number;
  accentCss: string;
}

export interface GameCardHandle {
  container: Phaser.GameObjects.Container;
  tag: Phaser.GameObjects.Text;
  icon: Phaser.GameObjects.Text;
  title: Phaser.GameObjects.Text;
  desc: Phaser.GameObjects.Text;
  activeBadge: Phaser.GameObjects.Text;
  activeBadgeBg: Phaser.GameObjects.Graphics;
  redraw(cardW: number, cardH: number, active: boolean, alpha?: number): void;
  destroy(): void;
}

interface CardDimensions { cardW: number; cardH: number; }

interface CardElements {
  gfx: Phaser.GameObjects.Graphics;
  tagText: Phaser.GameObjects.Text;
  iconText: Phaser.GameObjects.Text;
  titleText: Phaser.GameObjects.Text;
  descText: Phaser.GameObjects.Text;
  activeBadgeBg: Phaser.GameObjects.Graphics;
  activeBadgeText: Phaser.GameObjects.Text;
}

function createCardElements(scene: Phaser.Scene, config: GameCardConfig): CardElements {
  return {
    gfx: scene.add.graphics(),
    tagText: scene.add.text(0, 0, "", { fontSize: "11px", fontFamily: FONT.ui }).setOrigin(0.5).setVisible(false),
    iconText: scene.add.text(0, 0, config.icon, { fontSize: "40px", fontFamily: FONT.display, color: COLOR.white }).setOrigin(0.5),
    titleText: scene.add.text(0, 0, config.name.toUpperCase(), {
      fontSize: "22px", fontFamily: FONT.display, color: COLOR.nightBlue,
      align: "center", wordWrap: { width: 256 },
    }).setOrigin(0.5),
    descText: scene.add.text(0, 0, config.desc, {
      fontSize: "12px", fontFamily: FONT.ui, color: COLOR.textSecondary,
      align: "center", lineSpacing: 3, wordWrap: { width: 220 },
    }).setOrigin(0.5),
    activeBadgeBg: scene.add.graphics(),
    activeBadgeText: scene.add.text(0, 0, "", { fontSize: "10px", fontFamily: FONT.ui }).setOrigin(0.5).setVisible(false),
  };
}

// Une période complète de sinusoïde (crete + creux) → vraie vague, pas un arc
function traceWavePath(gfx: Phaser.GameObjects.Graphics, halfW: number, baseY: number, amplitude: number): void {
  for (let step = 0; step <= 60; step++) {
    const ratio = step / 60;
    gfx.lineTo(-halfW + ratio * halfW * 2, baseY - amplitude * Math.sin(ratio * Math.PI * 2));
  }
}

type WaveParams = { halfW: number; halfH: number; accentHex: number; cornerR: number };

function drawWave(gfx: Phaser.GameObjects.Graphics, { halfW, halfH, accentHex, cornerR }: WaveParams): void {
  // baseY à 73% de halfH → vague bien en bas (~27% du bas de la carte)
  const amplitude = Math.round(halfH * 0.09);
  const baseY = Math.round(halfH * 0.73);
  // sectionTop inclut une marge de sécurité au-dessus du pic de vague
  const sectionTop = baseY - amplitude - 10;

  gfx.fillStyle(accentHex, 1);
  gfx.fillRoundedRect(-halfW, sectionTop, halfW * 2, halfH - sectionTop, { tl: 0, tr: 0, bl: cornerR, br: cornerR });

  // Capuchon blanc qui "découpe" la vague dans la section accent
  gfx.fillStyle(HEX.white, 1);
  gfx.beginPath();
  gfx.moveTo(-halfW, sectionTop);
  gfx.lineTo(-halfW, baseY);
  traceWavePath(gfx, halfW, baseY, amplitude);
  gfx.lineTo(halfW, sectionTop);
  gfx.closePath();
  gfx.fillPath();
}

function drawBackground(gfx: Phaser.GameObjects.Graphics, halfW: number, halfH: number, cornerR: number): void {
  gfx.fillStyle(0x000000, 0.08);
  gfx.fillRoundedRect(-halfW + 4, -halfH + 7, halfW * 2, halfH * 2, cornerR);
  gfx.fillStyle(HEX.white, 1);
  gfx.fillRoundedRect(-halfW, -halfH, halfW * 2, halfH * 2, cornerR);
}

function drawIconCircle(gfx: Phaser.GameObjects.Graphics, iconY: number, radius: number, accentHex: number): void {
  gfx.fillStyle(accentHex, 1);
  gfx.fillCircle(0, iconY, radius);
  gfx.fillStyle(HEX.white, 0.20);
  gfx.fillCircle(0, iconY - radius * 0.22, radius * 0.58);
}

function drawDecorations(gfx: Phaser.GameObjects.Graphics, halfW: number, halfH: number, accentHex: number): void {
  gfx.fillStyle(accentHex, 0.25);
  gfx.fillCircle(halfW * 0.72, -halfH * 0.65, 8);
  gfx.fillCircle(-halfW * 0.66, -halfH * 0.52, 5);
  gfx.fillStyle(HEX.sunYellow, 0.55);
  gfx.fillCircle(halfW * 0.58, -halfH * 0.44, 4);
}

function computeWaveTop(halfH: number): number {
  const amplitude = Math.round(halfH * 0.09);
  const baseY = Math.round(halfH * 0.73);
  return baseY - amplitude - 10;
}

function drawActiveCard(el: CardElements, config: GameCardConfig, dim: CardDimensions): void {
  const { cardW, cardH } = dim;
  const halfW = cardW / 2;
  const halfH = cardH / 2;
  const cornerR = 24;
  const iconRadius = 66;
  const iconY = -halfH + 126;

  drawBackground(el.gfx, halfW, halfH, cornerR);
  drawWave(el.gfx, { halfW, halfH, accentHex: config.accentHex, cornerR });
  drawIconCircle(el.gfx, iconY, iconRadius, config.accentHex);
  drawDecorations(el.gfx, halfW, halfH, config.accentHex);

  el.iconText.setPosition(0, iconY).setFontSize("40px").setAlpha(1);

  const titleY = iconY + iconRadius + 26;
  const waveTop = computeWaveTop(halfH);
  const descY = Math.min(titleY + 34, waveTop - 28);

  el.titleText.setPosition(0, titleY).setFontSize("22px").setAlpha(1).setColor(COLOR.nightBlue).setVisible(true);
  el.descText.setPosition(0, descY).setAlpha(1).setColor(COLOR.textSecondary).setVisible(true);
}

function drawInactiveCard(el: CardElements, config: GameCardConfig, dim: CardDimensions): void {
  const { cardW, cardH } = dim;
  const halfW = cardW / 2;
  const halfH = cardH / 2;
  const cornerR = 16;
  const iconRadius = 36;
  const iconY = -halfH + 62;

  drawBackground(el.gfx, halfW, halfH, cornerR);
  drawWave(el.gfx, { halfW, halfH, accentHex: config.accentHex, cornerR });
  drawIconCircle(el.gfx, iconY, iconRadius, config.accentHex);

  el.iconText.setPosition(0, iconY).setFontSize("24px").setAlpha(1);
  const titleY = iconY + iconRadius + 16;
  el.titleText.setPosition(0, titleY).setFontSize("14px").setAlpha(1).setColor(COLOR.nightBlue).setVisible(true);
  el.descText.setVisible(false);
}

export function createGameCard(scene: Phaser.Scene, config: GameCardConfig): GameCardHandle {
  const container = scene.add.container(0, 0);
  const el = createCardElements(scene, config);

  container.add([el.gfx, el.activeBadgeBg, el.tagText, el.iconText, el.titleText, el.descText, el.activeBadgeText]);

  function redraw(cardW: number, cardH: number, active: boolean, _alpha = 1): void {
    el.gfx.clear();
    el.activeBadgeBg.clear();
    if (active) {
      drawActiveCard(el, config, { cardW, cardH });
    } else {
      drawInactiveCard(el, config, { cardW, cardH });
    }
  }

  redraw(320, 420, true);

  return {
    container,
    tag: el.tagText,
    icon: el.iconText,
    title: el.titleText,
    desc: el.descText,
    activeBadge: el.activeBadgeText,
    activeBadgeBg: el.activeBadgeBg,
    redraw,
    destroy() { container.destroy(); },
  };
}
