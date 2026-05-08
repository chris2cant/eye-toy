import Phaser from "phaser";
import { HEX, COLOR, FONT } from "../tokens";

export interface TimerBadgeHandle {
  container: Phaser.GameObjects.Container;
  setTime(seconds: number): void;
  destroy(): void;
}

const BADGE_W = 140;
const BADGE_H = 52;
const CLOCK_RADIUS = 11;

function drawClockIcon(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number) {
  gfx.lineStyle(2, HEX.white, 0.85);
  gfx.strokeCircle(cx, cy, CLOCK_RADIUS);
  gfx.beginPath();
  gfx.moveTo(cx, cy);
  gfx.lineTo(cx, cy - CLOCK_RADIUS + 3);
  gfx.strokePath();
  gfx.beginPath();
  gfx.moveTo(cx, cy);
  gfx.lineTo(cx + CLOCK_RADIUS - 5, cy);
  gfx.strokePath();
}

function buildTimerContainer(
  scene: Phaser.Scene,
): { container: Phaser.GameObjects.Container; value: Phaser.GameObjects.Text } {
  const container = scene.add.container(0, 0);

  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.1);
  shadow.fillRoundedRect(-BADGE_W / 2 + 3, -BADGE_H / 2 + 4, BADGE_W, BADGE_H, BADGE_H / 2);

  const bg = scene.add.graphics();
  bg.fillStyle(HEX.popPurple, 1);
  bg.fillRoundedRect(-BADGE_W / 2, -BADGE_H / 2, BADGE_W, BADGE_H, BADGE_H / 2);

  const icon = scene.add.graphics();
  drawClockIcon(icon, -BADGE_W / 2 + 30, 0);

  const value = scene.add
    .text(14, 0, "60", {
      fontSize: "32px",
      fontFamily: FONT.display,
      color: COLOR.white,
    })
    .setOrigin(0.5);

  container.add([shadow, bg, icon, value]);
  return { container, value };
}

export function createTimerBadge(
  scene: Phaser.Scene,
  x: number,
  y: number,
): TimerBadgeHandle {
  const { container, value } = buildTimerContainer(scene);
  container.setPosition(x, y);

  return {
    container,
    setTime(seconds: number) {
      value.setText(String(seconds));
      value.setColor(seconds <= 10 ? COLOR.sunYellow : COLOR.white);
      if (seconds <= 10) {
        scene.tweens.add({
          targets: value,
          scaleX: 1.15,
          scaleY: 1.15,
          duration: 100,
          yoyo: true,
          ease: "Back.easeOut",
        });
      }
    },
    destroy() {
      container.destroy();
    },
  };
}
