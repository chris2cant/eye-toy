import Phaser from "phaser";
import { AudioFX } from "../audio/AudioFX";

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameOverScene" });
  }

  create() {
    const { width, height } = this.scale;
    const data = this.scene.settings.data as { score: number };
    const score = data?.score ?? 0;

    const best = Math.max(score, parseInt(localStorage.getItem("eyetoy_best") ?? "0", 10));
    localStorage.setItem("eyetoy_best", String(best));

    AudioFX.gameOver();

    // Fond semi-transparent
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.65).setDepth(0);

    const cx = width / 2;

    this.add
      .text(cx, height * 0.28, "GAME OVER", {
        fontSize: "64px",
        fontFamily: "monospace",
        color: "#ff4444",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(1);

    this.add
      .text(cx, height * 0.45, `Score : ${score}`, {
        fontSize: "48px",
        fontFamily: "monospace",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(1);

    this.add
      .text(cx, height * 0.56, `Meilleur : ${best}`, {
        fontSize: "32px",
        fontFamily: "monospace",
        color: "#ffdd00",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(1);

    const btn = this.add
      .text(cx, height * 0.72, "  REJOUER  ", {
        fontSize: "40px",
        fontFamily: "monospace",
        color: "#ffffff",
        backgroundColor: "#226622",
        stroke: "#000000",
        strokeThickness: 3,
        padding: { x: 20, y: 12 },
      })
      .setOrigin(0.5)
      .setDepth(1)
      .setInteractive({ useHandCursor: true });

    btn.on("pointerover", () => btn.setStyle({ backgroundColor: "#338833" }));
    btn.on("pointerout", () => btn.setStyle({ backgroundColor: "#226622" }));
    btn.on("pointerdown", () => {
      this.scene.start("MenuScene");
    });
  }
}
