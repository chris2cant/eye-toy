import Phaser from "phaser";
import { handTracker } from "../../camera/HandTracker";
import type { LandmarksPayload } from "../../camera/HandTracker";
import { COLOR, DEPTH, FONT, HEX } from "../../design-system/tokens";
import { DwellButton } from "../../design-system/DwellButton";
import { WebcamLayer } from "../../scenes/WebcamLayer";
import { PALETTE, redrawToolHud, drawHandCursors, buildPaletteButtons, applyActiveStrokes, mapLandmark, getPinchDrawPosition, smoothPoint } from "./PaintSceneHUD";
import type { Tool, PaintColor } from "./PaintSceneHUD";

const THUMB_TIP = 4;
const INDEX_TIP = 8;
const PALM_LANDMARK = 9;
const PAINT_TRACKER_FPS = 24;
const PAINT_WEBCAM_FPS = 24;
const BRUSH_SIZE = 18;
const ERASER_SIZE = 42;

type Point = { x: number; y: number };

export class PaintScene extends Phaser.Scene {
  private webcam!: WebcamLayer;
  private paintTexture: Phaser.Textures.CanvasTexture | null = null;
  private paintImage: Phaser.GameObjects.Image | null = null;
  private cursorGraphics!: Phaser.GameObjects.Graphics;
  private hudGraphics!: Phaser.GameObjects.Graphics;
  private btnBack!: DwellButton;
  private btnClear!: DwellButton;
  private toolButtons: DwellButton[] = [];
  private handPositions: (Point | null)[] = [null, null];
  private indexPositions: (Point | null)[] = [null, null];
  private smoothedDrawPositions: (Point | null)[] = [null, null];
  private lastDrawPositions: (Point | null)[] = [null, null];
  private drawingHands = new Set<number>();
  private activeTool: Tool = "brush";
  private activeColor: PaintColor = PALETTE[2];

  constructor() {
    super({ key: "PaintScene" });
  }

  async create(): Promise<void> {
    const { width, height } = this.scale;

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
    this.add
      .rectangle(width / 2, 0, width, height * 0.34, HEX.bgCanvas, 0.42)
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.hud - 2);

    this.hudGraphics = this.add.graphics().setDepth(DEPTH.hud - 1);
    this.cursorGraphics = this.add.graphics().setDepth(DEPTH.cursor);

    this.btnBack = new DwellButton(this, 100, height * 0.12, {
      label: "← MENU",
      fontSize: "20px",
      onActivate: () => this.scene.start("MenuScene", { selectedGameKey: this.sys.settings.key }),
      depth: DEPTH.hud,
      dwellMs: 1000,
      fillColor: HEX.nightBlue,
    });

    this.btnClear = new DwellButton(this, width - 112, height * 0.12, {
      label: "EFFACER",
      fontSize: "18px",
      onActivate: () => {
        this.clearCanvas();
        this.btnClear.reset();
      },
      depth: DEPTH.hud,
      dwellMs: 1000,
    });

    this.add
      .text(width / 2, height * 0.08, "PAINT", {
        fontSize: "34px",
        fontFamily: FONT.display,
        fontStyle: "900",
        color: COLOR.textPrimary,
        shadow: { offsetX: 0, offsetY: 0, color: this.activeColor.color, blur: 16, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    this.buildPalette(width, height);
    this.redrawToolHud();
  }

  private buildPalette(width: number, height: number): void {
    this.toolButtons = buildPaletteButtons({ scene: this, width, height }, (tool, color) => {
      this.activeTool = tool;
      if (color) this.activeColor = color;
      this.redrawToolHud();
    });
  }

  private redrawToolHud(): void {
    const { width, height } = this.scale;
    redrawToolHud(
      { gfx: this.hudGraphics, scene: this, width, height, toolButtons: this.toolButtons },
      { activeTool: this.activeTool, activeColor: this.activeColor },
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
    this.btnBack.update(this.handPositions, delta);
    this.btnClear.update(this.handPositions, delta);
    this.toolButtons.forEach((button) => button.update(this.handPositions, delta));
  }

  private drawActiveStrokes(): void {
    if (!this.paintTexture) return;
    this.lastDrawPositions = applyActiveStrokes(this.paintTexture, {
      positions: this.smoothedDrawPositions,
      last: this.lastDrawPositions,
      drawing: this.drawingHands,
      tool: this.activeTool,
      color: this.activeColor,
      brushSize: BRUSH_SIZE,
      eraserSize: ERASER_SIZE,
    });
  }

  private drawCursors(): void {
    drawHandCursors(this.cursorGraphics, {
      positions: this.indexPositions,
      drawingHands: this.drawingHands,
      tool: this.activeTool,
      color: this.activeColor,
      brushSize: BRUSH_SIZE,
      eraserSize: ERASER_SIZE,
    });
  }

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
