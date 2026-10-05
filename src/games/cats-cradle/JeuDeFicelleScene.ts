import Phaser from "phaser";
import { handTracker } from "../../camera/HandTracker";
import { measure } from "../../camera/perfProbe";
import type { LandmarksPayload } from "../../camera/HandTracker";
import { DEPTH } from "../../design-system/tokens";
import { WebcamLayer } from "../../scenes/WebcamLayer";
import { bindQuitKey, listenLandmarks } from "../../scenes/sceneHelpers";
import { ParticleSystem } from "./JeuDeFicelleParticles";
import { drawCords, getCordColor } from "./JeuDeFicelleCords";
import type { CordStyle, DrawCordsSpec } from "./JeuDeFicelleCords";
import {
  drawFingertipDots, drawTrailLayer, drawParticleLayer,
  updateSmoothedTips,
} from "./JeuDeFicelleDraw";
import { buildFicelleUI, STYLE_NAMES } from "./JeuDeFicelleUI";
import type { FicelleUIRefs } from "./JeuDeFicelleUI";
import {
  makeEmptyHandPositions, makeEmptyTargetTips,
  mapHandLandmarks, partitionHandsByPlayer,
} from "./JeuDeFicelleHands";
import { arePairHandsAttached } from "./JeuDeFicelleAttachment";

const FICELLE_TRACKER_FPS = 22;
const FICELLE_OVERLAY_FPS = 30;
const FICELLE_OVERLAY_FRAME_MS = 1000 / FICELLE_OVERLAY_FPS;

type Point = { x: number; y: number };

export class JeuDeFicelleScene extends Phaser.Scene {
  private webcam!: WebcamLayer;
  private overlayTex!: Phaser.Textures.CanvasTexture;
  private ui!: FicelleUIRefs;

  private handPositions: (Point | null)[] = makeEmptyHandPositions();
  private targetTips: (Point | null)[][] = makeEmptyTargetTips();
  private smoothTips: (Point | null)[][] = makeEmptyTargetTips();
  private playerHandIndices: [number[], number[]] = [[], []];

  private particleSystem = new ParticleSystem();
  private cordsAttached = false;
  private attachedPairs: boolean[] = [false, false];
  private nextOverlayRenderAt = 0;
  private visualTime = 0;
  private currentStyleIndex = 0;
  private electricityLoop?: Phaser.Sound.BaseSound;

  constructor() {
    super({ key: "JeuDeFicelleScene" });
  }

  async create() {
    const { width, height } = this.scale;

    this.input.keyboard?.on("keydown-M", this.cycleCordStyle, this);
    this.input.keyboard?.on("keydown-SPACE", this.cycleCordStyle, this);
    bindQuitKey(this);

    const videoEl = await handTracker.initCamera();
    this.webcam = new WebcamLayer(this);
    this.webcam.setup(videoEl);

    await handTracker.initDetector({ numHands: 4 });
    handTracker.start({ targetFps: FICELLE_TRACKER_FPS });
    listenLandmarks(this, this.onLandmarks);

    if (this.textures.exists("catscradle-fx")) this.textures.remove("catscradle-fx");
    const tex = this.textures.createCanvas("catscradle-fx", width, height);
    if (!tex) throw new Error("createCanvas failed");
    this.overlayTex = tex;
    this.add.image(width / 2, height / 2, "catscradle-fx").setDepth(DEPTH.overlay + 1);

    this.ui = buildFicelleUI(this, width, height, this.getStyleLabel());
    this.electricityLoop = this.sound.add("sfx-electricity", { loop: true, volume: 0.35 });
    this.events.once("shutdown", () => {
      this.destroyElectricityLoop();
      this.input.keyboard?.off("keydown-M", this.cycleCordStyle, this);
      this.input.keyboard?.off("keydown-SPACE", this.cycleCordStyle, this);
    });
  }

  private onLandmarks = ({ hands }: LandmarksPayload): void => {
    this.handPositions = makeEmptyHandPositions();
    this.targetTips = makeEmptyTargetTips();
    const { width, height } = this.scale;
    const mapper = this.webcam.getLandmarkMapper(width, height);
    mapHandLandmarks(hands, mapper, { handPositions: this.handPositions, targetTips: this.targetTips });
    this.playerHandIndices = partitionHandsByPlayer(this.handPositions, width);
  };

  update(time: number, delta: number): void {
    if (!this.webcam) return;
    this.visualTime = time;
    updateSmoothedTips(this.smoothTips, this.targetTips, delta);
    this.particleSystem.update(delta);
    this.syncCordAttachmentState();
    if (time >= this.nextOverlayRenderAt) {
      measure("overlay", () => this.drawOverlay());
      this.nextOverlayRenderAt = time + FICELLE_OVERLAY_FRAME_MS;
    }
  }

  private drawOverlay(): void {
    const { width, height } = this.scale;
    const ctx = this.overlayTex.getContext();
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    drawTrailLayer(ctx, this.particleSystem.getTrails());

    const state = { visualTime: this.visualTime, lastResonanceAt: 0, resonanceMs: 1 };
    for (const [pairIndex, indices] of this.playerHandIndices.entries()) {
      if (indices.length < 2 || !this.attachedPairs[pairIndex]) continue;
      const t0 = this.smoothTips[indices[0]];
      const t1 = this.smoothTips[indices[1]];
      if (!t0.some((tip) => tip !== null) || !t1.some((tip) => tip !== null)) continue;
      const palm0 = this.handPositions[indices[0]];
      const palm1 = this.handPositions[indices[1]];
      const distT = palm0 && palm1 ? Math.min(Math.hypot(palm0.x - palm1.x, palm0.y - palm1.y) / (width * 0.6), 1) : 0;
      const spec: DrawCordsSpec = { t0, t1, distT, style: this.currentCordStyle };
      drawCords(ctx, spec, state, this.particleSystem);
      this.emitFingerParticles(t0, t1);
    }

    drawFingertipDots(ctx, this.smoothTips, this.currentCordStyle);
    drawParticleLayer(ctx, this.particleSystem.getParticles());
    this.overlayTex.refresh();
  }

  private get currentCordStyle(): CordStyle {
    return ["blueWeb", "neon", "laser", "arcade", "dotted"][this.currentStyleIndex] as CordStyle;
  }

  private cycleCordStyle = (): void => {
    this.currentStyleIndex = (this.currentStyleIndex + 1) % STYLE_NAMES.length;
    this.particleSystem.clearTrails();
    this.ui.styleTxt.setText(this.getStyleLabel());
    this.ui.statusTxt.setText("MODE FICELLE LIBRE");
  };

  private getStyleLabel(): string {
    return `STYLE ${this.currentStyleIndex + 1}/5  ${STYLE_NAMES[this.currentStyleIndex]}`;
  }

  private syncCordAttachmentState(): void {
    this.attachedPairs = this.playerHandIndices.map((indices) =>
      arePairHandsAttached(indices, this.handPositions, this.smoothTips, this.scale.width * 0.9),
    );
    const attached = this.attachedPairs.some(Boolean);
    if (attached === this.cordsAttached) return;
    this.cordsAttached = attached;
    if (this.cordsAttached) {
      if (this.electricityLoop && !this.electricityLoop.isPlaying) this.electricityLoop.play();
      return;
    }
    this.particleSystem.clearTrails();
    if (this.electricityLoop?.isPlaying) this.electricityLoop.stop();
  }

  private emitFingerParticles(t0: (Point | null)[], t1: (Point | null)[]): void {
    for (let fi = 0; fi < 5; fi++) {
      const color = getCordColor(this.currentCordStyle, { from: fi, to: fi }, fi, this.visualTime);
      const tip0 = t0[fi];
      const tip1 = t1[fi];
      if (tip0) this.particleSystem.spawnFingerJet(tip0.x, tip0.y, color);
      if (tip1) this.particleSystem.spawnFingerJet(tip1.x, tip1.y, color);
    }
  }

  private destroyElectricityLoop(): void {
    if (this.electricityLoop?.isPlaying) this.electricityLoop.stop();
    this.electricityLoop?.destroy();
    this.electricityLoop = undefined;
  }
}
