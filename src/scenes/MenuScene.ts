import Phaser from "phaser";
import { handTracker } from "../camera/HandTracker";
import type { LandmarksPayload } from "../camera/HandTracker";
import { audioFX } from "../audio/AudioFX";
import { HEX, DEPTH } from "../design-system/tokens";
import { DwellButton } from "../design-system/DwellButton";
import { NavArrow } from "../design-system/components/NavArrow";
import { createGameCard } from "../design-system/components/GameCard";
import type { GameCardHandle } from "../design-system/components/GameCard";
import { HandCursors } from "../design-system/HandCursors";
import { GAMES } from "./menu/MenuSceneData";
import type { Updatable, MenuSceneData } from "./menu/MenuSceneData";
import { computeCardLayout, renderWebcamToCanvas } from "./menu/MenuSceneLayout";
import type { CarouselConfig } from "./menu/MenuSceneLayout";
import { createMenuDecorations, createMenuTitle } from "./menu/MenuSceneDecorations";
import { createCameraStatus } from "./menu/MenuSceneStats";
import type { CameraStatusWidget } from "./menu/MenuSceneStats";

const PALM_LANDMARK = 9;
const MENU_TRACKER_FPS = 20;
const MENU_WEBCAM_FPS = 15;
const MENU_WEBCAM_FRAME_MS = 1000 / MENU_WEBCAM_FPS;

export class MenuScene extends Phaser.Scene {
  private webcamTex: Phaser.Textures.CanvasTexture | null = null;
  private cursors!: HandCursors;
  private btnPrev!: NavArrow;
  private btnNext!: NavArrow;
  private btnSelect!: DwellButton;
  private allBtns: Updatable[] = [];
  private handPositions: ({ x: number; y: number } | null)[] = [null, null];
  private currentIndex = 0;
  private nextWebcamRenderAt = 0;
  private carouselCards: GameCardHandle[] = [];
  private dotArcs: Phaser.GameObjects.Arc[] = [];
  private cameraStatus!: CameraStatusWidget;

  constructor() {
    super({ key: "MenuScene" });
  }

  create(data?: MenuSceneData) {
    const { width, height } = this.scale;
    const cx = width / 2;
    this.currentIndex = this.getInitialGameIndex(data?.selectedGameKey);
    this.handPositions = [null, null];
    this.allBtns = [];

    this.setupWebcam(width, height);
    this.add.rectangle(cx, height / 2, width, height, HEX.cream, 0.52).setDepth(DEPTH.bg);

    createMenuDecorations(this, width, height);
    createMenuTitle(this, cx, height);
    this.cameraStatus = createCameraStatus(this, width, height);
    this.buildPlayButton(height, cx);
    this.buildNavArrows(width, height);
    this.buildCarousel(height);
    this.buildDots(width, height, cx);

    this.updateCard();
    this.cursors = new HandCursors(this, DEPTH.cursor);
    this.setupHandTracking();
  }

  private buildPlayButton(height: number, cx: number) {
    const btnY = height * 0.24;
    this.btnSelect = new DwellButton(this, cx, btnY, {
      label: "▶  JOUER  →",
      fontSize: "34px",
      onActivate: () => { audioFX.pop(); this.doStart(); },
      depth: DEPTH.hud,
      dwellMs: 1200,
    });
    this.allBtns.push(this.btnSelect);
    this.add.text(cx, btnY + 62, "✋  Garde la main sur le bouton", {
      fontSize: "14px", fontFamily: "Nunito, Arial, sans-serif", color: "#9ca3af",
    }).setOrigin(0.5).setDepth(DEPTH.hud);
  }

  private buildNavArrows(width: number, height: number) {
    const arrowY = height * 0.67;
    this.btnPrev = new NavArrow(this, width * 0.052, arrowY, {
      direction: "left",
      onActivate: () => { this.navigate(-1); this.btnPrev.reset(); },
      dwellMs: 900, depth: DEPTH.hud,
    });
    this.btnNext = new NavArrow(this, width * 0.948, arrowY, {
      direction: "right",
      onActivate: () => { this.navigate(1); this.btnNext.reset(); },
      dwellMs: 900, depth: DEPTH.hud, fillColor: HEX.turquoise,
    });
    this.allBtns.push(this.btnPrev, this.btnNext);
  }

  private buildCarousel(height: number) {
    this.carouselCards = GAMES.map((game) => {
      const card = createGameCard(this, {
        name: game.name, desc: game.desc, tag: game.tag,
        icon: game.icon, accentHex: game.accentHex, accentCss: game.accentCss,
      });
      card.container.setDepth(DEPTH.hud).setPosition(0, height * 0.67);
      return card;
    });
  }

  private buildDots(width: number, height: number, cx: number) {
    this.dotArcs = [];
    const spacing = 26;
    const startX = cx - ((GAMES.length - 1) * spacing) / 2;
    const dotsY = Math.min(height * 0.97, height * 0.67 + 200);
    for (let index = 0; index < GAMES.length; index++) {
      const arc = this.add.circle(startX + index * spacing, dotsY, 4, HEX.textMuted, 0.35).setDepth(DEPTH.hud);
      this.dotArcs.push(arc);
    }
  }

  private updateCard() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height * 0.67;
    const carousel: CarouselConfig = {
      cx, cy,
      activeW: Math.min(340, Math.max(280, width * 0.26)),
      sideW: Math.min(260, Math.max(200, width * 0.18)),
      sideOffX: Math.min(400, Math.max(310, width * 0.28)),
    };
    this.carouselCards.forEach((card, index) => {
      const layout = computeCardLayout(index, this.currentIndex, GAMES.length, carousel);
      this.tweens.killTweensOf(card.container);
      card.container.setVisible(layout.visible).setDepth(DEPTH.hud + (layout.active ? 5 : 1));
      this.tweens.add({
        targets: card.container,
        x: layout.x, y: layout.y, scale: layout.scale,
        alpha: layout.visible ? layout.alpha : 0,
        duration: 400, ease: "Cubic.easeOut",
      });
      card.redraw(layout.cardW, layout.cardH, layout.active, layout.visible ? layout.alpha : 0);
    });
    this.dotArcs.forEach((arc, index) => {
      const active = index === this.currentIndex;
      arc.setRadius(active ? 7 : 4);
      arc.setFillStyle(active ? HEX.nightBlue : HEX.textMuted, active ? 1 : 0.35);
    });
  }

  private navigate(dir: number) {
    this.currentIndex = (this.currentIndex + dir + GAMES.length) % GAMES.length;
    this.updateCard();
  }

  private updateCameraStatus(connected: boolean) {
    if (!this.cameraStatus) return;
    this.cameraStatus.dot.setFillStyle(connected ? 0x22c55e : 0xef4444, 1);
    this.cameraStatus.text.setText(connected ? "Connectée" : "Erreur").setColor(connected ? "#22c55e" : "#ef4444");
  }

  private setupWebcam(width: number, height: number) {
    const videoEl = handTracker.getVideoEl();
    if (!videoEl) return;
    if (this.textures.exists("webcam-menu")) this.textures.remove("webcam-menu");
    const tex = this.textures.createCanvas("webcam-menu", width, height);
    if (!tex) return;
    this.webcamTex = tex;
    this.add.image(width / 2, height / 2, "webcam-menu").setDepth(DEPTH.webcam).setAlpha(0.65);
  }

  private onLandmarks = ({ hands }: LandmarksPayload): void => {
    const { width: screenW, height: screenH } = this.scale;
    this.handPositions = [null, null];
    hands.forEach((hand, index) => {
      if (!hand || hand.length === 0) return;
      const lm = hand[PALM_LANDMARK];
      this.handPositions[index] = { x: (1 - lm.x) * screenW, y: lm.y * screenH };
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
        this.updateCameraStatus(true);
      } catch (err) {
        console.warn("[MenuScene] caméra non disponible:", err);
        this.updateCameraStatus(false);
      }
    })();
  }

  update(time: number, delta: number) {
    this.renderWebcam(time);
    this.cursors.update(this.handPositions);
    this.allBtns.forEach((btn) => btn.update(this.handPositions, delta));
  }

  private renderWebcam(time: number): void {
    const videoEl = handTracker.getVideoEl();
    if (!this.webcamTex || !videoEl || videoEl.readyState < 2 || time < this.nextWebcamRenderAt) return;
    const { width, height } = this.scale;
    renderWebcamToCanvas({ tex: this.webcamTex, videoEl, width, height });
    this.nextWebcamRenderAt = time + MENU_WEBCAM_FRAME_MS;
  }

  private getInitialGameIndex(selectedGameKey?: string): number {
    if (!selectedGameKey) return 0;
    const idx = GAMES.findIndex((game) => game.key === selectedGameKey);
    return idx >= 0 ? idx : 0;
  }

  private doStart() {
    this.scene.start(GAMES[this.currentIndex].key);
  }
}
