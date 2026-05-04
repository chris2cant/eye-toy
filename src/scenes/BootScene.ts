import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {}

  async create() {
    await document.fonts.ready;
    this.scene.start("MenuScene");
  }
}
