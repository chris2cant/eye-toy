import Phaser from "phaser";
import { audioFX } from "../audio/AudioFX";
import { HEX, COLOR, FONT, DEPTH } from "../design-system/tokens";

const POP_TWEEN_MS = 180;
const EXPIRE_TWEEN_MS = 350;
const PARTICLE_COUNT = 5;
const PARTICLE_ORBIT_FACTOR = 1.65;

const FLOAT_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: "28px",
  fontFamily: FONT.identity,
  color: COLOR.brandPrimary,
  stroke: COLOR.bgCanvas,
  strokeThickness: 3,
};

export interface PopCircleRef {
  container: Phaser.GameObjects.Container;
  core: Phaser.GameObjects.Graphics;
  pulseRings: Phaser.GameObjects.Graphics[];
  pulseTweens: Phaser.Tweens.Tween[];
  particles: Phaser.GameObjects.Graphics[];
  radius: number;
  points: number;
}

export function animatePop(scene: Phaser.Scene, circle: PopCircleRef): void {
  const orbitR = circle.radius * PARTICLE_ORBIT_FACTOR;
  circle.particles.forEach((particle, index) => {
    const angle = (index * Math.PI * 2) / PARTICLE_COUNT;
    scene.tweens.add({
      targets: particle,
      x: Math.cos(angle) * orbitR * 3.2,
      y: Math.sin(angle) * orbitR * 3.2,
      alpha: 0, scaleX: 1.8, scaleY: 1.8,
      duration: POP_TWEEN_MS * 2.2, ease: "Power2.Out",
    });
  });
  scene.tweens.add({
    targets: circle.core,
    scaleX: 2.2, scaleY: 2.2, alpha: 0,
    duration: POP_TWEEN_MS, ease: "Power2.Out",
  });
  circle.pulseRings.forEach((ring) => {
    scene.tweens.add({
      targets: ring, scaleX: 3.5, scaleY: 3.5, alpha: 0,
      duration: POP_TWEEN_MS * 1.8, ease: "Power2.Out",
    });
  });
  scene.time.delayedCall(POP_TWEEN_MS * 2.5, () => circle.container.destroy());
}

interface FloatTextSpec { x: number; y: number; label: string; color: string; }

function spawnFloatText(scene: Phaser.Scene, spec: FloatTextSpec): void {
  const { x, y, label, color } = spec;
  const txt = scene.add.text(x, y, label, { ...FLOAT_TEXT_STYLE, color }).setOrigin(0.5).setDepth(DEPTH.game + 5);
  scene.tweens.add({
    targets: txt, y: y - 60, alpha: 0, duration: 600, ease: "Power1.Out",
    onComplete: () => txt.destroy(),
  });
}

export function triggerPop(scene: Phaser.Scene, circle: PopCircleRef, onScore: (delta: number) => void): void {
  circle.pulseTweens.forEach((tween) => tween.stop());
  onScore(circle.points);
  audioFX.pop();
  spawnFloatText(scene, { x: circle.container.x, y: circle.container.y, label: `+${circle.points}`, color: "#ffff00" });
  animatePop(scene, circle);
}

export function triggerExpire(
  scene: Phaser.Scene,
  circle: PopCircleRef & { circleColor?: number },
  onScore: (delta: number) => void,
  drawCore: (gfx: Phaser.GameObjects.Graphics, color: number, radius: number) => void,
): void {
  onScore(-5);
  audioFX.expire();
  spawnFloatText(scene, { x: circle.container.x, y: circle.container.y, label: "-5", color: "#ff4444" });
  circle.pulseTweens.forEach((tween) => tween.stop());
  drawCore(circle.core, HEX.danger, circle.radius);
  scene.tweens.add({
    targets: circle.container,
    scaleX: 0, scaleY: 0, alpha: 0,
    duration: EXPIRE_TWEEN_MS, ease: "Power2.In",
    onComplete: () => circle.container.destroy(),
  });
}
