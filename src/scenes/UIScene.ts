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

    // Panel score (coin haut-gauche)
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

    // Panel timer (coin haut-droit)
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

    this.game.events.on("score:update", (score: number) => {
      this.scoreValue.setText(String(score));
    });

    this.game.events.on("timer:update", (seconds: number) => {
      const s = Math.max(0, seconds);
      const mm = String(Math.floor(s / 60)).padStart(2, "0");
      const ss = String(s % 60).padStart(2, "0");
      const timeStr = `${mm}:${ss}`;
      this.timerText.setText(timeStr);
      // Passe en rouge quand il reste peu de temps
      this.timerText.setColor(s <= 10 ? COLOR.danger : COLOR.textPrimary);
    });
  }

  private drawPanel(x: number, y: number, w: number, h: number) {
    const g = this.add.graphics().setDepth(DEPTH.topUi - 1);
    g.fillStyle(HEX.bgSurface, 0.88);
    g.fillRect(x, y, w, h);
    g.lineStyle(1, HEX.brandPrimary, 0.25);
    g.strokeRect(x, y, w, h);
  }
}
