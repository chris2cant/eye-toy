import Phaser from "phaser";
import { preloadMusic } from "../audio/music";
import { handTracker } from "../camera/HandTracker";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    this.load.audio("sfx-punch",                      "/assets/audio/sfx-punch.mp3");
    this.load.audio("sfx-woosh-hand",                 "/assets/audio/sfx-woosh-hand.mp3");
    this.load.audio("sfx-electricity",                "/assets/audio/sfx-electricity.mp3");
    this.load.audio("sfx-win",                        "/assets/audio/sfx-win.mp3");
    this.load.audio("sfx-loose",                      "/assets/audio/sfx-loose.mp3");
  }

  async create() {
    await Promise.all([
      document.fonts.load('600 1em Fredoka'),
      document.fonts.load('700 1em Fredoka'),
      document.fonts.load('600 1em "Nunito Sans"'),
      document.fonts.load('700 1em "Nunito Sans"'),
      document.fonts.load('800 1em "Nunito Sans"'),
    ]);
    const params = new URLSearchParams(window.location.search);
    if (params.has("ds")) {
      this.scene.start("DesignSystemScene");
    } else {
      this.scene.launch("DebugScene");
      this.scene.start("MenuScene");
      preloadMusic(this.game);
      handTracker.initDetector().catch((err: unknown) => console.warn("[BootScene] préchargement du modèle main échoué:", err));
    }
  }
}
