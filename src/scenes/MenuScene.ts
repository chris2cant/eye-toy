import Phaser from "phaser";
import { handTracker } from "../camera/HandTracker";
import type { LandmarksPayload } from "../camera/HandTracker";
import { AudioFX } from "../audio/AudioFX";

const PALM_LANDMARK = 9;
const DWELL_MS = 1500;
const DWELL_DRAIN_MS = 600;
const DWELL_ZONE_PAD = 60;

export class MenuScene extends Phaser.Scene {
  private webcamTex: Phaser.Textures.CanvasTexture | null = null;
  private handCursors: Phaser.GameObjects.Arc[] = [];
  private dwellGraphics!: Phaser.GameObjects.Graphics;
  private btn!: Phaser.GameObjects.Text;
  private dwellProgress = 0;
  private dwellActivated = false;
  private handPositions: ({ x: number; y: number } | null)[] = [null, null];

  constructor() {
    super({ key: "MenuScene" });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const best = parseInt(localStorage.getItem("eyetoy_best") ?? "0", 10);

    this.dwellProgress = 0;
    this.dwellActivated = false;
    this.handPositions = [null, null];

    // Flux webcam en fond (disponible si on revient du jeu)
    this.setupWebcam(width, height);

    // Overlay sombre
    this.add.rectangle(cx, height / 2, width, height, 0x000000, 0.5).setDepth(1);

    this.add
      .text(cx, height * 0.18, "EYE TOY", {
        fontSize: "80px",
        fontFamily: "monospace",
        color: "#00ff88",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(2);

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
      .setOrigin(0.5)
      .setDepth(2);

    if (best > 0) {
      this.add
        .text(cx, height * 0.58, `Meilleur score : ${best}`, {
          fontSize: "28px",
          fontFamily: "monospace",
          color: "#ffdd00",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(2);
    }

    this.btn = this.add
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
      .setDepth(2)
      .setInteractive({ useHandCursor: true });

    this.btn.on("pointerover", () => this.btn.setStyle({ backgroundColor: "#338833" }));
    this.btn.on("pointerout", () => this.btn.setStyle({ backgroundColor: "#226622" }));
    this.btn.on("pointerdown", () => this.doStart());

    // Indice visuel dwell
    this.add
      .text(cx, height * 0.73 + 68, "✋  Maintiens ta main sur le bouton", {
        fontSize: "18px",
        fontFamily: "monospace",
        color: "#aaaaaa",
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.dwellGraphics = this.add.graphics().setDepth(3);

    this.handCursors = [0x00ff88, 0x00aaff].map((color) =>
      this.add.circle(0, 0, 24, color, 0.8).setDepth(4).setVisible(false),
    );

    this.setupHandTracking();
  }

  private setupWebcam(width: number, height: number) {
    const videoEl = handTracker.getVideoEl();
    if (!videoEl) return;

    if (this.textures.exists("webcam-menu")) this.textures.remove("webcam-menu");
    const tex = this.textures.createCanvas("webcam-menu", width, height);
    if (!tex) return;
    this.webcamTex = tex;
    this.add
      .image(width / 2, height / 2, "webcam-menu")
      .setDepth(0)
      .setAlpha(0.45);
  }

  private setupHandTracking() {
    const onLandmarks = ({ hands }: LandmarksPayload) => {
      const { width: w, height: h } = this.scale;
      this.handPositions = [null, null];
      hands.forEach((hand, i) => {
        if (!hand || hand.length === 0) return;
        const lm = hand[PALM_LANDMARK];
        this.handPositions[i] = { x: (1 - lm.x) * w, y: lm.y * h };
      });
    };

    const attach = () => {
      handTracker.on("landmarks", onLandmarks);
      this.events.once("shutdown", () => handTracker.off("landmarks", onLandmarks));
    };

    if (handTracker.isInitialized) {
      attach();
    } else {
      (async () => {
        try {
          await handTracker.initCamera();
          await handTracker.initDetector();
          // Webcam disponible maintenant — setup canvas
          const { width, height } = this.scale;
          this.setupWebcam(width, height);
          handTracker.start();
          attach();
        } catch (err) {
          console.warn("[MenuScene] caméra non disponible:", err);
        }
      })();
    }
  }

  update(_time: number, delta: number) {
    // Dessin du flux webcam
    const videoEl = handTracker.getVideoEl();
    if (this.webcamTex && videoEl && videoEl.readyState >= 2) {
      const { width, height } = this.scale;
      const ctx = this.webcamTex.getContext();
      const vw = videoEl.videoWidth;
      const vh = videoEl.videoHeight;
      if (vw && vh) {
        const scale = Math.max(width / vw, height / vh);
        const srcW = width / scale;
        const srcH = height / scale;
        ctx.save();
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoEl, (vw - srcW) / 2, (vh - srcH) / 2, srcW, srcH, 0, 0, width, height);
        ctx.restore();
        this.webcamTex.refresh();
      }
    }

    // Curseurs mains
    this.handPositions.forEach((pos, i) => {
      const cursor = this.handCursors[i];
      if (!pos) { cursor.setVisible(false); return; }
      cursor.setPosition(pos.x, pos.y).setVisible(true);
    });

    // Zone de survol élargie autour du bouton
    const bounds = this.btn.getBounds();
    const hitZone = new Phaser.Geom.Rectangle(
      bounds.x - DWELL_ZONE_PAD,
      bounds.y - DWELL_ZONE_PAD,
      bounds.width + DWELL_ZONE_PAD * 2,
      bounds.height + DWELL_ZONE_PAD * 2,
    );

    const handOverButton = this.handPositions.some(
      (pos) => pos !== null && hitZone.contains(pos.x, pos.y),
    );

    if (handOverButton && !this.dwellActivated) {
      this.dwellProgress = Math.min(1, this.dwellProgress + delta / DWELL_MS);
      if (this.dwellProgress >= 1) {
        this.dwellActivated = true;
        AudioFX.pop();
        this.doStart();
      }
    } else if (!handOverButton) {
      this.dwellProgress = Math.max(0, this.dwellProgress - delta / DWELL_DRAIN_MS);
    }

    this.drawDwellRing(bounds, this.dwellProgress);
    this.btn.setStyle({ backgroundColor: handOverButton ? "#338833" : "#226622" });
  }

  private drawDwellRing(bounds: Phaser.Geom.Rectangle, progress: number) {
    this.dwellGraphics.clear();
    if (progress <= 0) return;

    const cx = bounds.centerX;
    const cy = bounds.centerY;
    const r = Math.max(bounds.width, bounds.height) / 2 + 20;

    // Fond de l'anneau
    this.dwellGraphics.lineStyle(6, 0xffffff, 0.2);
    this.dwellGraphics.beginPath();
    this.dwellGraphics.arc(cx, cy, r, 0, Math.PI * 2);
    this.dwellGraphics.strokePath();

    // Arc de progression
    const color = progress >= 1 ? 0x00ff00 : 0x00ff88;
    this.dwellGraphics.lineStyle(6, color, 0.95);
    this.dwellGraphics.beginPath();
    this.dwellGraphics.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    this.dwellGraphics.strokePath();
  }

  private doStart() {
    this.scene.start("GameScene");
  }
}
