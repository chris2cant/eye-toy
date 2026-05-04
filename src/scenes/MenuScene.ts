import Phaser from "phaser";
import { handTracker } from "../camera/HandTracker";
import type { LandmarksPayload } from "../camera/HandTracker";
import { AudioFX } from "../audio/AudioFX";
import { COLOR, HEX, FONT, DEPTH } from "../design-system/tokens";
import { DwellButton } from "../design-system/DwellButton";
import { HandCursors } from "../design-system/HandCursors";

const PALM_LANDMARK = 9;

export class MenuScene extends Phaser.Scene {
  private webcamTex: Phaser.Textures.CanvasTexture | null = null;
  private cursors!: HandCursors;
  private btn!: DwellButton;
  private handPositions: ({ x: number; y: number } | null)[] = [null, null];

  constructor() {
    super({ key: "MenuScene" });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const best = parseInt(localStorage.getItem("eyetoy_best") ?? "0", 10);

    this.handPositions = [null, null];

    this.setupWebcam(width, height);

    // Overlay semi-transparent
    this.add
      .rectangle(cx, height / 2, width, height, HEX.bgCanvas, 0.6)
      .setDepth(DEPTH.bg);

    this.drawHudDecorations(width, height);

    // Titre
    this.add
      .text(cx, height * 0.17, "EYE TOY", {
        fontSize: "88px",
        fontFamily: FONT.identity,
        fontStyle: "900",
        color: COLOR.brandPrimary,
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: COLOR.brandPrimary,
          blur: 24,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    // Sous-titre
    this.add
      .text(cx, height * 0.28, "Attrape les ronds avec tes mains !", {
        fontSize: "20px",
        fontFamily: FONT.ui,
        color: COLOR.textSecondary,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    // Règles
    this.addRuleRow(cx, height * 0.39, "+10 pts", "par rond attrapé", COLOR.success);
    this.addRuleRow(cx, height * 0.47, "−5 pts", "si un rond expire", COLOR.danger);

    // Meilleur score
    if (best > 0) {
      this.addScorePill(cx, height * 0.59, best);
    }

    // Bouton JOUER
    this.btn = new DwellButton(
      this,
      cx,
      height * 0.73,
      "  JOUER  →",
      () => {
        AudioFX.pop();
        this.doStart();
      },
      { depth: DEPTH.hud },
    );

    // Indice dwell
    this.add
      .text(cx, height * 0.73 + this.btn.height / 2 + 22, "✋  Maintiens la main sur le bouton", {
        fontSize: "16px",
        fontFamily: FONT.ui,
        color: COLOR.textMuted,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    this.cursors = new HandCursors(this, DEPTH.cursor);
    this.setupHandTracking();
  }

  private addRuleRow(cx: number, y: number, value: string, label: string, color: string) {
    const g = this.add.graphics().setDepth(DEPTH.hud);
    const panelW = 320;
    const panelH = 38;
    g.fillStyle(HEX.bgElevated, 0.85);
    g.fillRect(cx - panelW / 2, y - panelH / 2, panelW, panelH);
    g.lineStyle(1, HEX.bgSurface, 1);
    g.strokeRect(cx - panelW / 2, y - panelH / 2, panelW, panelH);

    this.add
      .text(cx - 100, y, value, {
        fontSize: "18px",
        fontFamily: FONT.identity,
        color,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    this.add
      .text(cx + 30, y, label, {
        fontSize: "15px",
        fontFamily: FONT.ui,
        color: COLOR.textSecondary,
      })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud);
  }

  private addScorePill(cx: number, y: number, best: number) {
    const g = this.add.graphics().setDepth(DEPTH.hud);
    const panelW = 300;
    const panelH = 42;
    g.fillStyle(HEX.bgElevated, 0.9);
    g.fillRect(cx - panelW / 2, y - panelH / 2, panelW, panelH);
    g.lineStyle(1.5, HEX.warning, 0.6);
    g.strokeRect(cx - panelW / 2, y - panelH / 2, panelW, panelH);

    this.add
      .text(cx - 30, y, "MEILLEUR", {
        fontSize: "11px",
        fontFamily: FONT.ui,
        color: COLOR.textMuted,
        letterSpacing: 2,
      })
      .setOrigin(1, 0.5)
      .setDepth(DEPTH.hud);

    this.add
      .text(cx - 20, y, `${best} pts`, {
        fontSize: "20px",
        fontFamily: FONT.identity,
        color: COLOR.warning,
      })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud);
  }

  private drawHudDecorations(width: number, height: number) {
    const g = this.add.graphics().setDepth(DEPTH.bg);

    // Réticule coin haut-gauche
    const drawReticle = (x: number, y: number, r: number, alpha: number) => {
      g.lineStyle(1, HEX.brandPrimary, alpha);
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.strokePath();

      // Croix centrale
      g.lineStyle(1, HEX.brandPrimary, alpha * 0.6);
      g.beginPath();
      g.moveTo(x - r * 0.35, y);
      g.lineTo(x + r * 0.35, y);
      g.strokePath();
      g.beginPath();
      g.moveTo(x, y - r * 0.35);
      g.lineTo(x, y + r * 0.35);
      g.strokePath();
    };

    drawReticle(width * 0.08, height * 0.12, 48, 0.18);
    drawReticle(width * 0.08, height * 0.12, 32, 0.12);
    drawReticle(width * 0.92, height * 0.12, 48, 0.18);
    drawReticle(width * 0.92, height * 0.12, 32, 0.12);

    // Ligne horizontale subtile en bas
    g.lineStyle(1, HEX.brandPrimary, 0.08);
    g.beginPath();
    g.moveTo(width * 0.1, height * 0.88);
    g.lineTo(width * 0.9, height * 0.88);
    g.strokePath();
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
      .setDepth(DEPTH.webcam)
      .setAlpha(0.35);
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

    this.cursors.update(this.handPositions);
    this.btn.update(this.handPositions, delta);
  }

  private doStart() {
    this.scene.start("GameScene");
  }
}
