import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    this.load.audio("music-background-funny-cartoon", "/assets/audio/music-background-funny-cartoon.mp3");
    this.load.audio("music-background-ninja-fight",   "/assets/audio/music-background-ninja-fight.mp3");
    this.load.audio("music-background-runner",        "/assets/audio/music-background-runner.mp3");
    this.load.audio("sfx-punch",                      "/assets/audio/sfx-punch.mp3");
    this.load.audio("sfx-woosh-hand",                 "/assets/audio/sfx-woosh-hand.mp3");
    this.load.audio("sfx-electricity",                "/assets/audio/sfx-electricity.mp3");
    this.load.audio("sfx-win",                        "/assets/audio/sfx-win.mp3");
    this.load.audio("sfx-loose",                      "/assets/audio/sfx-loose.mp3");
  }

  async create() {
    await document.fonts.ready;
    const params = new URLSearchParams(window.location.search);
    if (params.has("ds")) {
      this.scene.start("DesignSystemScene");
    } else {
      this.scene.launch("DebugScene");
      this.scene.start("MenuScene");
    }
  }
}
