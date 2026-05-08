import Phaser from "phaser";
import { COLOR, HEX, FONT, DEPTH } from "../../design-system/tokens";
import { createScoreBadge } from "../../design-system/components/ScoreBadge";
import { createLivesBadge } from "../../design-system/components/LivesBadge";
import type { ScoreBadgeHandle } from "../../design-system/components/ScoreBadge";
import type { LivesBadgeHandle } from "../../design-system/components/LivesBadge";

export interface SimonHUD {
  scoreBadge: ScoreBadgeHandle;
  livesBadge: LivesBadgeHandle;
  txtProgress: Phaser.GameObjects.Text;
}

export function createSimonHUD(scene: Phaser.Scene, width: number, height: number, hs: number): SimonHUD {
  const scoreBadge = createScoreBadge(scene, width - 100, height * 0.06, hs);
  scoreBadge.container.setDepth(DEPTH.hud);
  const livesBadge = createLivesBadge(scene, width / 2, height * 0.06, 3);
  livesBadge.container.setDepth(DEPTH.hud);
  const txtProgress = scene.add.text(width / 2, height - 22, "", {
    fontSize: "15px", fontFamily: FONT.ui, color: COLOR.textSecondary,
    shadow: { offsetX: 0, offsetY: 1, color: "#000", blur: 4, fill: true },
  }).setOrigin(0.5, 1).setDepth(DEPTH.hud);
  return { scoreBadge, livesBadge, txtProgress };
}

export interface GameOverDisplayRefs {
  txtGameOverScore: Phaser.GameObjects.Text;
  txtGameOverBest: Phaser.GameObjects.Text;
  gameOverOverlay: Phaser.GameObjects.Container;
}

export interface GameOverScoreDisplay { score: number; hsKey: string; }

export function showGameOverDisplay(
  scene: Phaser.Scene, refs: GameOverDisplayRefs, opts: GameOverScoreDisplay,
): void {
  const { score, hsKey } = opts;
  const prev = parseInt(localStorage.getItem(hsKey) ?? "0", 10);
  const isNew = score > prev;
  const best = Math.max(score, prev);
  localStorage.setItem(hsKey, String(best));

  refs.txtGameOverScore.setText("0");
  scene.tweens.addCounter({
    from: 0, to: score,
    duration: Math.min(score * 120, 1400), ease: "Cubic.Out",
    onUpdate: (tween) => refs.txtGameOverScore.setText(String(Math.round(tween.getValue() ?? 0))),
  });
  refs.txtGameOverBest.setText(
    isNew && score > 0 ? "★  NOUVEAU RECORD !"
      : best > 0 ? `MEILLEUR : ${best} séquence${best > 1 ? "s" : ""}` : "",
  );
  if (isNew && score > 0) refs.txtGameOverBest.setColor(COLOR.warning);
  refs.gameOverOverlay.setVisible(true);
}

export interface GameOverPanelElements {
  overlay: Phaser.GameObjects.Container;
  txtScore: Phaser.GameObjects.Text;
  txtBest: Phaser.GameObjects.Text;
}

export function createGameOverPanel(scene: Phaser.Scene, width: number, height: number): GameOverPanelElements {
  const overlay = scene.add.container(0, 0).setDepth(DEPTH.topUi);

  const bg = scene.add.graphics();
  bg.fillStyle(HEX.cream, 0.88);
  bg.fillRect(0, 0, width, height);

  const panelW = Math.min(480, width - 80);
  const panelH = 280;
  const px = width / 2;
  const py = height * 0.40;

  const panel = scene.add.graphics();
  panel.fillStyle(HEX.white, 1);
  panel.fillRoundedRect(px - panelW / 2, py - panelH / 2, panelW, panelH, 16);
  panel.lineStyle(2, HEX.turquoise, 0.55);
  panel.strokeRoundedRect(px - panelW / 2, py - panelH / 2, panelW, panelH, 16);

  const txtTitle = scene.add.text(px, py - panelH / 2 + 30, "PARTIE TERMINÉE", {
    fontSize: "18px", fontFamily: FONT.display, color: COLOR.nightBlue, letterSpacing: 3,
  }).setOrigin(0.5);

  const txtLabel = scene.add.text(px, py - 14, "SÉQUENCES RÉUSSIES", {
    fontSize: "11px", fontFamily: FONT.ui, color: COLOR.textMuted, letterSpacing: 2,
  }).setOrigin(0.5);

  const txtScore = scene.add.text(px, py + 28, "0", {
    fontSize: "76px", fontFamily: FONT.display, color: COLOR.nightBlue,
    shadow: { offsetX: 0, offsetY: 0, color: COLOR.turquoise, blur: 16, fill: true },
  }).setOrigin(0.5);

  const txtBest = scene.add.text(px, py + panelH / 2 - 30, "", {
    fontSize: "14px", fontFamily: FONT.ui, color: COLOR.textSecondary,
  }).setOrigin(0.5);

  overlay.add([bg, panel, txtTitle, txtLabel, txtScore, txtBest]);
  overlay.setVisible(false);

  return { overlay, txtScore, txtBest };
}
