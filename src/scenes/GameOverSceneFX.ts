import Phaser from "phaser";
import { COLOR, HEX, FONT, DEPTH, GAME_CIRCLE_PALETTE } from "../design-system/tokens";

export interface GameOverHeaderOpts { isBest: boolean; gameName: string; }

export function buildGameOverHeader(scene: Phaser.Scene, cx: number, height: number, opts: GameOverHeaderOpts): void {
  const { isBest, gameName } = opts;
  scene.add.text(cx, height * 0.06, gameName.toUpperCase().split("").join(" "), {
    fontSize: "13px", fontFamily: FONT.display, color: COLOR.brandPrimary, letterSpacing: 6,
  }).setOrigin(0.5).setAlpha(0.8).setDepth(DEPTH.hud);
  scene.add.text(cx, height * 0.15, isBest ? "NOUVEAU RECORD !" : "BIEN JOUE !", {
    fontSize: "82px", fontFamily: FONT.display, fontStyle: "900",
    color: isBest ? COLOR.success : COLOR.brandPrimary,
    shadow: { offsetX: 0, offsetY: 0, color: isBest ? COLOR.success : COLOR.brandPrimary, blur: 26, fill: true },
  }).setOrigin(0.5).setDepth(DEPTH.hud);
  scene.add.text(cx, height * 0.24, "Temps ecoule", {
    fontSize: "22px", fontFamily: FONT.ui, color: COLOR.textSecondary,
  }).setOrigin(0.5).setDepth(DEPTH.hud);
}

export interface ScorePanelSpec { cx: number; panelY: number; panelW: number; panelH: number; }

export function drawGameOverScorePanel(scene: Phaser.Scene, spec: ScorePanelSpec): void {
  const { cx, panelY, panelW, panelH } = spec;
  const panel = scene.add.graphics().setDepth(DEPTH.hud);
  panel.fillStyle(HEX.bgSurface, 0.58);
  panel.fillRoundedRect(cx - panelW / 2, panelY - panelH / 2, panelW, panelH, 8);
  panel.lineStyle(2, HEX.brandPrimary, 0.85);
  panel.strokeRoundedRect(cx - panelW / 2, panelY - panelH / 2, panelW, panelH, 8);
  panel.lineStyle(6, HEX.brandPrimary, 0.15);
  panel.strokeRoundedRect(cx - panelW / 2 + 5, panelY - panelH / 2 + 5, panelW - 10, panelH - 10, 8);
}

export function buildGameOverFrame(scene: Phaser.Scene, width: number, height: number): void {
  const gfx = scene.add.graphics().setDepth(DEPTH.hud);
  const pad = 14;
  const corner = 72;
  gfx.lineStyle(1, HEX.brandPrimary, 0.9);
  [
    [pad, pad, pad + corner, pad],
    [pad, pad, pad, pad + corner],
    [width - pad - corner, pad, width - pad, pad],
    [width - pad, pad, width - pad, pad + corner],
    [pad, height - pad - corner, pad, height - pad],
    [pad, height - pad, pad + corner, height - pad],
    [width - pad - corner, height - pad, width - pad, height - pad],
    [width - pad, height - pad - corner, width - pad, height - pad],
  ].forEach(([x1, y1, x2, y2]) => {
    gfx.beginPath(); gfx.moveTo(x1, y1); gfx.lineTo(x2, y2); gfx.strokePath();
  });
  for (let i = 0; i < 28; i++) {
    const x = Phaser.Math.Between(Math.round(width * 0.08), Math.round(width * 0.92));
    const y = Phaser.Math.Between(Math.round(height * 0.06), Math.round(height * 0.86));
    gfx.fillStyle(i % 3 === 0 ? HEX.success : HEX.brandPrimary, 0.25);
    gfx.fillCircle(x, y, i % 4 === 0 ? 2 : 1);
  }
}

export function buildGameOverEmblem(scene: Phaser.Scene, cx: number, y: number): void {
  const gfx = scene.add.graphics().setDepth(DEPTH.hud);
  gfx.lineStyle(2, HEX.brandPrimary, 0.95); gfx.strokeCircle(cx, y, 48);
  gfx.lineStyle(2, HEX.success, 0.55);      gfx.strokeCircle(cx, y, 36);
  gfx.fillStyle(HEX.brandPrimary, 0.16);    gfx.fillCircle(cx, y, 52);
  scene.add.text(cx, y + 1, "✋", { fontSize: "42px", fontFamily: FONT.ui, color: COLOR.brandPrimary })
    .setOrigin(0.5).setDepth(DEPTH.hud);
}

export function burstConfetti(scene: Phaser.Scene, x: number, y: number): void {
  for (let i = 0; i < 42; i++) {
    const angle = (Math.PI * 2 * i) / 42;
    const distance = Phaser.Math.Between(70, 190);
    const particle = scene.add
      .circle(x, y, Phaser.Math.Between(2, 5), GAME_CIRCLE_PALETTE[i % GAME_CIRCLE_PALETTE.length], 0.95)
      .setDepth(DEPTH.topUi);
    scene.tweens.add({
      targets: particle,
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      alpha: 0, scale: 0.25,
      duration: Phaser.Math.Between(700, 1200), ease: "Cubic.Out",
      onComplete: () => particle.destroy(),
    });
  }
}
