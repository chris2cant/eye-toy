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

interface CardDimensions {
  cardW: number;
  cardH: number;
  alpha: number;
}

interface CardElements {
  gfx: Phaser.GameObjects.Graphics;
  tagBg: Phaser.GameObjects.Graphics;
  activeBadgeBg: Phaser.GameObjects.Graphics;
  tagText: Phaser.GameObjects.Text;
  iconText: Phaser.GameObjects.Text;
  titleText: Phaser.GameObjects.Text;
  descText: Phaser.GameObjects.Text;
  activeBadgeText: Phaser.GameObjects.Text;
}

function createCardElements(scene: Phaser.Scene, config: GameCardConfig): CardElements {
  return {
    gfx: scene.add.graphics(),
    tagBg: scene.add.graphics(),
    activeBadgeBg: scene.add.graphics(),
    tagText: scene.add.text(0, 0, config.tag, { fontSize: "11px", fontFamily: FONT.ui, color: COLOR.white }).setOrigin(0.5),
    iconText: scene.add.text(0, 0, config.icon, { fontSize: "22px", fontFamily: FONT.display, color: config.accentCss }).setOrigin(0.5),
    titleText: scene.add.text(0, 0, config.name.toUpperCase(), { fontSize: "22px", fontFamily: FONT.display, color: COLOR.nightBlue, align: "center" }).setOrigin(0.5),
    descText: scene.add.text(0, 0, config.desc, { fontSize: "13px", fontFamily: FONT.ui, color: COLOR.textSecondary, align: "center", lineSpacing: 4, wordWrap: { width: 300 } }).setOrigin(0.5),
    activeBadgeText: scene.add.text(0, 0, "ACTIF", { fontSize: "10px", fontFamily: FONT.ui, color: COLOR.white }).setOrigin(0.5).setVisible(false),
  };
}

function drawActiveCard(el: CardElements, config: GameCardConfig, dim: CardDimensions): void {
  const { cardW, cardH, alpha } = dim;
  const halfW = cardW / 2;
  const halfH = cardH / 2;
  const cornerR = 24;
  const iconCircleR = 38;
  const iconY = -halfH * 0.30;

  el.gfx.fillStyle(0x000000, 0.14 * alpha);
  el.gfx.fillRoundedRect(-halfW + 5, -halfH + 8, cardW, cardH, cornerR);
  el.gfx.fillStyle(config.accentHex, alpha);
  el.gfx.fillRoundedRect(-halfW, -halfH, cardW, cardH, cornerR);
  el.gfx.fillStyle(0xffffff, 0.20 * alpha);
  el.gfx.fillRoundedRect(-halfW, -halfH, cardW, cardH * 0.42, { tl: cornerR, tr: cornerR, bl: 0, br: 0 });
  el.gfx.fillStyle(0x000000, 0.07 * alpha);
  el.gfx.fillRoundedRect(-halfW, halfH * 0.42, cardW, halfH * 0.58, { tl: 0, tr: 0, bl: cornerR, br: cornerR });

  const bubbles: { x: number; y: number; radius: number; color: number }[] = [
    { x: halfW * 0.78, y: -halfH * 0.30, radius: 22, color: HEX.sunYellow  },
    { x: -halfW * 0.80, y: halfH * 0.28, radius: 18, color: HEX.punchyPink },
    { x: halfW * 0.75, y: halfH * 0.58, radius: 20, color: HEX.popPurple  },
  ];
  bubbles.forEach(({ x, y, radius, color }) => {
    el.gfx.fillStyle(color, 0.82 * alpha);
    el.gfx.fillCircle(x, y, radius);
  });

  el.gfx.fillStyle(HEX.white, 0.95 * alpha);
  el.gfx.fillCircle(0, iconY, iconCircleR);
  el.iconText.setPosition(0, iconY).setFontSize("24px").setAlpha(alpha).setColor(COLOR.nightBlue);

  drawActiveTagPill(el, -halfW, -halfH, alpha);

  const titleY = iconY + iconCircleR + 22;
  el.titleText.setPosition(0, titleY).setFontSize("22px").setAlpha(alpha).setColor(COLOR.white);
  el.descText.setPosition(0, titleY + 38).setVisible(true).setAlpha(0.88 * alpha).setColor(COLOR.white);

  drawActiveBadge(el, halfW, -halfH, alpha);
}

function drawActiveTagPill(el: CardElements, leftEdge: number, topEdge: number, alpha: number): void {
  el.tagText.setFontSize("11px");
  const tagPadX = 10;
  const tagPadY = 5;
  const tagW = el.tagText.width + tagPadX * 2;
  const tagH = Math.max(el.tagText.height + tagPadY * 2 - 4, 20);
  const tagX = leftEdge + tagW / 2 + 12;
  const tagYPos = topEdge + tagH / 2 + 14;
  el.tagBg.fillStyle(0xffffff, 0.22 * alpha);
  el.tagBg.fillRoundedRect(tagX - tagW / 2, tagYPos - tagH / 2, tagW, tagH, tagH / 2);
  el.tagText.setPosition(tagX, tagYPos).setAlpha(alpha).setColor(COLOR.white);
}

function drawActiveBadge(el: CardElements, rightEdge: number, topEdge: number, alpha: number): void {
  const badgeW = 78;
  const badgeH = 24;
  const badgeX = rightEdge - badgeW / 2 - 12;
  const badgeY = topEdge + badgeH / 2 + 14;
  el.activeBadgeBg.fillStyle(0xffffff, 0.22 * alpha);
  el.activeBadgeBg.fillRoundedRect(badgeX - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 12);
  el.activeBadgeBg.fillStyle(0x22c55e, alpha);
  el.activeBadgeBg.fillCircle(badgeX - badgeW / 2 + 10, badgeY, 4);
  el.activeBadgeText.setPosition(badgeX + 4, badgeY).setAlpha(1).setVisible(true).setColor(COLOR.white).setFontSize("10px").setText("ACTIF");
}

function drawInactiveCard(el: CardElements, config: GameCardConfig, dim: CardDimensions): void {
  const { cardW, cardH, alpha } = dim;
  const halfW = cardW / 2;
  const halfH = cardH / 2;
  const cornerR = 16;
  const iconCircleR = 24;
  const iconY = -halfH + 42;
  const accentBarH = 8;

  el.gfx.fillStyle(0x000000, 0.07 * alpha);
  el.gfx.fillRoundedRect(-halfW + 4, -halfH + 6, cardW, cardH, cornerR);
  el.gfx.fillStyle(HEX.white, alpha);
  el.gfx.fillRoundedRect(-halfW, -halfH, cardW, cardH, cornerR);
  el.gfx.fillStyle(config.accentHex, alpha);
  el.gfx.fillRoundedRect(-halfW, -halfH, cardW, accentBarH, { tl: cornerR, tr: cornerR, bl: 0, br: 0 });

  el.gfx.fillStyle(config.accentHex, 0.12 * alpha);
  el.gfx.fillCircle(0, iconY, iconCircleR);
  el.gfx.lineStyle(2, config.accentHex, 0.4 * alpha);
  el.gfx.strokeCircle(0, iconY, iconCircleR);
  el.iconText.setPosition(0, iconY).setFontSize("14px").setAlpha(alpha).setColor(config.accentCss);

  el.tagText.setFontSize("9px");
  const tagPadX = 10;
  const tagPadY = 5;
  const tagW = el.tagText.width + tagPadX * 2;
  const tagH = Math.max(el.tagText.height + tagPadY * 2 - 4, 18);
  const tagX = -halfW + tagW / 2 + 10;
  const tagYPos = -halfH + accentBarH + tagH / 2 + 8;
  el.tagBg.fillStyle(config.accentHex, alpha);
  el.tagBg.fillRoundedRect(tagX - tagW / 2, tagYPos - tagH / 2, tagW, tagH, tagH / 2);
  el.tagText.setPosition(tagX, tagYPos).setAlpha(alpha).setColor(COLOR.white);

  const titleY = iconY + iconCircleR + 16;
  el.titleText.setPosition(0, titleY).setFontSize("14px").setAlpha(alpha).setColor(COLOR.nightBlue);
  el.descText.setPosition(0, titleY + 20).setVisible(false).setAlpha(alpha).setColor(COLOR.textSecondary);
  el.activeBadgeText.setVisible(false);
}

export function createGameCard(scene: Phaser.Scene, config: GameCardConfig): GameCardHandle {
  const container = scene.add.container(0, 0);
  const el = createCardElements(scene, config);

  container.add([el.gfx, el.tagBg, el.activeBadgeBg, el.tagText, el.iconText, el.titleText, el.descText, el.activeBadgeText]);

  function redraw(cardW: number, cardH: number, active: boolean, alpha = 1) {
    el.gfx.clear();
    el.tagBg.clear();
    el.activeBadgeBg.clear();
    const dim: CardDimensions = { cardW, cardH, alpha };
    if (active) {
      drawActiveCard(el, config, dim);
    } else {
      drawInactiveCard(el, config, dim);
    }
  }

  redraw(360, 220, true);

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
