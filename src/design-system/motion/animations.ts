import Phaser from "phaser";
import { HEX } from "../tokens";

type Scalable = Phaser.GameObjects.GameObject & {
  setScale(s: number): unknown;
  x: number;
};
type Fadeable = Scalable & { setAlpha(a: number): unknown };

const CONFETTI_COLORS = [
  HEX.punchyPink,
  HEX.sunYellow,
  HEX.turquoise,
  HEX.popPurple,
  0xff8c42,
];

export function popIn(scene: Phaser.Scene, obj: Scalable) {
  obj.setScale(0.85);
  scene.tweens.add({
    targets: obj,
    scaleX: 1,
    scaleY: 1,
    duration: 140,
    ease: "Back.easeOut",
  });
}

export function pulse(
  scene: Phaser.Scene,
  obj: Phaser.GameObjects.GameObject,
): Phaser.Tweens.Tween {
  return scene.tweens.add({
    targets: obj,
    scaleX: 1.08,
    scaleY: 1.08,
    duration: 650,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });
}

export function hitFeedback(
  scene: Phaser.Scene,
  obj: Fadeable,
  onComplete?: () => void,
) {
  scene.tweens.add({
    targets: obj,
    scaleX: 1.35,
    scaleY: 1.35,
    alpha: 0,
    duration: 300,
    ease: "Cubic.easeOut",
    onComplete: () => onComplete?.(),
  });
}

export function shake(scene: Phaser.Scene, obj: Scalable) {
  const startX = obj.x;
  scene.tweens.add({
    targets: obj,
    x: startX + 8,
    duration: 45,
    yoyo: true,
    repeat: 3,
    ease: "Linear",
    onComplete: () => {
      obj.x = startX;
    },
  });
}

export function confetti(
  scene: Phaser.Scene,
  x: number,
  y: number,
  count = 20,
) {
  for (let i = 0; i < count; i++) {
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const gfx = scene.add.graphics();
    const confettiWidth = Phaser.Math.Between(6, 14);
    const confettiHeight = Phaser.Math.Between(4, 8);
    gfx.fillStyle(color, 1);
    gfx.fillRect(-confettiWidth / 2, -confettiHeight / 2, confettiWidth, confettiHeight);
    gfx.setPosition(x, y);
    gfx.setDepth(50);

    const angle = Phaser.Math.Between(0, 360);
    const speed = Phaser.Math.Between(130, 280);
    const vx = Math.cos(Phaser.Math.DegToRad(angle)) * speed;
    const vy = Math.sin(Phaser.Math.DegToRad(angle)) * speed - 100;

    scene.tweens.add({
      targets: gfx,
      x: gfx.x + vx * 0.9,
      y: gfx.y + vy * 0.9 + 140,
      angle: Phaser.Math.Between(-200, 200),
      alpha: 0,
      duration: Phaser.Math.Between(600, 950),
      ease: "Cubic.easeOut",
      onComplete: () => gfx.destroy(),
    });
  }
}
