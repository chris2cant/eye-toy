import Phaser from "phaser";
import { HEX, COLOR, FONT } from "../tokens";

export interface LivesBadgeHandle {
  container: Phaser.GameObjects.Container;
  setLives(count: number): void;
  destroy(): void;
}

const PILL_H = 52;
const MAX_HEARTS = 3;

function buildHeartString(count: number): string {
  const hearts = "♥".repeat(Math.max(0, count));
  const empty  = "♡".repeat(Math.max(0, MAX_HEARTS - count));
  return hearts + empty;
}

function measurePillWidth(scene: Phaser.Scene, text: string): number {
  const tmp = scene.add.text(0, 0, text, { fontSize: "26px", fontFamily: FONT.ui }).setVisible(false);
  const width = Math.max(tmp.width + 32, 80);
  tmp.destroy();
  return width;
}

export function createLivesBadge(
  scene: Phaser.Scene,
  x: number,
  y: number,
  initialLives = 3,
): LivesBadgeHandle {
  const container = scene.add.container(x, y);

  const shadow = scene.add.graphics();
  const bg = scene.add.graphics();
  let heartsText: Phaser.GameObjects.Text | null = null;

  function rebuild(count: number) {
    shadow.clear();
    bg.clear();
    heartsText?.destroy();

    const str = buildHeartString(count);
    const pillW = measurePillWidth(scene, str);

    shadow.fillStyle(0x000000, 0.1);
    shadow.fillRoundedRect(-pillW / 2 + 3, -PILL_H / 2 + 4, pillW, PILL_H, PILL_H / 2);

    bg.fillStyle(HEX.punchyPink, 1);
    bg.fillRoundedRect(-pillW / 2, -PILL_H / 2, pillW, PILL_H, PILL_H / 2);

    heartsText = scene.add
      .text(0, 0, str, {
        fontSize: "26px",
        fontFamily: FONT.ui,
        color: COLOR.white,
      })
      .setOrigin(0.5);

    container.add([shadow, bg, heartsText]);
  }

  rebuild(initialLives);

  return {
    container,
    setLives(count: number) {
      rebuild(count);
    },
    destroy() {
      container.destroy();
    },
  };
}
