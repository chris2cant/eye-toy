import Phaser from "phaser";
import { GameScene } from "./GameScene";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {}

  create() {
    this.scene.start("GameScene");
  }
}
