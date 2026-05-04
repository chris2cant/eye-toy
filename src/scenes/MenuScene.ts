import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const best = parseInt(localStorage.getItem("eyetoy_best") ?? "0", 10);

    this.add.rectangle(cx, height / 2, width, height, 0x000000, 0.55);

    this.add
      .text(cx, height * 0.18, "EYE TOY", {
        fontSize: "80px",
        fontFamily: "monospace",
        color: "#00ff88",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(
        cx,
        height * 0.38,
        "Attrape les ronds avec tes mains !\n+10 pts par rond attrapé\n-5 pts si un rond expire",
        {
          fontSize: "26px",
          fontFamily: "monospace",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 3,
          align: "center",
          lineSpacing: 10,
        },
      )
      .setOrigin(0.5);

    if (best > 0) {
      this.add
        .text(cx, height * 0.58, `Meilleur score : ${best}`, {
          fontSize: "28px",
          fontFamily: "monospace",
          color: "#ffdd00",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5);
    }

    const btn = this.add
      .text(cx, height * 0.73, "  JOUER  ", {
        fontSize: "48px",
        fontFamily: "monospace",
        color: "#ffffff",
        backgroundColor: "#226622",
        stroke: "#000000",
        strokeThickness: 4,
        padding: { x: 28, y: 14 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on("pointerover", () => btn.setStyle({ backgroundColor: "#338833" }));
    btn.on("pointerout", () => btn.setStyle({ backgroundColor: "#226622" }));
    btn.on("pointerdown", () => this.scene.start("GameScene"));
  }
}
