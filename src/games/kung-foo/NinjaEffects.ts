import { DEPTH } from "../../design-system/tokens";

export function spawnNinjaDeathParticles(
  scene: Phaser.Scene,
  origin: { x: number; y: number },
  burstColor: number,
): void {
  const numParticles = 10;
  for (let index = 0; index < numParticles; index++) {
    const theta = (index / numParticles) * Math.PI * 2;
    const particle = scene.add.graphics();
    particle.fillStyle(burstColor, 1);
    particle.fillRect(-5, -5, 10, 10);
    particle.x = origin.x;
    particle.y = origin.y - 20;
    particle.setDepth(DEPTH.topUi);
    const dist = 55 + Math.random() * 50;
    scene.tweens.add({
      targets: particle,
      x: origin.x + Math.cos(theta) * dist,
      y: origin.y - 20 + Math.sin(theta) * dist - 20,
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      duration: 480,
      ease: "Power2.Out",
      onComplete: () => particle.destroy(),
    });
  }
}

export function spawnNinjaDeathFlash(scene: Phaser.Scene, owner: Phaser.GameObjects.Container): void {
  const flash = scene.add.graphics();
  owner.add(flash);
  flash.fillStyle(0xffffff, 0.9);
  flash.fillCircle(0, -20, 62);
  scene.tweens.add({
    targets: flash,
    alpha: 0,
    scaleX: 2.2,
    scaleY: 2.2,
    duration: 220,
    onComplete: () => flash.destroy(),
  });
}
