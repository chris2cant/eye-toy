import Phaser from "phaser";
import { COLOR, HEX, FONT } from "../design-system/tokens";

const PANEL_W = 218;
const PANEL_H = 96;
const PAD = 8;
const ROWS = [22, 44, 66] as const;
const BAR_X = 96;
const BAR_W = 112;
const BAR_H = 12;

const FPS_TARGET = 60;
const DELTA_MAX = 50;

interface PerformanceMemory {
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface ChromePerformance extends Performance {
  memory?: PerformanceMemory;
}

function thresholdColor(ratio: number, invertBad = false): { hex: number; css: string } {
  const adjusted = invertBad ? 1 - ratio : ratio;
  if (adjusted >= 0.7) return { hex: HEX.success, css: COLOR.success };
  if (adjusted >= 0.4) return { hex: HEX.warning, css: COLOR.warning };
  return { hex: HEX.danger, css: COLOR.danger };
}

export class DebugScene extends Phaser.Scene {
  private container!: Phaser.GameObjects.Container;
  private gauges!: Phaser.GameObjects.Graphics;
  private valFps!: Phaser.GameObjects.Text;
  private valDelta!: Phaser.GameObjects.Text;
  private valMem!: Phaser.GameObjects.Text;
  private shown = false;

  constructor() { super({ key: "DebugScene" }); }

  create() {
    this.scene.bringToTop();
    this.container = this.add.container(0, 0);
    this.buildPanel();
    this.positionPanel();
    this.container.setVisible(false);
    this.scale.on("resize", this.positionPanel, this);
    this.input.keyboard!.on("keydown-D", this.toggle, this);
  }

  private toggle = (): void => {
    this.shown = !this.shown;
    this.container.setVisible(this.shown);
    this.game.events.emit("debug:toggle", this.shown);
  };

  private positionPanel = () => {
    this.container.setPosition(10, this.scale.height - PANEL_H - 10);
  };

  private buildPanel() {
    const bg = this.add.graphics();
    bg.fillStyle(HEX.bgSurface, 0.93);
    bg.fillRect(0, 0, PANEL_W, PANEL_H);
    bg.lineStyle(1, HEX.warning, 0.5);
    bg.strokeRect(0, 0, PANEL_W, PANEL_H);
    this.container.add(bg);

    this.container.add(
      this.add.text(PAD, PAD - 2, "DEBUG", {
        fontSize: "9px", fontFamily: FONT.ui, color: COLOR.warning, letterSpacing: 2,
      })
    );

    const labels = ["FPS", "Δ ms", "MEM"];
    ROWS.forEach((rowY, index) => {
      this.container.add(
        this.add.text(PAD, rowY, labels[index], {
          fontSize: "10px", fontFamily: FONT.ui, color: COLOR.textMuted,
        })
      );
    });

    const barBg = this.add.graphics();
    barBg.fillStyle(HEX.bgElevated, 1);
    ROWS.forEach(rowY => barBg.fillRect(BAR_X, rowY + 1, BAR_W, BAR_H));
    this.container.add(barBg);

    this.valFps = this.add.text(BAR_X - 4, ROWS[0], "--", {
      fontSize: "12px", fontFamily: FONT.identity, color: COLOR.textPrimary,
    }).setOrigin(1, 0);
    this.valDelta = this.add.text(BAR_X - 4, ROWS[1], "--", {
      fontSize: "12px", fontFamily: FONT.identity, color: COLOR.textPrimary,
    }).setOrigin(1, 0);
    this.valMem = this.add.text(BAR_X - 4, ROWS[2], "--", {
      fontSize: "12px", fontFamily: FONT.identity, color: COLOR.textMuted,
    }).setOrigin(1, 0);
    this.container.add([this.valFps, this.valDelta, this.valMem]);

    this.gauges = this.add.graphics();
    this.container.add(this.gauges);
  }

  private fillGauge(rowIndex: number, ratio: number, colorHex: number) {
    const width = Math.round(Math.max(0, Math.min(1, ratio)) * BAR_W);
    if (width === 0) return;
    this.gauges.fillStyle(colorHex, 0.82);
    this.gauges.fillRect(BAR_X, ROWS[rowIndex] + 1, width, BAR_H);
  }

  update() {
    if (!this.shown) return;

    const fps = this.game.loop.actualFps;
    const delta = this.game.loop.delta;
    const mem = (performance as ChromePerformance).memory;

    const fpsRatio = Math.min(fps / FPS_TARGET, 1);
    const fpsClr = thresholdColor(fpsRatio);
    this.valFps.setText(String(Math.round(fps))).setColor(fpsClr.css);

    const deltaRatio = Math.min(delta / DELTA_MAX, 1);
    const deltaClr = thresholdColor(deltaRatio, true);
    this.valDelta.setText(`${delta.toFixed(1)}`).setColor(deltaClr.css);

    let memRatio = 0;
    let memClr: { hex: number; css: string } = { hex: HEX.textMuted, css: COLOR.textMuted };
    if (mem) {
      const usedMB  = mem.usedJSHeapSize  / 1_048_576;
      const limitMB = mem.jsHeapSizeLimit / 1_048_576;
      memRatio = Math.min(usedMB / limitMB, 1);
      memClr = thresholdColor(memRatio, true);
      this.valMem.setText(`${usedMB.toFixed(0)}/${limitMB.toFixed(0)}M`).setColor(memClr.css);
    }

    this.gauges.clear();
    this.fillGauge(0, fpsRatio, fpsClr.hex);
    this.fillGauge(1, deltaRatio, deltaClr.hex);
    if (mem) this.fillGauge(2, memRatio, memClr.hex);
  }
}
