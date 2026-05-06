import Phaser from "phaser";
import { COLOR, HEX, FONT, DEPTH } from "../design-system/tokens";

export class UIScene extends Phaser.Scene {
  private scoreLabel!: Phaser.GameObjects.Text;
  private scoreValue!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "UIScene" });
  }

  create() {
    const { width } = this.scale;
    this.buildScorePanel();
    this.buildTimerPanel(width);
    this.game.events.on("score:update", this.onScoreUpdate, this);
    this.game.events.on("timer:update", this.onTimerUpdate, this);
    this.events.once("shutdown", () => {
      this.game.events.off("score:update", this.onScoreUpdate, this);
      this.game.events.off("timer:update", this.onTimerUpdate, this);
    });
  }

  private buildScorePanel() {
    this.drawPanel(14, 10, 180, 48);
    this.scoreLabel = this.add
      .text(24, 16, "SCORE", {
        fontSize: "10px",
        fontFamily: FONT.ui,
        color: COLOR.textMuted,
        letterSpacing: 2,
      })
      .setDepth(DEPTH.topUi);
    this.scoreValue = this.add
      .text(24, 29, "0", {
        fontSize: "22px",
        fontFamily: FONT.identity,
        color: COLOR.brandPrimary,
      })
      .setDepth(DEPTH.topUi);
  }

  private buildTimerPanel(width: number) {
    this.drawPanel(width - 130, 10, 116, 48);
    this.timerText = this.add
      .text(width - 24, 34, "01:00", {
        fontSize: "22px",
        fontFamily: FONT.identity,
        color: COLOR.textPrimary,
      })
      .setOrigin(1, 0.5)
      .setDepth(DEPTH.topUi);
    this.add
      .text(width - 24, 18, "TEMPS", {
        fontSize: "10px",
        fontFamily: FONT.ui,
        color: COLOR.textMuted,
        letterSpacing: 2,
      })
      .setOrigin(1, 0)
      .setDepth(DEPTH.topUi);
  }

  private onScoreUpdate = (score: number): void => {
    this.scoreValue.setText(String(score));
  };

  private onTimerUpdate = (seconds: number): void => {
    const clampedSeconds = Math.max(0, seconds);
    const mm = String(Math.floor(clampedSeconds / 60)).padStart(2, "0");
    const ss = String(clampedSeconds % 60).padStart(2, "0");
    this.timerText.setText(`${mm}:${ss}`);
    this.timerText.setColor(clampedSeconds <= 10 ? COLOR.danger : COLOR.textPrimary);
  };

  private drawPanel(x: number, y: number, panelWidth: number, panelHeight: number) {
    const gfx = this.add.graphics().setDepth(DEPTH.topUi - 1);
    gfx.fillStyle(HEX.bgSurface, 0.88);
    gfx.fillRect(x, y, panelWidth, panelHeight);
    gfx.lineStyle(1, HEX.brandPrimary, 0.25);
    gfx.strokeRect(x, y, panelWidth, panelHeight);
  }
}
