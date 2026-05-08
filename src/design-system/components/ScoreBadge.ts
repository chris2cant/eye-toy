import Phaser from "phaser";
import { HEX, COLOR, FONT } from "../tokens";

export interface ScoreBadgeHandle {
  container: Phaser.GameObjects.Container;
  setValue(score: number, best?: number): void;
  destroy(): void;
}

const BADGE_W = 154;
const BADGE_H = 86;

function buildBestBadge(
  scene: Phaser.Scene,
  initialBest: number,
): { bestBg: Phaser.GameObjects.Graphics; bestText: Phaser.GameObjects.Text } {
  const bestBg = scene.add.graphics();
  bestBg.fillStyle(HEX.sunYellow, 1);
  bestBg.fillRoundedRect(-BADGE_W / 2 + 10, BADGE_H / 2 - 24, BADGE_W - 20, 18, 9);

  const bestText = scene.add
    .text(0, BADGE_H / 2 - 15, `BEST ${initialBest}`, {
      fontSize: "11px",
      fontFamily: FONT.ui,
      color: COLOR.nightBlue,
    })
    .setOrigin(0.5);

  return { bestBg, bestText };
}

function buildBadgeBackground(scene: Phaser.Scene): {
  shadow: Phaser.GameObjects.Graphics;
  bg: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  value: Phaser.GameObjects.Text;
} {
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.1);
  shadow.fillRoundedRect(-BADGE_W / 2 + 3, -BADGE_H / 2 + 5, BADGE_W, BADGE_H, 20);

  const bg = scene.add.graphics();
  bg.fillStyle(HEX.nightBlue, 1);
  bg.fillRoundedRect(-BADGE_W / 2, -BADGE_H / 2, BADGE_W, BADGE_H, 20);

  const label = scene.add
    .text(0, -BADGE_H / 2 + 18, "SCORE", {
      fontSize: "13px",
      fontFamily: FONT.ui,
      color: COLOR.white,
    })
    .setOrigin(0.5)
    .setAlpha(0.55);

  const value = scene.add
    .text(0, -BADGE_H / 2 + 44, "0", {
      fontSize: "38px",
      fontFamily: FONT.display,
      color: COLOR.white,
    })
    .setOrigin(0.5);

  return { shadow, bg, label, value };
}

export function createScoreBadge(
  scene: Phaser.Scene,
  x: number,
  y: number,
  initialBest = 0,
): ScoreBadgeHandle {
  const container = scene.add.container(x, y);
  const { shadow, bg, label, value } = buildBadgeBackground(scene);
  const { bestBg, bestText } = buildBestBadge(scene, initialBest);
  container.add([shadow, bg, label, bestBg, bestText, value]);

  return {
    container,
    setValue(score: number, best?: number) {
      value.setText(String(score));
      if (best !== undefined) bestText.setText(`BEST ${best}`);
      scene.tweens.add({
        targets: value,
        scaleX: 1.18,
        scaleY: 1.18,
        duration: 80,
        yoyo: true,
        ease: "Back.easeOut",
      });
    },
    destroy() {
      container.destroy();
    },
  };
}
