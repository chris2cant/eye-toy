import Phaser from "phaser";
import { handTracker } from "../../camera/HandTracker";
import type { LandmarksPayload } from "../../camera/HandTracker";
import { DEPTH } from "../../design-system/tokens";
import { HandCursors } from "../../design-system/HandCursors";
import { WebcamLayer } from "../../scenes/WebcamLayer";
import { DwellButton } from "../../design-system/DwellButton";
import { ParticleSystem } from "./JeuDeFicelleParticles";
import { drawCords } from "./JeuDeFicelleCords";
import type { CordStyle, DrawCordsSpec } from "./JeuDeFicelleCords";
import {
  RESONANCE_MS, createAtmosphereCanvas, drawResonanceWash,
  drawFingertipDots, drawTrailLayer, drawParticleLayer,
  updateSmoothedTips, areFingertipsTouching,
} from "./JeuDeFicelleDraw";
import { buildFicelleUI, STYLE_NAMES } from "./JeuDeFicelleUI";
import type { FicelleUIRefs } from "./JeuDeFicelleUI";
import {
  FINGERTIP_INDICES, makeEmptyHandPositions, makeEmptyTargetTips,
  mapHandLandmarks, partitionHandsByPlayer,
} from "./JeuDeFicelleHands";

const FICELLE_TRACKER_FPS = 22;
const FICELLE_WEBCAM_FPS = 15;
const FICELLE_OVERLAY_FPS = 30;
const FICELLE_OVERLAY_FRAME_MS = 1000 / FICELLE_OVERLAY_FPS;

type Point = { x: number; y: number };

export class JeuDeFicelleScene extends Phaser.Scene {
  private webcam!: WebcamLayer;
  private overlayTex!: Phaser.Textures.CanvasTexture;
  private cursors!: HandCursors;
  private atmosphereCanvas!: HTMLCanvasElement;
  private ui!: FicelleUIRefs;
  private btnBack!: DwellButton;

  private handPositions: (Point | null)[] = makeEmptyHandPositions();
  private targetTips: (Point | null)[][] = makeEmptyTargetTips();
  private smoothTips: (Point | null)[][] = makeEmptyTargetTips();
  private playerHandIndices: [number[], number[]] = [[], []];

  private particleSystem = new ParticleSystem();
  private prevTouching = false;
  private nextOverlayRenderAt = 0;
  private visualTime = 0;
  private lastResonanceAt = -RESONANCE_MS;
  private statusResetEvent?: Phaser.Time.TimerEvent;
  private currentStyleIndex = 0;

  constructor() {
    super({ key: "JeuDeFicelleScene" });
  }

  async create() {
    const { width, height } = this.scale;

    const videoEl = await handTracker.initCamera();
    this.webcam = new WebcamLayer(this);
    this.webcam.setup(videoEl, width, height);

    await handTracker.initDetector({ numHands: 4 });
    handTracker.start({ targetFps: FICELLE_TRACKER_FPS });
    handTracker.on("landmarks", this.onLandmarks, this);

    if (this.textures.exists("catscradle-fx")) this.textures.remove("catscradle-fx");
    const tex = this.textures.createCanvas("catscradle-fx", width, height);
    if (!tex) throw new Error("createCanvas failed");
    this.overlayTex = tex;
    this.add.image(width / 2, height / 2, "catscradle-fx").setDepth(DEPTH.overlay + 1);
    this.atmosphereCanvas = createAtmosphereCanvas(width, height);

    this.cursors = new HandCursors(this, DEPTH.cursor);
    this.ui = buildFicelleUI(this, width, height, this.getStyleLabel());
    this.btnBack = this.ui.btnBack;
    this.input.keyboard?.on("keydown-M", this.cycleCordStyle, this);
    this.input.keyboard?.on("keydown-SPACE", this.cycleCordStyle, this);

    this.events.once("shutdown", () => {
      handTracker.off("landmarks", this.onLandmarks, this);
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
    void height;
  };

  update(time: number, delta: number): void {
    if (!this.webcam) return;
    this.visualTime = time;
    this.webcam.render(time, FICELLE_WEBCAM_FPS);
    updateSmoothedTips(this.smoothTips, this.targetTips, delta);
    this.particleSystem.update(delta);
    this.checkCollisions();
    if (time >= this.nextOverlayRenderAt) {
      this.drawOverlay();
      this.nextOverlayRenderAt = time + FICELLE_OVERLAY_FRAME_MS;
    }
    this.cursors.update(this.handPositions);
    this.btnBack.update(this.handPositions, delta);
  }

  private drawOverlay(): void {
    const { width, height } = this.scale;
    const ctx = this.overlayTex.getContext();
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(this.atmosphereCanvas, 0, 0);
    drawResonanceWash(ctx, { width, height }, this.visualTime, this.lastResonanceAt);
    drawTrailLayer(ctx, this.particleSystem.getTrails());

    const state = { visualTime: this.visualTime, lastResonanceAt: this.lastResonanceAt, resonanceMs: RESONANCE_MS };
    for (const indices of this.playerHandIndices) {
      if (indices.length < 2) continue;
      const t0 = this.smoothTips[indices[0]];
      const t1 = this.smoothTips[indices[1]];
      if (!t0.some((tip) => tip !== null) || !t1.some((tip) => tip !== null)) continue;
      const palm0 = this.handPositions[indices[0]];
      const palm1 = this.handPositions[indices[1]];
      const distT = palm0 && palm1 ? Math.min(Math.hypot(palm0.x - palm1.x, palm0.y - palm1.y) / (width * 0.6), 1) : 0;
      const spec: DrawCordsSpec = { t0, t1, distT, style: this.currentCordStyle };
      drawCords(ctx, spec, state, this.particleSystem);
    }

    drawFingertipDots(ctx, this.smoothTips, this.currentCordStyle);
    drawParticleLayer(ctx, this.particleSystem.getParticles());
    this.overlayTex.refresh();
  }

  private checkCollisions(): void {
    let touching = false;
    for (const indices of this.playerHandIndices) {
      if (indices.length < 2) continue;
      const { touching: isTouching, touchPoint } = areFingertipsTouching(
        this.smoothTips[indices[0]], this.smoothTips[indices[1]],
      );
      if (isTouching && !this.prevTouching) {
        this.lastResonanceAt = this.visualTime;
        this.ui.statusTxt.setText("RESONANCE");
        this.statusResetEvent?.remove(false);
        this.statusResetEvent = this.time.delayedCall(RESONANCE_MS, () => this.ui.statusTxt.setText("MODE FICELLE LIBRE"));
        if (touchPoint) this.particleSystem.spawnBurst(touchPoint.x, touchPoint.y);
      }
      if (isTouching) { touching = true; break; }
    }
    this.prevTouching = touching;
  }

  private get currentCordStyle(): CordStyle {
    return ["blueWeb", "neon", "laser", "arcade", "dotted"][this.currentStyleIndex] as CordStyle;
  }

  private cycleCordStyle = (): void => {
    this.currentStyleIndex = (this.currentStyleIndex + 1) % STYLE_NAMES.length;
    this.particleSystem.clearTrails();
    this.ui.styleTxt.setText(this.getStyleLabel());
    this.ui.statusTxt.setText("STYLE CHANGE");
    this.statusResetEvent?.remove(false);
    this.statusResetEvent = this.time.delayedCall(520, () => this.ui.statusTxt.setText("MODE FICELLE LIBRE"));
  };

  private getStyleLabel(): string {
    return `STYLE ${this.currentStyleIndex + 1}/5  ${STYLE_NAMES[this.currentStyleIndex]}`;
  }
}

void FINGERTIP_INDICES;
