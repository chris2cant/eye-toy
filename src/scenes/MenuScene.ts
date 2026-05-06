import Phaser from "phaser";
import { handTracker } from "../camera/HandTracker";
import type { LandmarksPayload } from "../camera/HandTracker";
import { audioFX } from "../audio/AudioFX";
import { COLOR, HEX, FONT, DEPTH } from "../design-system/tokens";
import { DwellButton } from "../design-system/DwellButton";
import { HandCursors } from "../design-system/HandCursors";

const PALM_LANDMARK = 9;

interface GameEntry {
  key: string;
  name: string;
  desc: string;
  tag: string;
}

const GAMES: GameEntry[] = [
  {
    key: "GameScene",
    name: "Attrape les tous",
    desc: "Attrape les ronds avec tes mains\navant qu'ils disparaissent !",
    tag: "ACTION",
  },
  {
    key: "SableMagiqueScene",
    name: "Sable Magique",
    desc: "Bouge les mains et regarde le sable\nsuivre chacun de tes gestes.",
    tag: "RELAXANT",
  },
  {
    key: "SkeletonScene",
    name: "Squelette",
    desc: "Visualisation filaire de ton corps\nen temps réel par MediaPipe.",
    tag: "DÉMO",
  },
  {
    key: "JeuDeFicelleScene",
    name: "Jeu de Ficelle",
    desc: "Tends tes deux mains et crée\ndes cordes lumineuses entre tes doigts.",
    tag: "LUMIÈRE",
  },
];

export class MenuScene extends Phaser.Scene {
  private webcamTex: Phaser.Textures.CanvasTexture | null = null;
  private cursors!: HandCursors;
  private btnPrev!: DwellButton;
  private btnNext!: DwellButton;
  private btnSelect!: DwellButton;
  private allBtns: DwellButton[] = [];
  private handPositions: ({ x: number; y: number } | null)[] = [null, null];
  private currentIndex = 0;

  private cardGfx!: Phaser.GameObjects.Graphics;
  private cardTag!: Phaser.GameObjects.Text;
  private cardTitle!: Phaser.GameObjects.Text;
  private cardDesc!: Phaser.GameObjects.Text;
  private dots: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: "MenuScene" });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    this.currentIndex = 0;
    this.handPositions = [null, null];

    this.setupWebcam(width, height);
    this.add.rectangle(cx, height / 2, width, height, HEX.bgCanvas, 0.65).setDepth(DEPTH.bg);
    this.drawHudDecorations(width, height);

    this.add
      .text(cx, height * 0.10, "EYE TOY", {
        fontSize: "72px",
        fontFamily: FONT.identity,
        fontStyle: "900",
        color: COLOR.brandPrimary,
        shadow: { offsetX: 0, offsetY: 0, color: COLOR.brandPrimary, blur: 24, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    this.buildButtons(width, height, cx);
    this.buildCard(width, height, cx);
    this.buildDots(width, height, cx);

    const best = parseInt(localStorage.getItem("eyetoy_best") ?? "0", 10);
    if (best > 0) this.addScorePill(cx, height * 0.84, best);

    this.updateCard();

    this.cursors = new HandCursors(this, DEPTH.cursor);
    this.setupHandTracking();
  }

  private buildButtons(width: number, height: number, cx: number) {
    const btnY = height * 0.30;

    this.btnPrev = new DwellButton(this, width * 0.10, btnY, {
      label: "◀",
      fontSize: "28px",
      onActivate: () => { this.navigate(-1); this.btnPrev.reset(); },
      depth: DEPTH.hud,
      dwellMs: 900,
    });

    this.btnSelect = new DwellButton(this, cx, btnY, {
      label: "  JOUER  →",
      onActivate: () => { audioFX.pop(); this.doStart(); },
      depth: DEPTH.hud,
    });

    this.btnNext = new DwellButton(this, width * 0.90, btnY, {
      label: "▶",
      fontSize: "28px",
      onActivate: () => { this.navigate(1); this.btnNext.reset(); },
      depth: DEPTH.hud,
      dwellMs: 900,
    });

    this.allBtns = [this.btnPrev, this.btnSelect, this.btnNext];

    this.add
      .text(cx, height * 0.30 + 52, "✋  Agite la main sur le bouton", {
        fontSize: "15px",
        fontFamily: FONT.ui,
        color: COLOR.textMuted,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
  }

  private buildCard(width: number, height: number, cx: number) {
    const cardW = Math.min(480, width * 0.55);
    const cardH = 160;
    const cardCy = height * 0.55;

    this.cardGfx = this.add.graphics().setDepth(DEPTH.hud - 1);

    this.cardTag = this.add
      .text(cx, cardCy - 54, "", {
        fontSize: "10px",
        fontFamily: FONT.ui,
        color: COLOR.brandPrimary,
        letterSpacing: 3,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    this.cardTitle = this.add
      .text(cx, cardCy - 18, "", {
        fontSize: "36px",
        fontFamily: FONT.identity,
        fontStyle: "700",
        color: COLOR.textPrimary,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    this.cardDesc = this.add
      .text(cx, cardCy + 36, "", {
        fontSize: "15px",
        fontFamily: FONT.ui,
        color: COLOR.textSecondary,
        align: "center",
        lineSpacing: 4,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    this._cardW = cardW;
    this._cardH = cardH;
    this._cardCy = cardCy;
  }

  private _cardW = 480;
  private _cardH = 160;
  private _cardCy = 0;

  private buildDots(width: number, height: number, cx: number) {
    this.dots = [];
    const spacing = 22;
    const startX = cx - ((GAMES.length - 1) * spacing) / 2;
    for (let i = 0; i < GAMES.length; i++) {
      const dot = this.add
        .text(startX + i * spacing, height * 0.72, "●", {
          fontSize: "12px",
          fontFamily: FONT.ui,
          color: COLOR.textMuted,
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.hud);
      this.dots.push(dot);
    }
  }

  private updateCard() {
    const game = GAMES[this.currentIndex];
    const { width } = this.scale;
    const cx = width / 2;

    this.cardGfx.clear();
    this.cardGfx.fillStyle(HEX.bgElevated, 0.92);
    this.cardGfx.fillRect(cx - this._cardW / 2, this._cardCy - this._cardH / 2, this._cardW, this._cardH);
    this.cardGfx.lineStyle(1.5, HEX.brandPrimary, 0.5);
    this.cardGfx.strokeRect(cx - this._cardW / 2, this._cardCy - this._cardH / 2, this._cardW, this._cardH);

    // Corner accents
    const cw = this._cardW / 2;
    const ch = this._cardH / 2;
    const accent = 12;
    this.cardGfx.lineStyle(2.5, HEX.brandPrimary, 1);
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const ox = cx + sx * cw;
      const oy = this._cardCy + sy * ch;
      this.cardGfx.beginPath();
      this.cardGfx.moveTo(ox, oy + sy * accent);
      this.cardGfx.lineTo(ox, oy);
      this.cardGfx.lineTo(ox - sx * accent, oy);
      this.cardGfx.strokePath();
    }

    this.cardTag.setText(game.tag);
    this.cardTitle.setText(game.name);
    this.cardDesc.setText(game.desc);

    this.dots.forEach((dot, i) => {
      dot.setColor(i === this.currentIndex ? COLOR.brandPrimary : COLOR.textMuted);
      dot.setFontSize(i === this.currentIndex ? "18px" : "12px");
    });
  }

  private navigate(dir: number) {
    this.currentIndex = (this.currentIndex + dir + GAMES.length) % GAMES.length;
    this.updateCard();
  }

  private addScorePill(cx: number, y: number, best: number) {
    const gfx = this.add.graphics().setDepth(DEPTH.hud);
    const panelW = 300;
    const panelH = 42;
    gfx.fillStyle(HEX.bgElevated, 0.9);
    gfx.fillRect(cx - panelW / 2, y - panelH / 2, panelW, panelH);
    gfx.lineStyle(1.5, HEX.warning, 0.6);
    gfx.strokeRect(cx - panelW / 2, y - panelH / 2, panelW, panelH);

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
    const gfx = this.add.graphics().setDepth(DEPTH.bg);

    const drawReticle = (x: number, y: number, radius: number, alpha: number) => {
      gfx.lineStyle(1, HEX.brandPrimary, alpha);
      gfx.beginPath();
      gfx.arc(x, y, radius, 0, Math.PI * 2);
      gfx.strokePath();
      gfx.lineStyle(1, HEX.brandPrimary, alpha * 0.6);
      gfx.beginPath();
      gfx.moveTo(x - radius * 0.35, y);
      gfx.lineTo(x + radius * 0.35, y);
      gfx.strokePath();
      gfx.beginPath();
      gfx.moveTo(x, y - radius * 0.35);
      gfx.lineTo(x, y + radius * 0.35);
      gfx.strokePath();
    };

    drawReticle(width * 0.08, height * 0.12, 48, 0.18);
    drawReticle(width * 0.08, height * 0.12, 32, 0.12);
    drawReticle(width * 0.92, height * 0.12, 48, 0.18);
    drawReticle(width * 0.92, height * 0.12, 32, 0.12);

    gfx.lineStyle(1, HEX.brandPrimary, 0.08);
    gfx.beginPath();
    gfx.moveTo(width * 0.1, height * 0.90);
    gfx.lineTo(width * 0.9, height * 0.90);
    gfx.strokePath();
  }

  private setupWebcam(width: number, height: number) {
    const videoEl = handTracker.getVideoEl();
    if (!videoEl) return;
    if (this.textures.exists("webcam-menu")) this.textures.remove("webcam-menu");
    const tex = this.textures.createCanvas("webcam-menu", width, height);
    if (!tex) return;
    this.webcamTex = tex;
    this.add.image(width / 2, height / 2, "webcam-menu").setDepth(DEPTH.webcam).setAlpha(0.30);
  }

  private onLandmarks = ({ hands }: LandmarksPayload): void => {
    const { width: screenWidth, height: screenHeight } = this.scale;
    this.handPositions = [null, null];
    hands.forEach((hand, i) => {
      if (!hand || hand.length === 0) return;
      const lm = hand[PALM_LANDMARK];
      this.handPositions[i] = { x: (1 - lm.x) * screenWidth, y: lm.y * screenHeight };
    });
  };

  private attachHandTracking() {
    handTracker.on("landmarks", this.onLandmarks);
    this.events.once("shutdown", () => handTracker.off("landmarks", this.onLandmarks));
  }

  private setupHandTracking() {
    if (handTracker.isInitialized) {
      this.attachHandTracking();
      return;
    }
    void (async () => {
      try {
        await handTracker.initCamera();
        await handTracker.initDetector();
        const { width, height } = this.scale;
        this.setupWebcam(width, height);
        handTracker.start();
        this.attachHandTracking();
      } catch (err) {
        console.warn("[MenuScene] caméra non disponible:", err);
      }
    })();
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
    this.allBtns.forEach((btn) => btn.update(this.handPositions, delta));
  }

  private doStart() {
    this.scene.start(GAMES[this.currentIndex].key);
  }
}
