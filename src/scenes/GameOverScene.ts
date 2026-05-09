import Phaser from "phaser";
import { audioFX } from "../audio/AudioFX";
import { handTracker } from "../camera/HandTracker";
import type { LandmarksPayload } from "../camera/HandTracker";
import { COLOR, HEX, FONT, DEPTH } from "../design-system/tokens";
import { DwellButton } from "../design-system/DwellButton";
import { HandCursors } from "../design-system/HandCursors";
import { buildGameOverFrame, buildGameOverEmblem, burstConfetti, buildGameOverHeader, drawGameOverScorePanel } from "./GameOverSceneFX";

const PALM_LANDMARK = 9;
const SCORE_COUNT_MAX_MS = 1800;

export class GameOverScene extends Phaser.Scene {
  private cursors!: HandCursors;
  private btnReplay!: DwellButton;
  private handPositions: ({ x: number; y: number } | null)[] = [null, null];

  constructor() {
    super({ key: "GameOverScene" });
  }

  private gameKey = "GameScene";

  create() {
    const { width, height } = this.scale;
    const data = this.scene.settings.data as { score: number; gameName?: string; gameKey?: string };
    const score = data?.score ?? 0;
    const gameName = data?.gameName ?? "ATTRAPE-LES TOUS";
    this.gameKey = data?.gameKey ?? "GameScene";
    const cx = width / 2;

    this.handPositions = [null, null];

    const previousBest = parseInt(localStorage.getItem("eyetoy_best") ?? "0", 10);
    const best = Math.max(score, previousBest);
    const isBest = score >= previousBest && score > 0;
    localStorage.setItem("eyetoy_best", String(best));

    this.sound.play("sfx-win", { volume: 0.7 });
    this.add.rectangle(cx, height / 2, width, height, HEX.bgCanvas, 0.72).setDepth(DEPTH.bg);

    buildGameOverFrame(this, width, height);
    buildGameOverHeader(this, cx, height, { isBest, gameName });
    this.buildReplayButton(cx, height);
    this.buildScoreSection(cx, height, { score, best, isBest });

    this.cursors = new HandCursors(this, DEPTH.cursor);
    handTracker.start({ targetFps: 30 });
    handTracker.on("landmarks", this.onLandmarks);
    this.events.once("shutdown", () => handTracker.off("landmarks", this.onLandmarks));

    this.input.keyboard!.on("keydown-R", () => { audioFX.pop(); this.doReplay(); });
    this.input.keyboard!.on("keydown-Q", () => this.doQuit());

    this.buildKeyboardHint(cx, height);
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

  private buildScoreSection(cx: number, height: number, opts: { score: number; best: number; isBest: boolean }) {
    const { score, best, isBest } = opts;
    const panelY = height * 0.66;
    const panelW = Math.min(660, this.scale.width * 0.76);
    const panelH = height * 0.34;

    drawGameOverScorePanel(this, { cx, panelY, panelW, panelH });
    buildGameOverEmblem(this, cx, panelY - panelH * 0.40);
    this.buildScoreCountdown(cx, panelY, panelH, score);
    this.buildScoreFooter(cx, { panelY, panelH, best, isBest });
  }

  private buildScoreCountdown(cx: number, panelY: number, panelH: number, score: number): void {
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
        fontFamily: FONT.display,
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
      onUpdate: (tween) => scoreText.setText(String(Math.round(tween.getValue() ?? 0))),
    });
  }

  private buildScoreFooter(cx: number, opts: { panelY: number; panelH: number; best: number; isBest: boolean }): void {
    const { panelY, panelH, best, isBest } = opts;
    this.add
      .text(cx, panelY + panelH * 0.32, isBest ? "NOUVEAU MEILLEUR SCORE" : `MEILLEUR : ${best} pts`, {
        fontSize: isBest ? "24px" : "21px",
        fontFamily: FONT.display,
        color: COLOR.success,
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
      this.time.delayedCall(220, () => burstConfetti(this, cx, panelY + panelH * 0.30));
      this.tweens.add({ targets: footer, alpha: 0.55, duration: 680, yoyo: true, repeat: -1, ease: "Sine.InOut" });
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
    this.scene.stop(this.gameKey);
    this.scene.start(this.gameKey);
  }

  private doQuit() {
    this.scene.stop(this.gameKey);
    this.scene.start("MenuScene", { selectedGameKey: this.gameKey });
  }
}
