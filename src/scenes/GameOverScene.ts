import Phaser from "phaser";
import { audioFX } from "../audio/AudioFX";
import { handTracker } from "../camera/HandTracker";
import type { LandmarksPayload } from "../camera/HandTracker";
import { COLOR, HEX, FONT, DEPTH } from "../design-system/tokens";
import { DwellButton } from "../design-system/DwellButton";
import { HandCursors } from "../design-system/HandCursors";

const PALM_LANDMARK = 9;

export class GameOverScene extends Phaser.Scene {
  private cursors!: HandCursors;
  private btn!: DwellButton;
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

    const best = Math.max(score, parseInt(localStorage.getItem("eyetoy_best") ?? "0", 10));
    localStorage.setItem("eyetoy_best", String(best));

    audioFX.gameOver();

    this.add.rectangle(cx, height / 2, width, height, HEX.bgCanvas, 0.72).setDepth(DEPTH.bg);

    this.buildHeader(cx, height);
    this.buildReplayButton(cx, height);
    this.buildScoreSection(cx, height, score, best);

    this.cursors = new HandCursors(this, DEPTH.cursor);
    handTracker.on("landmarks", this.onLandmarks);
    this.events.once("shutdown", () => handTracker.off("landmarks", this.onLandmarks));

    this.input.keyboard!.on("keydown-R", () => { audioFX.pop(); this.doReplay(); });
    this.input.keyboard!.on("keydown-Q", () => this.doQuit());

    this.buildKeyboardHint(cx, height);
  }

  private buildHeader(cx: number, height: number) {
    this.add
      .text(cx, height * 0.14, "GAME OVER", {
        fontSize: "72px",
        fontFamily: FONT.identity,
        fontStyle: "900",
        color: COLOR.danger,
        shadow: { offsetX: 0, offsetY: 0, color: COLOR.danger, blur: 20, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
  }

  private buildReplayButton(cx: number, height: number) {
    this.btn = new DwellButton(this, cx, height * 0.30, {
      label: "  REJOUER  →",
      onActivate: () => { audioFX.pop(); this.doReplay(); },
      depth: DEPTH.hud,
    });

    this.add
      .text(cx, height * 0.30 + this.btn.height / 2 + 22, "✋  Agite la main sur le bouton", {
        fontSize: "16px",
        fontFamily: FONT.ui,
        color: COLOR.textMuted,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    const sepG = this.add.graphics().setDepth(DEPTH.hud);
    sepG.lineStyle(1, HEX.brandPrimary, 0.3);
    sepG.beginPath();
    sepG.moveTo(cx - 140, height * 0.50);
    sepG.lineTo(cx + 140, height * 0.50);
    sepG.strokePath();
  }

  private buildScoreSection(cx: number, height: number, score: number, best: number) {
    this.add
      .text(cx, height * 0.56, "SCORE", {
        fontSize: "11px",
        fontFamily: FONT.ui,
        color: COLOR.textMuted,
        letterSpacing: 3,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    this.add
      .text(cx, height * 0.65, `${score}`, {
        fontSize: "64px",
        fontFamily: FONT.identity,
        color: COLOR.textPrimary,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    const isBest = score >= best && score > 0;
    this.add
      .text(cx, height * 0.79, isBest ? "★ NOUVEAU RECORD ★" : `MEILLEUR : ${best} pts`, {
        fontSize: isBest ? "22px" : "18px",
        fontFamily: FONT.identity,
        color: COLOR.warning,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
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
    this.btn.update(this.handPositions, delta);
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
    this.scene.start("MenuScene");
  }
}
