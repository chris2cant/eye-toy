import Phaser from "phaser";
import { COLOR, HEX, FONT } from "../design-system/tokens";

// Panneau debug — bas gauche, repositionné au resize
const PANEL_W = 218;
const PANEL_H = 96;
const PAD = 8;
// Y des 3 lignes de métriques, relatif au panneau
const ROWS = [22, 44, 66] as const;
const BAR_X = 96;   // début des jauges
const BAR_W = 112;  // largeur max de la jauge
const BAR_H = 12;   // hauteur de la jauge

// Seuils FPS : cible 60 fps
const FPS_TARGET = 60;
// Seuils delta : 16.6 ms = 60 fps, 33 ms = 30 fps, 50 ms = 20 fps
const DELTA_MAX = 50;
// Mémoire : ratio sur jsHeapSizeLimit (Chrome); seuils d'alerte 40 % / 70 %

function thresholdColor(ratio: number, invertBad = false): { hex: number; css: string } {
  // ratio [0..1]. Par défaut : élevé = bon (FPS). invertBad = élevé = mauvais (delta, mém).
  const r = invertBad ? 1 - ratio : ratio;
  if (r >= 0.7) return { hex: HEX.success,  css: COLOR.success  };
  if (r >= 0.4) return { hex: HEX.warning,  css: COLOR.warning  };
  return             { hex: HEX.danger,   css: COLOR.danger   };
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

  private toggle() {
    this.shown = !this.shown;
    this.container.setVisible(this.shown);
    this.game.events.emit("debug:toggle", this.shown);
  }

  private positionPanel = () => {
    this.container.setPosition(10, this.scale.height - PANEL_H - 10);
  };

  private buildPanel() {
    // Fond + bordure
    const bg = this.add.graphics();
    bg.fillStyle(HEX.bgSurface, 0.93);
    bg.fillRect(0, 0, PANEL_W, PANEL_H);
    bg.lineStyle(1, HEX.warning, 0.5);
    bg.strokeRect(0, 0, PANEL_W, PANEL_H);
    this.container.add(bg);

    // Titre
    this.container.add(
      this.add.text(PAD, PAD - 2, "DEBUG", {
        fontSize: "9px", fontFamily: FONT.ui, color: COLOR.warning, letterSpacing: 2,
      })
    );

    // Libellés des lignes
    const labels = ["FPS", "Δ ms", "MEM"];
    ROWS.forEach((y, i) => {
      this.container.add(
        this.add.text(PAD, y, labels[i], {
          fontSize: "10px", fontFamily: FONT.ui, color: COLOR.textMuted,
        })
      );
    });

    // Fond des jauges (slot vide)
    const barBg = this.add.graphics();
    barBg.fillStyle(HEX.bgElevated, 1);
    ROWS.forEach(y => barBg.fillRect(BAR_X, y + 1, BAR_W, BAR_H));
    this.container.add(barBg);

    // Valeurs numériques (alignées à droite du slot label)
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

    // Remplissage des jauges — Graphics redessiné à chaque frame
    this.gauges = this.add.graphics();
    this.container.add(this.gauges);
  }

  private fillGauge(rowIndex: number, ratio: number, colorHex: number) {
    const w = Math.round(Math.max(0, Math.min(1, ratio)) * BAR_W);
    if (w === 0) return;
    this.gauges.fillStyle(colorHex, 0.82);
    this.gauges.fillRect(BAR_X, ROWS[rowIndex] + 1, w, BAR_H);
  }

  update() {
    if (!this.shown) return;

    const fps = this.game.loop.actualFps;
    const delta = this.game.loop.delta;
    const mem = (performance as any).memory as
      | { usedJSHeapSize: number; jsHeapSizeLimit: number }
      | undefined;

    // — FPS ——————————————————————————————
    // cible : 60 fps  |  jauge pleine = bon
    const fpsRatio = Math.min(fps / FPS_TARGET, 1);
    const fpsClr = thresholdColor(fpsRatio);
    this.valFps.setText(String(Math.round(fps))).setColor(fpsClr.css);

    // — Delta —————————————————————————————
    // jauge se remplit quand c'est mauvais (δ élevé)
    const deltaRatio = Math.min(delta / DELTA_MAX, 1);
    const deltaClr = thresholdColor(deltaRatio, true);
    this.valDelta.setText(`${delta.toFixed(1)}`).setColor(deltaClr.css);

    // — Mémoire ————————————————————————————
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
