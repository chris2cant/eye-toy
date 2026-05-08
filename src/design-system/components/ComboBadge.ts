import Phaser from "phaser";
import { HEX, COLOR, FONT } from "../tokens";

const STAR_RADIUS = 52;
const STAR_INNER_RATIO = 0.62;
const SPIKE_COUNT = 8;

function drawStarburst(
  scene: Phaser.Scene,
  color: number,
): Phaser.GameObjects.Graphics {
  const burst = scene.add.graphics();
  burst.fillStyle(color, 1);
  burst.beginPath();
  for (let index = 0; index < SPIKE_COUNT * 2; index++) {
    const radius = index % 2 === 0 ? STAR_RADIUS : STAR_RADIUS * STAR_INNER_RATIO;
    const angle = (Math.PI / SPIKE_COUNT) * index - Math.PI / 2;
    if (index === 0) burst.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    else burst.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  burst.closePath();
  burst.fillPath();
  return burst;
}

function animateCombo(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
): void {
  scene.tweens.add({
    targets: container,
    scaleX: 1,
    scaleY: 1,
    duration: 140,
    ease: "Back.easeOut",
    onComplete: () => {
      scene.tweens.add({
        targets: container,
        scaleX: 1.06,
        scaleY: 1.06,
        duration: 400,
        yoyo: true,
        repeat: 1,
        ease: "Sine.easeInOut",
        onComplete: () => {
          scene.tweens.add({
            targets: container,
            alpha: 0,
            duration: 400,
            delay: 200,
            onComplete: () => container.destroy(),
          });
        },
      });
    },
  });
}

export function showCombo(
  scene: Phaser.Scene,
  x: number,
  y: number,
  multiplier: number,
) {
  const container = scene.add.container(x, y).setDepth(38);

  const burst = drawStarburst(scene, HEX.sunYellow);
  const label = scene.add
    .text(0, 0, `x${multiplier}`, {
      fontSize: "36px",
      fontFamily: FONT.display,
      color: COLOR.nightBlue,
    })
    .setOrigin(0.5);

  container.add([burst, label]);
  container.setScale(0.6);

  animateCombo(scene, container);
}
