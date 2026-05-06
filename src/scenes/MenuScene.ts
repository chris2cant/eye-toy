import Phaser from "phaser";
import { handTracker } from "../camera/HandTracker";
import type { LandmarksPayload } from "../camera/HandTracker";
import { audioFX } from "../audio/AudioFX";
import { COLOR, HEX, FONT, DEPTH } from "../design-system/tokens";
import { DwellButton } from "../design-system/DwellButton";
import { HandCursors } from "../design-system/HandCursors";

const PALM_LANDMARK = 9;
const MENU_TRACKER_FPS = 20;
const MENU_WEBCAM_FPS = 15;
const MENU_WEBCAM_FRAME_MS = 1000 / MENU_WEBCAM_FPS;

interface GameEntry {
  key: string;
  name: string;
  desc: string;
  tag: string;
  icon: string;
  accent: number;
  accentColor: string;
}

const GAMES: GameEntry[] = [
  {
    key: "GameScene",
    name: "Attrape les tous",
    desc: "Attrape les ronds avec tes mains\navant qu'ils disparaissent !",
    tag: "ACTION",
    icon: "HAND",
    accent: HEX.brandPrimary,
    accentColor: COLOR.brandPrimary,
  },
  {
    key: "SableMagiqueScene",
    name: "Sable Magique",
    desc: "Bouge les mains et regarde le sable\nsuivre chacun de tes gestes.",
    tag: "RELAXANT",
    icon: "FLOW",
    accent: HEX.success,
    accentColor: COLOR.success,
  },
  {
    key: "SkeletonScene",
    name: "Squelette",
    desc: "Visualisation filaire de ton corps\nen temps réel par MediaPipe.",
    tag: "DÉMO",
    icon: "BODY",
    accent: HEX.info,
    accentColor: COLOR.info,
  },
  {
    key: "JeuDeFicelleScene",
    name: "Jeu de Ficelle",
    desc: "Tends tes deux mains et crée\ndes cordes lumineuses entre tes doigts.",
    tag: "LUMIÈRE",
    icon: "LINK",
    accent: HEX.warning,
    accentColor: COLOR.warning,
  },
];

type CarouselCard = {
  container: Phaser.GameObjects.Container;
  frame: Phaser.GameObjects.Graphics;
  tag: Phaser.GameObjects.Text;
  icon: Phaser.GameObjects.Text;
  title: Phaser.GameObjects.Text;
  desc: Phaser.GameObjects.Text;
  activeBadge: Phaser.GameObjects.Text;
};

type MenuSceneData = {
  selectedGameKey?: string;
};

export class MenuScene extends Phaser.Scene {
  private webcamTex: Phaser.Textures.CanvasTexture | null = null;
  private cursors!: HandCursors;
  private btnPrev!: DwellButton;
  private btnNext!: DwellButton;
  private btnSelect!: DwellButton;
  private allBtns: DwellButton[] = [];
  private handPositions: ({ x: number; y: number } | null)[] = [null, null];
  private currentIndex = 0;
  private nextWebcamRenderAt = 0;

  private carouselCards: CarouselCard[] = [];
  private dots: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: "MenuScene" });
  }

  create(data?: MenuSceneData) {
    const { width, height } = this.scale;
    const cx = width / 2;
    this.currentIndex = this.getInitialGameIndex(data?.selectedGameKey);
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
    this.buildCarousel(width, height);
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
      .text(cx, height * 0.30 + 52, "✋  Garde la main sur le bouton", {
        fontSize: "15px",
        fontFamily: FONT.ui,
        color: COLOR.textMuted,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
  }

  private buildCarousel(_width: number, height: number) {
    this.carouselCards = GAMES.map((game) => {
      const container = this.add.container(0, height * 0.56).setDepth(DEPTH.hud);
      const frame = this.add.graphics();
      const tag = this.add
        .text(0, -74, game.tag, {
          fontSize: "12px",
          fontFamily: FONT.ui,
          color: game.accentColor,
          letterSpacing: 3,
        })
        .setOrigin(0.5);
      const icon = this.add
        .text(0, -32, game.icon, {
          fontSize: "26px",
          fontFamily: FONT.identity,
          fontStyle: "800",
          color: game.accentColor,
        })
        .setOrigin(0.5);
      const title = this.add
        .text(0, 16, game.name.toUpperCase(), {
          fontSize: "22px",
          fontFamily: FONT.identity,
          fontStyle: "700",
          color: COLOR.textPrimary,
          align: "center",
        })
        .setOrigin(0.5);
      const desc = this.add
        .text(0, 62, game.desc, {
          fontSize: "13px",
          fontFamily: FONT.ui,
          color: COLOR.textSecondary,
          align: "center",
          lineSpacing: 3,
        })
        .setOrigin(0.5);
      const activeBadge = this.add
        .text(0, 0, "ACTIF", {
          fontSize: "11px",
          fontFamily: FONT.ui,
          fontStyle: "700",
          color: COLOR.bgCanvas,
        })
        .setOrigin(0.5)
        .setVisible(false);

      container.add([frame, tag, icon, title, desc, activeBadge]);
      return { container, frame, tag, icon, title, desc, activeBadge };
    });
  }

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
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height * 0.56;
    const activeW = Math.min(400, Math.max(300, width * 0.26));
    const sideW = Math.min(280, Math.max(190, width * 0.18));
    const activeH = 230;
    const sideH = 174;
    const sideOffsetX = Math.min(340, Math.max(250, width * 0.22));
    const backY = cy + 42;

    this.carouselCards.forEach((card, i) => {
      let offset = i - this.currentIndex;
      if (offset > GAMES.length / 2) offset -= GAMES.length;
      if (offset < -GAMES.length / 2) offset += GAMES.length;

      const active = offset === 0;
      const visible = Math.abs(offset) <= 1;
      const game = GAMES[i];
      const w = active ? activeW : sideW;
      const h = active ? activeH : sideH;
      const x = active ? cx : cx + offset * sideOffsetX;
      const y = active ? cy : backY;
      const alpha = active ? 1 : 0.64;
      const scale = active ? 1 : 0.82;

      this.tweens.killTweensOf(card.container);
      card.container.setVisible(visible).setDepth(DEPTH.hud + (active ? 5 : 1));
      this.tweens.add({
        targets: card.container,
        x,
        y,
        scale,
        alpha: visible ? alpha : 0,
        angle: 0,
        duration: 420,
        ease: "Cubic.easeOut",
      });
      card.tag.setColor(game.accentColor);
      card.icon.setColor(game.accentColor);
      card.title.setFontSize(active ? "24px" : "18px");
      card.desc.setFontSize(active ? "14px" : "11px");
      card.desc.setVisible(active);
      card.activeBadge.setPosition(activeW / 2 - 49, -80).setVisible(active);

      this.drawGameCard(card.frame, w, h, game.accent, active, visible ? alpha : 0);
    });

    this.dots.forEach((dot, i) => {
      dot.setColor(i === this.currentIndex ? COLOR.brandPrimary : COLOR.textMuted);
      dot.setFontSize(i === this.currentIndex ? "18px" : "12px");
    });
  }

  private drawGameCard(
    gfx: Phaser.GameObjects.Graphics,
    w: number,
    h: number,
    accentColor: number,
    active: boolean,
    alpha: number,
  ) {
    const hw = w / 2;
    const hh = h / 2;
    const corner = active ? 18 : 10;

    gfx.clear();
    gfx.fillStyle(HEX.bgElevated, active ? 0.86 : 0.68);
    gfx.fillRect(-hw, -hh, w, h);
    gfx.lineStyle(active ? 2 : 1.5, accentColor, active ? 1 : 0.75 * alpha);
    gfx.strokeRect(-hw, -hh, w, h);

    gfx.lineStyle(active ? 4 : 2, accentColor, active ? 1 : 0.75 * alpha);
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const ox = sx * hw;
      const oy = sy * hh;
      gfx.beginPath();
      gfx.moveTo(ox, oy + sy * corner);
      gfx.lineTo(ox, oy);
      gfx.lineTo(ox - sx * corner, oy);
      gfx.strokePath();
    }

    gfx.lineStyle(1, accentColor, active ? 0.35 : 0.18);
    gfx.beginPath();
    gfx.arc(0, -32, active ? 48 : 38, 0, Math.PI * 2);
    gfx.strokePath();
    gfx.beginPath();
    gfx.arc(0, -32, active ? 30 : 24, 0, Math.PI * 2);
    gfx.strokePath();

    if (!active) return;

    gfx.lineStyle(1, accentColor, 0.5);
    gfx.beginPath();
    gfx.moveTo(-hw + 28, 0);
    gfx.lineTo(-62, 0);
    gfx.moveTo(62, 0);
    gfx.lineTo(hw - 28, 0);
    gfx.strokePath();

    gfx.fillStyle(accentColor, 0.22);
    gfx.fillRect(hw - 76, -hh + 18, 54, 24);
    gfx.lineStyle(1, accentColor, 0.9);
    gfx.strokeRect(hw - 76, -hh + 18, 54, 24);
  }

  private navigate(dir: number) {
    this.currentIndex = (this.currentIndex + dir + GAMES.length) % GAMES.length;
    this.updateCard();
  }

  private getInitialGameIndex(selectedGameKey?: string): number {
    if (!selectedGameKey) return 0;
    const index = GAMES.findIndex((game) => game.key === selectedGameKey);
    return index >= 0 ? index : 0;
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
    void (async () => {
      try {
        await handTracker.initCamera();
        await handTracker.initDetector({ numHands: 2 });
        const { width, height } = this.scale;
        if (!this.webcamTex) this.setupWebcam(width, height);
        handTracker.start({ targetFps: MENU_TRACKER_FPS });
        this.attachHandTracking();
      } catch (err) {
        console.warn("[MenuScene] caméra non disponible:", err);
      }
    })();
  }

  update(time: number, delta: number) {
    const videoEl = handTracker.getVideoEl();
    if (this.webcamTex && videoEl && videoEl.readyState >= 2 && time >= this.nextWebcamRenderAt) {
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
      this.nextWebcamRenderAt = time + MENU_WEBCAM_FRAME_MS;
    }

    this.cursors.update(this.handPositions);
    this.allBtns.forEach((btn) => btn.update(this.handPositions, delta));
  }

  private doStart() {
    this.scene.start(GAMES[this.currentIndex].key);
  }
}
