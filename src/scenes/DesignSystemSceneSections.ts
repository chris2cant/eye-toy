import Phaser from "phaser";
import { COLOR, HEX, FONT } from "../design-system/tokens";
import { NavArrow } from "../design-system/components/NavArrow";
import { createGameCard } from "../design-system/components/GameCard";
import { showFeedback } from "../design-system/components/FeedbackBurst";
import { showCombo } from "../design-system/components/ComboBadge";
import { confetti } from "../design-system/motion/animations";
import { DEMO_CARDS } from "./DesignSystemSceneData";

export function buildFeedbackSection(scene: Phaser.Scene, cx: number, y: number, width: number): number {
  drawSectionSeparator(scene, { cx, y, lineWidth: width * 0.8, title: "6 · Feedback bursts  (clic)" });
  y += 50;
  const feedbacks = [
    { label: "BRAVO !", pts: 100,  x: cx - 260 },
    { label: "SUPER !", pts: 200,  x: cx - 80  },
    { label: "GÉNIAL !", pts: 300, x: cx + 100 },
    { label: "COMBO",   pts: 0,   x: cx + 280 },
  ];
  feedbacks.forEach(({ label, pts, x: fx }) => {
    const isCombo = pts === 0;
    const col = isCombo ? HEX.sunYellow : pts >= 300 ? HEX.turquoise : pts >= 200 ? HEX.sunYellow : HEX.punchyPink;
    const colCss = isCombo ? COLOR.sunYellow : pts >= 300 ? COLOR.turquoise : pts >= 200 ? COLOR.sunYellow : COLOR.punchyPink;
    const btn = scene.add.graphics();
    btn.fillStyle(col, 0.12);
    btn.lineStyle(1.5, col, 0.5);
    btn.fillRoundedRect(fx - 64, y - 18, 128, 36, 18);
    btn.strokeRoundedRect(fx - 64, y - 18, 128, 36, 18);
    scene.add.text(fx, y, isCombo ? "COMBO x5" : `${label} +${pts}`, { fontSize: "14px", fontFamily: FONT.ui, color: colCss }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => { if (isCombo) showCombo(scene, fx, y - 60, 5); else showFeedback(scene, { x: fx, y: y - 60, points: pts }); });
  });
  return y + 56;
}

export function buildCardsSection(scene: Phaser.Scene, cx: number, y: number, width: number): number {
  drawSectionSeparator(scene, { cx, y, lineWidth: width * 0.8, title: "8 · GameCard  (active · inactive)" });
  y += 130;
  const cardActive = createGameCard(scene, DEMO_CARDS[0]);
  cardActive.container.setPosition(cx - 10, y);
  cardActive.redraw(360, 220, true);
  const cardLeft = createGameCard(scene, DEMO_CARDS[1]);
  cardLeft.container.setPosition(cx - 330, y + 32).setScale(0.82).setAlpha(0.7);
  cardLeft.redraw(260, 170, false, 0.7);
  const cardRight = createGameCard(scene, DEMO_CARDS[2]);
  cardRight.container.setPosition(cx + 330, y + 32).setScale(0.82).setAlpha(0.7);
  cardRight.redraw(260, 170, false, 0.7);
  const arrowY = y + 148;
  const demoLeft = new NavArrow(scene, cx - 330, arrowY, { direction: "left", onActivate: () => { demoLeft.reset(); }, dwellMs: 900, depth: 12 });
  const demoRight = new NavArrow(scene, cx + 330, arrowY, { direction: "right", onActivate: () => { demoRight.reset(); }, dwellMs: 900, depth: 12, fillColor: HEX.turquoise });
  DEMO_CARDS.forEach((_, index) => {
    const dot = scene.add.graphics();
    const isActive = index === 0;
    const dx = cx - DEMO_CARDS.length * 14 + index * 28;
    dot.fillStyle(isActive ? HEX.nightBlue : HEX.textMuted, isActive ? 1 : 0.4);
    dot.fillCircle(dx, arrowY, isActive ? 6 : 4);
  });
  return y + 320;
}

export interface ConfettiSectionSpec { cx: number; y: number; width: number; scrollY: number; height: number; }

export function buildConfettiSection(scene: Phaser.Scene, spec: ConfettiSectionSpec): number {
  const { cx, y, width, scrollY, height } = spec;
  drawSectionSeparator(scene, { cx, y, lineWidth: width * 0.8, title: "9 · Confettis  (clic)" });
  const btnY = y + 38;
  scene.add.text(cx, btnY, "🎉  Lancer les confettis", { fontSize: "18px", fontFamily: FONT.ui, color: COLOR.turquoise }).setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => confetti(scene, cx, scrollY + height / 2, 30));
  return btnY + 60;
}

interface SeparatorSpec { cx: number; y: number; lineWidth: number; title: string; }

export function drawSectionSeparator(scene: Phaser.Scene, spec: SeparatorSpec): void {
  const { cx, y, lineWidth, title } = spec;
  const line = scene.add.graphics();
  line.lineStyle(1, HEX.nightBlue, 0.12);
  line.lineBetween(cx - lineWidth / 2, y, cx + lineWidth / 2, y);
  if (title) {
    scene.add.text(cx - lineWidth / 2 + 8, y - 10, title, {
      fontSize: "11px", fontFamily: FONT.ui, color: COLOR.textMuted,
    }).setOrigin(0, 1);
  }
}
