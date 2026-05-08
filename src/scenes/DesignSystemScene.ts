import Phaser from "phaser";
import { COLOR, HEX, FONT } from "../design-system/tokens";
import { DwellButton } from "../design-system/DwellButton";
import { NavArrow } from "../design-system/components/NavArrow";
import { createScoreBadge } from "../design-system/components/ScoreBadge";
import { createTimerBadge } from "../design-system/components/TimerBadge";
import { createLivesBadge } from "../design-system/components/LivesBadge";
import { createTarget } from "../design-system/components/Target";
import { createProgressBar } from "../design-system/components/ProgressBar";
import { showFeedback } from "../design-system/components/FeedbackBurst";
import { confetti } from "../design-system/motion/animations";
import type { ProgressBarHandle } from "../design-system/components/ProgressBar";
import { PALETTE_ENTRIES } from "./DesignSystemSceneData";
import {
  buildFeedbackSection, buildCardsSection, buildConfettiSection, drawSectionSeparator,
} from "./DesignSystemSceneSections";

export class DesignSystemScene extends Phaser.Scene {
  private _progressBar?: ProgressBarHandle;
  private progressValue = 0;
  private _dwellButton?: DwellButton;
  private _navLeft?: NavArrow;
  private _navRight?: NavArrow;
  private _mouseHand: { x: number; y: number } | null = null;
  private _scrollY = 0;
  private _totalHeight = 0;
  private _camera!: Phaser.Cameras.Scene2D.Camera;

  constructor() {
    super({ key: "DesignSystemScene" });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;

    this._totalHeight = 1800;
    this.add.rectangle(cx, this._totalHeight / 2, width, this._totalHeight, HEX.cream);
    this._camera = this.cameras.main;
    this._camera.setBounds(0, 0, width, this._totalHeight);

    this.input.on("wheel", (_p: unknown, _go: unknown, _dx: unknown, dy: number) => {
      this._scrollY = Phaser.Math.Clamp(this._scrollY + dy, 0, this._totalHeight - height);
      this._camera.setScroll(0, this._scrollY);
    });

    let y = 48;
    this.add.text(cx, y, "Design System — Joy Motion TV", { fontSize: "32px", fontFamily: FONT.display, color: COLOR.nightBlue }).setOrigin(0.5);
    this.add.text(cx, y + 36, "Scroll pour tout voir · Clic pour tester les interactions", { fontSize: "13px", fontFamily: FONT.ui, color: COLOR.textMuted }).setOrigin(0.5);
    y += 72;

    y = this.buildPaletteSection(cx, y, width);
    y = this.buildTypoSection(cx, y, width);
    y = this.buildBadgesSection(cx, y, width);
    y = this.buildTargetsSection(cx, y, width);
    y = this.buildButtonsSection(cx, y, width);
    y = buildFeedbackSection(this, cx, y, width);
    y = this.buildProgressSection(cx, y, width);
    y = buildCardsSection(this, cx, y, width);
    y = buildConfettiSection(this, { cx, y, width, scrollY: this._scrollY, height });

    this._totalHeight = Math.max(this._totalHeight, y + 80);

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this._mouseHand = { x: pointer.x, y: pointer.y + this._scrollY };
    });
    this.input.on("pointerout", () => { this._mouseHand = null; });

    this.tweens.add({
      targets: this,
      progressValue: 1,
      duration: 3000,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
      onUpdate: () => this._progressBar?.setProgress(this.progressValue),
    });
  }

  private buildPaletteSection(cx: number, y: number, width: number): number {
    this._separator(cx, y, width * 0.8, "1 · Palette Joy Motion TV");
    y += 36;
    const startX = cx - (PALETTE_ENTRIES.length - 1) * 56;
    PALETTE_ENTRIES.forEach((entry, index) => {
      const px = startX + index * 112;
      const circle = this.add.graphics();
      circle.fillStyle(entry.hex, 1);
      if (entry.hex === HEX.white || entry.hex === HEX.bgElevated) {
        circle.lineStyle(1.5, HEX.nightBlue, 0.2);
        circle.strokeCircle(px, y + 18, 24);
      }
      circle.fillCircle(px, y + 18, 24);
      this.add.text(px, y + 50, entry.label, { fontSize: "11px", fontFamily: FONT.ui, color: COLOR.nightBlue, align: "center" }).setOrigin(0.5);
      this.add.text(px, y + 63, entry.css, { fontSize: "9px", fontFamily: FONT.ui, color: COLOR.textMuted, align: "center" }).setOrigin(0.5);
    });
    return y + 92;
  }

  private buildTypoSection(cx: number, y: number, width: number): number {
    this._separator(cx, y, width * 0.8, "2 · Typographies");
    y += 38;
    this.add.text(cx - 220, y, "BRAVO ! +100", { fontSize: "44px", fontFamily: FONT.display, color: COLOR.punchyPink }).setOrigin(0.5);
    this.add.text(cx + 160, y - 10, "Score  1250", { fontSize: "22px", fontFamily: FONT.ui, color: COLOR.nightBlue }).setOrigin(0.5);
    this.add.text(cx + 160, y + 16, "Niveau 3/5  Timer 30", { fontSize: "16px", fontFamily: FONT.ui, color: COLOR.textSecondary }).setOrigin(0.5);
    this.add.text(cx - 220, y + 36, "Fredoka 700 — display", { fontSize: "11px", fontFamily: FONT.ui, color: COLOR.textMuted }).setOrigin(0.5);
    this.add.text(cx + 160, y + 34, "Nunito Sans 700 — ui", { fontSize: "11px", fontFamily: FONT.ui, color: COLOR.textMuted }).setOrigin(0.5);
    return y + 60;
  }

  private buildBadgesSection(cx: number, y: number, width: number): number {
    this._separator(cx, y, width * 0.8, "3 · Score · Timer · Vies");
    y += 56;
    createScoreBadge(this, cx - 260, y, 2450).setValue(1250, 2450);
    createTimerBadge(this, cx, y).setTime(30);
    createLivesBadge(this, cx + 240, y, 3);
    return y + 80;
  }

  private buildTargetsSection(cx: number, y: number, width: number): number {
    this._separator(cx, y, width * 0.8, "4 · Cibles  (clic → hit)");
    y += 64;
    const variants = ["pink", "yellow", "turquoise", "purple"] as const;
    const states   = ["idle", "active", "missed", "idle"] as const;
    const stateLabels = ["idle", "active", "missed", "clic → hit"] as const;
    variants.forEach((variant, index) => {
      const tx = cx - 210 + index * 140;
      const target = createTarget(this, tx, y, { variant, radius: 44 });
      target.setState(states[index]);
      this.add.text(tx, y + 58, stateLabels[index], { fontSize: "11px", fontFamily: FONT.ui, color: COLOR.textMuted, align: "center" }).setOrigin(0.5);
      if (index === 3) {
        const zone = this.add.circle(tx, y, 50).setInteractive({ useHandCursor: true });
        zone.on("pointerdown", () => {
          createTarget(this, tx, y, { variant, radius: 44 }).setState("hit");
          confetti(this, tx, y, 14);
          this.time.delayedCall(600, () => { createTarget(this, tx, y, { variant, radius: 44 }).setState("idle"); });
        });
      }
    });
    return y + 100;
  }

  private buildButtonsSection(cx: number, y: number, width: number): number {
    this._separator(cx, y, width * 0.8, "5 · DwellButton + NavArrow  (survol souris)");
    y += 58;
    this._dwellButton = new DwellButton(this, cx - 220, y, {
      label: "JOUER",
      onActivate: () => { showFeedback(this, { x: cx - 220, y: y - 80, points: 100 }); this._dwellButton?.reset(); },
      dwellMs: 1200, depth: 10,
    });
    new DwellButton(this, cx, y, {
      label: "REJOUER",
      onActivate: () => { showFeedback(this, { x: cx, y: y - 80, points: 200 }); },
      dwellMs: 1200, depth: 10, fillColor: HEX.punchyPink,
    });
    new DwellButton(this, cx + 230, y, {
      label: "← MENU",
      onActivate: () => { showFeedback(this, { x: cx + 230, y: y - 80, points: 0, label: "MENU !" }); },
      dwellMs: 1200, depth: 10, fillColor: HEX.nightBlue,
    });
    y += 72;
    this._separator(cx, y, width * 0.8, "");
    y += 28;
    this._navLeft = new NavArrow(this, cx - 120, y, {
      direction: "left",
      onActivate: () => { showFeedback(this, { x: cx - 120, y: y - 80, points: 0, label: "◀" }); this._navLeft?.reset(); },
      dwellMs: 900, depth: 10,
    });
    this._navRight = new NavArrow(this, cx + 120, y, {
      direction: "right",
      onActivate: () => { showFeedback(this, { x: cx + 120, y: y - 80, points: 0, label: "▶" }); this._navRight?.reset(); },
      dwellMs: 900, depth: 10, fillColor: HEX.turquoise,
    });
    this.add.text(cx - 120, y + 60, "nightBlue", { fontSize: "11px", fontFamily: FONT.ui, color: COLOR.textMuted }).setOrigin(0.5);
    this.add.text(cx + 120, y + 60, "turquoise", { fontSize: "11px", fontFamily: FONT.ui, color: COLOR.textMuted }).setOrigin(0.5);
    return y + 100;
  }

  private buildProgressSection(cx: number, y: number, width: number): number {
    this._separator(cx, y, width * 0.8, "7 · Progress bar");
    y += 38;
    this._progressBar = createProgressBar(this, cx, y, { width: 360, height: 20 });
    this._progressBar.setProgress(0.65);
    this.add.text(cx + 200, y, "65%", { fontSize: "16px", fontFamily: FONT.display, color: COLOR.turquoise }).setOrigin(0, 0.5);
    return y + 52;
  }

  private _separator(cx: number, y: number, lineWidth: number, title: string) {
    drawSectionSeparator(this, { cx, y, lineWidth, title });
  }

  update(_time: number, delta: number) {
    const hands = this._mouseHand ? [this._mouseHand, null] : [null, null];
    this._dwellButton?.update(hands, delta);
    this._navLeft?.update(hands, delta);
    this._navRight?.update(hands, delta);
  }
}
