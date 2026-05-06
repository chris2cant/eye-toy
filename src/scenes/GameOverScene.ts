import Phaser from "phaser";
import { audioFX } from "../audio/AudioFX";
import { handTracker } from "../camera/HandTracker";
import type { LandmarksPayload } from "../camera/HandTracker";
import { COLOR, HEX, FONT, DEPTH, GAME_CIRCLE_PALETTE } from "../design-system/tokens";
import { DwellButton } from "../design-system/DwellButton";
import { HandCursors } from "../design-system/HandCursors";

const PALM_LANDMARK = 9;
const SCORE_COUNT_MAX_MS = 1800;

export class GameOverScene extends Phaser.Scene {
  private cursors!: HandCursors;
  private btnReplay!: DwellButton;
  private btnMenu!: DwellButton;
  private handPositions: ({ x: number; y: number } | null)[] = [null, null];

  constructor() {
    super({ key: "GameOverScene" });
  }

  create() {
    const { width, height } = this.scale;
    const data = this.scene.settings.data as { score: number };
    const score = data?.score ?? 0;
    const cx = width / 2;

    this.handPositions = [null, null];

    const previousBest = parseInt(localStorage.getItem("eyetoy_best") ?? "0", 10);
    const best = Math.max(score, previousBest);
    const isBest = score >= previousBest && score > 0;
    localStorage.setItem("eyetoy_best", String(best));

    this.add.rectangle(cx, height / 2, width, height, HEX.bgCanvas, 0.72).setDepth(DEPTH.bg);

    this.buildFrame(width, height);
    this.buildHeader(cx, height, isBest);
    this.buildMenuButton(width, height);
    this.buildReplayButton(cx, height);
    this.buildScoreSection(cx, height, score, best, isBest);

    this.cursors = new HandCursors(this, DEPTH.cursor);
    handTracker.start({ targetFps: 30 });
    handTracker.on("landmarks", this.onLandmarks);
    this.events.once("shutdown", () => handTracker.off("landmarks", this.onLandmarks));

    this.input.keyboard!.on("keydown-R", () => { audioFX.pop(); this.doReplay(); });
    this.input.keyboard!.on("keydown-Q", () => this.doQuit());

    this.buildKeyboardHint(cx, height);
  }

  private buildFrame(width: number, height: number) {
    const gfx = this.add.graphics().setDepth(DEPTH.hud);
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
      gfx.beginPath();
      gfx.moveTo(x1, y1);
      gfx.lineTo(x2, y2);
      gfx.strokePath();
    });

    for (let i = 0; i < 28; i++) {
      const x = Phaser.Math.Between(Math.round(width * 0.08), Math.round(width * 0.92));
      const y = Phaser.Math.Between(Math.round(height * 0.06), Math.round(height * 0.86));
      gfx.fillStyle(i % 3 === 0 ? HEX.success : HEX.brandPrimary, 0.25);
      gfx.fillCircle(x, y, i % 4 === 0 ? 2 : 1);
    }
  }

  private buildHeader(cx: number, height: number, isBest: boolean) {
    this.add
      .text(cx, height * 0.06, "A T T R A P E - L E S   T O U S", {
        fontSize: "13px",
        fontFamily: FONT.identity,
        color: COLOR.brandPrimary,
        letterSpacing: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0.8)
      .setDepth(DEPTH.hud);

    this.add
      .text(cx, height * 0.15, isBest ? "NOUVEAU RECORD !" : "BIEN JOUE !", {
        fontSize: "82px",
        fontFamily: FONT.identity,
        fontStyle: "900",
        color: isBest ? COLOR.success : COLOR.brandPrimary,
        shadow: { offsetX: 0, offsetY: 0, color: isBest ? COLOR.success : COLOR.brandPrimary, blur: 26, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    this.add
      .text(cx, height * 0.24, "Temps ecoule", {
        fontSize: "22px",
        fontFamily: FONT.ui,
        color: COLOR.textSecondary,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
  }

  private buildMenuButton(_width: number, height: number) {
    this.btnMenu = new DwellButton(this, 118, height * 0.12, {
      label: "← MENU",
      fontSize: "20px",
      onActivate: () => { audioFX.pop(); this.doQuit(); },
      depth: DEPTH.hud,
      dwellMs: 1000,
    });
  }

  private buildReplayButton(cx: number, height: number) {
    this.btnReplay = new DwellButton(this, cx, height * 0.36, {
      label: "  REJOUER  →",
      onActivate: () => { audioFX.pop(); this.doReplay(); },
      depth: DEPTH.hud,
      dwellMs: 1000,
    });

    this.add
      .text(cx, height * 0.36 + this.btnReplay.height / 2 + 22, "Garde la main sur le bouton", {
        fontSize: "16px",
        fontFamily: FONT.ui,
        color: COLOR.textMuted,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

  }

  private buildScoreSection(cx: number, height: number, score: number, best: number, isBest: boolean) {
    const panelY = height * 0.66;
    const panelW = Math.min(660, this.scale.width * 0.76);
    const panelH = height * 0.34;
    const panel = this.add.graphics().setDepth(DEPTH.hud);

    panel.fillStyle(HEX.bgSurface, 0.58);
    panel.fillRoundedRect(cx - panelW / 2, panelY - panelH / 2, panelW, panelH, 8);
    panel.lineStyle(2, HEX.brandPrimary, 0.85);
    panel.strokeRoundedRect(cx - panelW / 2, panelY - panelH / 2, panelW, panelH, 8);
    panel.lineStyle(6, HEX.brandPrimary, 0.15);
    panel.strokeRoundedRect(cx - panelW / 2 + 5, panelY - panelH / 2 + 5, panelW - 10, panelH - 10, 8);

    this.buildScoreEmblem(cx, panelY - panelH * 0.40);

    this.add
      .text(cx, panelY - panelH * 0.22, "SCORE", {
        fontSize: "18px",
        fontFamily: FONT.ui,
        color: COLOR.brandPrimary,
        letterSpacing: 3,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    const scoreText = this.add
      .text(cx, panelY + panelH * 0.04, "0", {
        fontSize: "78px",
        fontFamily: FONT.identity,
        color: COLOR.textPrimary,
        shadow: { offsetX: 0, offsetY: 0, color: COLOR.brandPrimary, blur: 14, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    this.tweens.addCounter({
      from: 0,
      to: score,
      duration: Math.min(score * 12, SCORE_COUNT_MAX_MS),
      ease: "Cubic.Out",
      onUpdate: (tween) => scoreText.setText(String(Math.round(tween.getValue()))),
    });

    this.add
      .text(cx, panelY + panelH * 0.32, isBest ? "NOUVEAU MEILLEUR SCORE" : `MEILLEUR : ${best} pts`, {
        fontSize: isBest ? "24px" : "21px",
        fontFamily: FONT.identity,
        color: isBest ? COLOR.success : COLOR.success,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    const footer = this.add
      .text(cx, panelY + panelH * 0.44, isBest ? "+10 pts de bonus mental pour la performance" : "Continue pour battre ton record !", {
        fontSize: "18px",
        fontFamily: FONT.ui,
        color: COLOR.textSecondary,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    if (isBest) {
      this.time.delayedCall(220, () => this.burst(cx, panelY + panelH * 0.30));
      this.tweens.add({
        targets: footer,
        alpha: 0.55,
        duration: 680,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
    }
  }

  private buildScoreEmblem(cx: number, y: number) {
    const gfx = this.add.graphics().setDepth(DEPTH.hud);
    gfx.lineStyle(2, HEX.brandPrimary, 0.95);
    gfx.strokeCircle(cx, y, 48);
    gfx.lineStyle(2, HEX.success, 0.55);
    gfx.strokeCircle(cx, y, 36);
    gfx.fillStyle(HEX.brandPrimary, 0.16);
    gfx.fillCircle(cx, y, 52);

    this.add
      .text(cx, y + 1, "✋", {
        fontSize: "42px",
        fontFamily: FONT.ui,
        color: COLOR.brandPrimary,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
  }

  private burst(x: number, y: number) {
    for (let i = 0; i < 42; i++) {
      const angle = (Math.PI * 2 * i) / 42;
      const distance = Phaser.Math.Between(70, 190);
      const particle = this.add
        .circle(x, y, Phaser.Math.Between(2, 5), GAME_CIRCLE_PALETTE[i % GAME_CIRCLE_PALETTE.length], 0.95)
        .setDepth(DEPTH.topUi);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.25,
        duration: Phaser.Math.Between(700, 1200),
        ease: "Cubic.Out",
        onComplete: () => particle.destroy(),
      });
    }
  }

  private onLandmarks = ({ hands }: LandmarksPayload): void => {
    const { width: screenWidth, height: screenHeight } = this.scale;
    this.handPositions = [null, null];
    hands.forEach((hand, i) => {
      if (!hand || hand.length === 0) return;
      const lm = hand[PALM_LANDMARK];
      this.handPositions[i] = { x: (1 - lm.x) * screenWidth, y: lm.y * screenHeight };
    });
  };

  update(_time: number, delta: number) {
    this.cursors.update(this.handPositions);
    this.btnReplay.update(this.handPositions, delta);
    this.btnMenu.update(this.handPositions, delta);
  }

  private buildKeyboardHint(cx: number, height: number) {
    this.add
      .text(cx, height * 0.92, "[R] Rejouer   [Q] Menu", {
        fontSize: "13px",
        fontFamily: FONT.ui,
        color: COLOR.textMuted,
      })
      .setAlpha(0.6)
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
  }

  private doReplay() {
    this.scene.stop("GameScene");
    this.scene.start("GameScene");
  }

  private doQuit() {
    this.scene.stop("GameScene");
    this.scene.start("MenuScene", { selectedGameKey: "GameScene" });
  }
}
