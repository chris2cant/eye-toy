import Phaser from "phaser";
import { handTracker } from "../../camera/HandTracker";
import type { LandmarksPayload } from "../../camera/HandTracker";
import { DwellButton } from "../../design-system/DwellButton";
import { COLOR, DEPTH, FONT } from "../../design-system/tokens";
import { WebcamLayer } from "../../scenes/WebcamLayer";
import { PALETTE, redrawToolHud, drawHandCursors, applyActiveStrokes, mapLandmark, getPinchDrawPosition, smoothPoint } from "./PaintSceneHUD";
import type { Tool, PaintColor, PaintToolButton } from "./PaintSceneHUD";
import { buildPaintUi } from "./PaintSceneUI";

const THUMB_TIP = 4;
const INDEX_TIP = 8;
const PALM_LANDMARK = 9;
const PAINT_TRACKER_FPS = 24;
const PAINT_WEBCAM_FPS = 24;
const DEFAULT_BRUSH_SIZE = 28;
const BRUSH_SIZE_STEP = 8;
const BRUSH_SIZE_MIN = 12;
const ERASER_SIZE = 42;

type Point = { x: number; y: number };

export class PaintScene extends Phaser.Scene {
  private webcam!: WebcamLayer;
  private paintTexture: Phaser.Textures.CanvasTexture | null = null;
  private paintImage: Phaser.GameObjects.Image | null = null;
  private cursorGraphics!: Phaser.GameObjects.Graphics;
  private hudGraphics!: Phaser.GameObjects.Graphics;
  private btnClear!: DwellButton;
  private toolButtons: PaintToolButton[] = [];
  private handPositions: (Point | null)[] = [null, null];
  private indexPositions: (Point | null)[] = [null, null];
  private smoothedDrawPositions: (Point | null)[] = [null, null];
  private lastDrawPositions: (Point | null)[] = [null, null];
  private drawingHands = new Set<number>();
  private activeTool: Tool = "brush";
  private activeColor: PaintColor = PALETTE[2];
  private brushSize = DEFAULT_BRUSH_SIZE;

  constructor() {
    super({ key: "PaintScene" });
  }

  async create(): Promise<void> {
    const { width, height } = this.scale;

    this.input.keyboard?.on("keydown-UP", this.onIncreaseBrush);
    this.input.keyboard?.on("keydown-DOWN", this.onDecreaseBrush);
    this.input.keyboard?.on("keydown-Q", this.onQuitToMenu);

    try {
      const videoEl = await handTracker.initCamera();
      this.webcam = new WebcamLayer(this);
      this.webcam.setup(videoEl, width, height);

      this.createPaintLayer(width, height);
      this.buildUI(width, height);

      await handTracker.initDetector({ numHands: 2 });
      handTracker.start({ targetFps: PAINT_TRACKER_FPS });
      handTracker.on("landmarks", this.onLandmarks, this);

      this.scale.on("resize", this.onResize, this);
      this.events.once("shutdown", () => {
        handTracker.off("landmarks", this.onLandmarks, this);
        this.scale.off("resize", this.onResize, this);
        this.input.keyboard?.off("keydown-UP", this.onIncreaseBrush);
        this.input.keyboard?.off("keydown-DOWN", this.onDecreaseBrush);
        this.input.keyboard?.off("keydown-Q", this.onQuitToMenu);
      });
    } catch (err) {
      console.error("[PaintScene] erreur d'initialisation:", err);
      this.add
        .text(width / 2, height / 2, "Caméra refusée\nVeuillez autoriser l'accès à la webcam", {
          fontSize: "28px",
          fontFamily: FONT.ui,
          color: COLOR.danger,
          align: "center",
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.topUi);
    }
  }

  private createPaintLayer(width: number, height: number): void {
    if (this.textures.exists("paint-layer")) this.textures.remove("paint-layer");
    const texture = this.textures.createCanvas("paint-layer", width, height);
    if (!texture) throw new Error("createCanvas returned null");

    this.paintTexture = texture;
    this.paintImage = this.add.image(width / 2, height / 2, "paint-layer").setDepth(DEPTH.game);
  }

  private buildUI(width: number, height: number): void {
    const ui = buildPaintUi({
      scene: this,
      width,
      height,
      activeColor: this.activeColor,
      onClear: () => {
        this.clearCanvas();
        this.btnClear.reset();
      },
      onToolChange: (tool, color) => {
        this.activeTool = tool;
        if (color) this.activeColor = color;
        this.redrawToolHud();
      },
    });
    this.hudGraphics = ui.hudGraphics;
    this.cursorGraphics = ui.cursorGraphics;
    this.btnClear = ui.btnClear;
    this.toolButtons = ui.toolButtons;
    this.redrawToolHud();
  }

  private redrawToolHud(): void {
    const { width, height } = this.scale;
    redrawToolHud(
      { gfx: this.hudGraphics, scene: this, width, height, toolButtons: this.toolButtons },
      { activeTool: this.activeTool, activeColor: this.activeColor, brushSize: this.brushSize },
    );
  }

  private onLandmarks = ({ hands, pinches }: LandmarksPayload): void => {
    const { width, height } = this.scale;
    const mapper = this.webcam.getLandmarkMapper(width, height);
    const pinchingHands = new Set(pinches.map((pinch) => pinch.handIndex));

    this.drawingHands.clear();

    for (let i = 0; i < 2; i++) {
      const hand = hands[i];
      if (!hand || hand.length === 0) {
        this.handPositions[i] = null;
        this.indexPositions[i] = null;
        this.smoothedDrawPositions[i] = null;
        this.lastDrawPositions[i] = null;
        continue;
      }

      this.handPositions[i] = mapLandmark(hand, PALM_LANDMARK, mapper);
      this.indexPositions[i] = mapLandmark(hand, INDEX_TIP, mapper);

      if (!pinchingHands.has(i)) {
        this.smoothedDrawPositions[i] = null;
        this.lastDrawPositions[i] = null;
        continue;
      }

      const drawPos = getPinchDrawPosition(hand, THUMB_TIP, INDEX_TIP, mapper);
      this.smoothedDrawPositions[i] = smoothPoint(this.smoothedDrawPositions[i], drawPos);
      this.drawingHands.add(i);
    }
  };

  update(time: number, delta: number): void {
    if (!this.webcam) return;
    this.webcam.render(time, PAINT_WEBCAM_FPS);

    this.drawActiveStrokes();
    this.drawCursors();
    this.btnClear.update(this.handPositions, delta);
    this.toolButtons.forEach(({ button }) => button.update(this.handPositions, delta));
  }

  private drawActiveStrokes(): void {
    if (!this.paintTexture) return;
    this.lastDrawPositions = applyActiveStrokes(this.paintTexture, {
      positions: this.smoothedDrawPositions,
      last: this.lastDrawPositions,
      drawing: this.drawingHands,
      tool: this.activeTool,
      color: this.activeColor,
      brushSize: this.brushSize,
      eraserSize: ERASER_SIZE,
    });
  }

  private drawCursors(): void {
    drawHandCursors(this.cursorGraphics, {
      positions: this.indexPositions,
      drawingHands: this.drawingHands,
      tool: this.activeTool,
      color: this.activeColor,
      brushSize: this.brushSize,
      eraserSize: ERASER_SIZE,
    });
  }

  private setBrushSize(nextSize: number): void {
    const clamped = Math.max(BRUSH_SIZE_MIN, nextSize);
    if (clamped === this.brushSize) return;
    this.brushSize = clamped;
    this.redrawToolHud();
  }

  private readonly onIncreaseBrush = (): void => {
    this.setBrushSize(this.brushSize + BRUSH_SIZE_STEP);
  };

  private readonly onDecreaseBrush = (): void => {
    this.setBrushSize(this.brushSize - BRUSH_SIZE_STEP);
  };

  private readonly onQuitToMenu = (): void => {
    this.scene.start("MenuScene", { selectedGameKey: this.sys.settings.key });
  };

  private clearCanvas(): void {
    if (!this.paintTexture) return;
    const ctx = this.paintTexture.getContext();
    if (!ctx) return;
    ctx.clearRect(0, 0, this.paintTexture.width, this.paintTexture.height);
    this.paintTexture.refresh();
    this.lastDrawPositions = [null, null];
  }

  private onResize = (gameSize: Phaser.Structs.Size): void => {
    if (!this.paintTexture || !this.paintImage) return;
    this.paintTexture.setSize(gameSize.width, gameSize.height);
    this.paintImage.setPosition(gameSize.width / 2, gameSize.height / 2);
    this.clearCanvas();
  };
}
