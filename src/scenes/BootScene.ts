import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    this.load.audio("music-background-funny-cartoon", "/assets/audio/music-background-funny-cartoon.mp3");
  }

  async create() {
    await document.fonts.ready;
    this.scene.launch("DebugScene");
    this.scene.start("MenuScene");
  }
}
