import Phaser from "phaser";
import { PARTICLES } from "./config";
import { DEPTH } from "../../design-system/tokens";
import type { MotionCluster } from "./MotionDetector";

const TEXTURE_KEY = "sand-particle";
const TEXTURE_SIZE = 8;

/** Wraps a Phaser ParticleEmitter to produce gold sand bursts from motion clusters. */
export class SandParticleSystem {
  private readonly emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private _total = 0;

  constructor(scene: Phaser.Scene) {
    if (!scene.textures.exists(TEXTURE_KEY)) {
      const gfx = scene.add.graphics();
      gfx.fillStyle(0xffffff);
      gfx.fillCircle(TEXTURE_SIZE / 2, TEXTURE_SIZE / 2, TEXTURE_SIZE / 2);
      gfx.generateTexture(TEXTURE_KEY, TEXTURE_SIZE, TEXTURE_SIZE);
      gfx.destroy();
    }

    this.emitter = scene.add
      .particles(0, 0, TEXTURE_KEY, {
        speed: { min: PARTICLES.SPEED_MIN, max: PARTICLES.SPEED_MAX },
        angle: { min: 0, max: 360 },
        gravityY: PARTICLES.GRAVITY_Y,
        lifespan: { min: PARTICLES.LIFESPAN_MIN, max: PARTICLES.LIFESPAN_MAX },
        scale: { start: 0.75, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: PARTICLES.TINT,
        frequency: -1,
        maxParticles: PARTICLES.MAX,
      })
      .setDepth(DEPTH.game);
  }

  /** Emit a burst of particles at the cluster's screen position. */
  burst(cluster: MotionCluster): void {
    const count = Math.min(
      Math.ceil(cluster.intensity * PARTICLES.PER_INTENSITY_SCALE),
      PARTICLES.BURST_MAX,
    );
    if (count < 1) return;
    this.emitter.explode(count, cluster.x, cluster.y);
    this._total += count;
  }

  /** Running total of particles emitted this session. */
  get total(): number {
    return this._total;
  }
}
