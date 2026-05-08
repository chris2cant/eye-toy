import Phaser from "phaser";
import { HEX } from "../tokens";

export interface ProgressBarConfig {
  width?: number;
  height?: number;
}

export interface ProgressBarHandle {
  container: Phaser.GameObjects.Container;
  setProgress(value: number): void;
  destroy(): void;
}

export function createProgressBar(
  scene: Phaser.Scene,
  x: number,
  y: number,
  config: ProgressBarConfig = {},
): ProgressBarHandle {
  const barWidth = config.width ?? 260;
  const barHeight = config.height ?? 18;
  const radius = barHeight / 2;

  const container = scene.add.container(x, y);

  const bg = scene.add.graphics();
  bg.fillStyle(HEX.nightBlue, 0.12);
  bg.fillRoundedRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight, radius);

  const fill = scene.add.graphics();

  function draw(progress: number) {
    fill.clear();
    const clamp = Math.max(0, Math.min(1, progress));
    if (clamp <= 0) return;
    const fillW = clamp * barWidth;
    fill.fillStyle(HEX.turquoise, 1);
    fill.fillRoundedRect(-barWidth / 2, -barHeight / 2, fillW, barHeight, radius);
  }

  draw(0);
  container.add([bg, fill]);

  return {
    container,
    setProgress(value: number) {
      draw(value);
    },
    destroy() {
      container.destroy();
    },
  };
}
