import Phaser from "phaser";
import { PARTICLES } from "./config";
import { DEPTH } from "../../design-system/tokens";

const TEXTURE_KEY = "sand-particle";
const TEXTURE_SIZE = 7;

function hslToHex(hue: number, saturation: number, lightness: number): number {
  const chroma = saturation * Math.min(lightness, 1 - lightness);
  const channelValue = (sector: number): number => {
    const k = (sector + hue / 30) % 12;
    return lightness - chroma * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  const red = Math.round(channelValue(0) * 255);
  const green = Math.round(channelValue(8) * 255);
  const blue = Math.round(channelValue(4) * 255);
  return (red << 16) | (green << 8) | blue;
}

export class SandParticleSystem {
  private readonly emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly deathRect: Phaser.Geom.Rectangle;
  private _total = 0;
  private hue = 0;
  private currentTint = 0xf4c542;

  constructor(scene: Phaser.Scene) {
    if (!scene.textures.exists(TEXTURE_KEY)) {
      const gfx = scene.add.graphics();
      gfx.fillStyle(0xffffff);
      gfx.fillCircle(TEXTURE_SIZE / 2, TEXTURE_SIZE / 2, TEXTURE_SIZE / 2);
      gfx.generateTexture(TEXTURE_KEY, TEXTURE_SIZE, TEXTURE_SIZE);
      gfx.destroy();
    }

    this.deathRect = new Phaser.Geom.Rectangle(
      0, 0, scene.scale.width, scene.scale.height,
    );

    this.emitter = scene.add
      .particles(0, 0, TEXTURE_KEY, {
        speed: { min: PARTICLES.SPEED_MIN, max: PARTICLES.SPEED_MAX },
        angle: { min: PARTICLES.ANGLE_MIN, max: PARTICLES.ANGLE_MAX },
        gravityY: PARTICLES.GRAVITY_Y,
        lifespan: { min: PARTICLES.LIFESPAN_MIN, max: PARTICLES.LIFESPAN_MAX },
        scale: { start: 0.9, end: 0.5 },
        alpha: { start: 1, end: 0.85 },
        frequency: -1,
        reserve: 600,
        deathZone: { type: "onLeave", source: this.deathRect },
        emitCallback: (particle: Phaser.GameObjects.Particles.Particle) => {
          particle.tint = this.currentTint;
        },
      })
      .setDepth(DEPTH.game);
  }

  updateBounds(width: number, height: number): void {
    this.deathRect.setTo(0, 0, width, height);
  }

  update(delta: number): void {
    this.hue = (this.hue + PARTICLES.HUE_SPEED * (delta / 1000)) % 360;
    this.currentTint = hslToHex(this.hue, 0.82, 0.58);
  }

  spawnAt(x: number, y: number, count: number): void {
    if (count < 1) return;
    this.emitter.explode(count, x, y);
    this._total += count;
  }

  get total(): number {
    return this._total;
  }
}
