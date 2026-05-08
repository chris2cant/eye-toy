import Phaser from "phaser";
import { HEX, COLOR, FONT, DEPTH } from "../../design-system/tokens";
import { drawRotatedRect } from "./MenuSceneLayout";

export function createMenuDecorations(scene: Phaser.Scene, width: number, height: number): void {
  const deco = scene.add.graphics().setDepth(DEPTH.bg);
  drawDecoBlobs(deco, width, height);
  drawDecoDots(deco, width, height);
  drawDecoRects(deco, width, height);
  drawDecoTriangles(deco, width, height);
}

function drawDecoBlobs(deco: Phaser.GameObjects.Graphics, width: number, height: number): void {
  deco.fillStyle(HEX.punchyPink, 0.20); deco.fillCircle(-100, -100, 240);
  deco.fillStyle(HEX.turquoise, 0.18);  deco.fillCircle(width + 100, -100, 240);
  deco.fillStyle(HEX.sunYellow, 0.16);  deco.fillCircle(-80, height + 80, 200);
  deco.fillStyle(HEX.popPurple, 0.16);  deco.fillCircle(width + 80, height + 80, 200);
  deco.fillStyle(HEX.turquoise, 0.10);  deco.fillCircle(-50, height * 0.55, 150);
  deco.fillStyle(HEX.popPurple, 0.10);  deco.fillCircle(width + 50, height * 0.55, 150);
}

function drawDecoDots(deco: Phaser.GameObjects.Graphics, width: number, height: number): void {
  const dots = [
    { x: width * 0.08, y: height * 0.50, radius: 9,  color: HEX.punchyPink },
    { x: width * 0.92, y: height * 0.50, radius: 9,  color: HEX.turquoise  },
    { x: width * 0.05, y: height * 0.74, radius: 6,  color: HEX.sunYellow  },
    { x: width * 0.95, y: height * 0.74, radius: 6,  color: HEX.popPurple  },
    { x: width * 0.18, y: height * 0.88, radius: 5,  color: HEX.turquoise  },
    { x: width * 0.82, y: height * 0.88, radius: 5,  color: HEX.punchyPink },
    { x: width * 0.04, y: height * 0.36, radius: 11, color: HEX.sunYellow  },
    { x: width * 0.96, y: height * 0.36, radius: 11, color: HEX.popPurple  },
    { x: width * 0.22, y: height * 0.72, radius: 7,  color: HEX.punchyPink },
    { x: width * 0.78, y: height * 0.72, radius: 7,  color: HEX.sunYellow  },
  ];
  dots.forEach(({ x, y, radius, color }) => { deco.fillStyle(color, 0.28); deco.fillCircle(x, y, radius); });
}

function drawDecoRects(deco: Phaser.GameObjects.Graphics, width: number, height: number): void {
  const rects = [
    { x: width * 0.15, y: height * 0.20, angle: -30, rectW: 22, rectH: 9, color: HEX.sunYellow  },
    { x: width * 0.85, y: height * 0.20, angle:  30, rectW: 22, rectH: 9, color: HEX.punchyPink },
    { x: width * 0.12, y: height * 0.65, angle:  20, rectW: 16, rectH: 7, color: HEX.popPurple  },
    { x: width * 0.88, y: height * 0.65, angle: -20, rectW: 16, rectH: 7, color: HEX.turquoise  },
  ];
  rects.forEach(({ x, y, angle, rectW, rectH, color }) => {
    deco.fillStyle(color, 0.24);
    drawRotatedRect(deco, { x, y, rectW, rectH, angleDeg: angle });
  });
}

function drawDecoTriangles(deco: Phaser.GameObjects.Graphics, width: number, height: number): void {
  const triangles = [
    { x: width * 0.90, y: height * 0.30, size: 12, color: HEX.sunYellow  },
    { x: width * 0.10, y: height * 0.30, size: 12, color: HEX.punchyPink },
    { x: width * 0.93, y: height * 0.82, size: 9,  color: HEX.turquoise  },
    { x: width * 0.07, y: height * 0.82, size: 9,  color: HEX.popPurple  },
  ];
  triangles.forEach(({ x, y, size, color }) => {
    deco.fillStyle(color, 0.30);
    deco.fillTriangle(x, y - size, x + size * 0.866, y + size * 0.5, x - size * 0.866, y + size * 0.5);
  });
}

export function createMenuTitle(scene: Phaser.Scene, cx: number, height: number): void {
  createTitleBars(scene, cx, height);
  scene.add.text(cx, height * 0.108, "EYE TOY", { fontSize: "80px", fontFamily: FONT.display, color: COLOR.nightBlue }).setOrigin(0.5).setDepth(DEPTH.hud);
  scene.add.text(cx, height * 0.178, "Le jeu qui te voit bouger !", { fontSize: "18px", fontFamily: FONT.ui, color: COLOR.textSecondary }).setOrigin(0.5).setDepth(DEPTH.hud);
}

function createTitleBars(scene: Phaser.Scene, cx: number, height: number): void {
  const decoY = height * 0.062;
  const gfx = scene.add.graphics().setDepth(DEPTH.hud);
  const bars = [
    { x: cx - 82, y: decoY,     barW: 5, barH: 22, angle: -14, color: HEX.punchyPink },
    { x: cx - 46, y: decoY - 3, barW: 5, barH: 16, angle:   9, color: HEX.sunYellow  },
    { x: cx + 42, y: decoY - 3, barW: 5, barH: 16, angle:  -9, color: HEX.turquoise  },
    { x: cx + 78, y: decoY,     barW: 5, barH: 22, angle:  14, color: HEX.punchyPink },
  ];
  bars.forEach(({ x, y, barW, barH, angle, color }) => {
    gfx.fillStyle(color, 0.88);
    drawRotatedRect(gfx, { x, y, rectW: barW, rectH: barH, angleDeg: angle });
  });
}
