import Phaser from "phaser";

const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: "36px",
  fontFamily: "monospace",
  color: "#ffffff",
  stroke: "#000000",
  strokeThickness: 4,
};

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "UIScene" });
  }

  create() {
    const { width } = this.scale;

    this.scoreText = this.add.text(20, 16, "Score : 0", TEXT_STYLE).setDepth(20);
    this.timerText = this.add
      .text(width - 20, 16, "01:00", TEXT_STYLE)
      .setOrigin(1, 0)
      .setDepth(20);

    this.game.events.on("score:update", (score: number) => {
      this.scoreText.setText(`Score : ${score}`);
    });

    this.game.events.on("timer:update", (seconds: number) => {
      const s = Math.max(0, seconds);
      const mm = String(Math.floor(s / 60)).padStart(2, "0");
      const ss = String(s % 60).padStart(2, "0");
      this.timerText.setText(`${mm}:${ss}`);
    });
  }
}
