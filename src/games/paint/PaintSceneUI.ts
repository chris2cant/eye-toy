import Phaser from "phaser";
import { DwellButton } from "../../design-system/DwellButton";
import { COLOR, DEPTH, FONT, HEX } from "../../design-system/tokens";
import { buildPaletteButtons } from "./PaintSceneHUD";
import type { PaintColor, PaintToolButton, Tool } from "./PaintSceneHUD";

type PaintUiConfig = {
  scene: Phaser.Scene;
  width: number;
  height: number;
  activeColor: PaintColor;
  onClear: () => void;
  onToolChange: (tool: Tool, color: PaintColor | null) => void;
};

type PaintUiRefs = {
  hudGraphics: Phaser.GameObjects.Graphics;
  cursorGraphics: Phaser.GameObjects.Graphics;
  btnClear: DwellButton;
  toolButtons: PaintToolButton[];
};

export function buildPaintUi(config: PaintUiConfig): PaintUiRefs {
  const { scene, width, height } = config;
  const hudGraphics = scene.add.graphics().setDepth(DEPTH.hud - 1);
  const cursorGraphics = scene.add.graphics().setDepth(DEPTH.cursor);
  const btnClear = createClearButton(scene, width, height, config.onClear);
  const toolButtons = buildPaletteButtons({ scene, width, height }, config.onToolChange);
  addPaintTitle(scene, width, height, config.activeColor);
  return { hudGraphics, cursorGraphics, btnClear, toolButtons };
}

function createClearButton(scene: Phaser.Scene, width: number, height: number, onClear: () => void): DwellButton {
  return new DwellButton(scene, width - 112, height * 0.12, {
    label: "🗑",
    fontSize: "28px",
    onActivate: onClear,
    depth: DEPTH.hud,
    dwellMs: 1000,
    fillColor: HEX.nightBlue,
    zonePad: 52,
  });
}

function addPaintTitle(scene: Phaser.Scene, width: number, height: number, activeColor: PaintColor): void {
  scene.add
    .text(width / 2, height * 0.08, "PAINT", {
      fontSize: "34px",
      fontFamily: FONT.display,
      fontStyle: "900",
      color: COLOR.textPrimary,
      shadow: { offsetX: 0, offsetY: 0, color: activeColor.color, blur: 16, fill: true },
    })
    .setOrigin(0.5)
    .setDepth(DEPTH.hud);
}
