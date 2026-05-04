import Phaser from "phaser";

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  create() {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2, "Hello World", {
        fontSize: "64px",
        color: "#ffffff",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);
  }
}
