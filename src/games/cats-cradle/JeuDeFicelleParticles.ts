export const MAX_TRAILS = 90;

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  radius: number;
}

export interface TrailSegment {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  life: number;
  maxLife: number;
}

export type CordStyleForTrail = "neon" | "blueWeb" | "laser" | "arcade" | "dotted";

const BURST_PALETTE = ["#00ffff", "#ff00ff", "#ffff00", "#ff5c7a", "#2fffaa", "#ffd166"];

export class ParticleSystem {
  private particles: Particle[] = [];
  private trails: TrailSegment[] = [];

  spawnBurst(x: number, y: number): void {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 120;
      const maxLife = 400 + Math.random() * 200;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: maxLife,
        maxLife,
        color: BURST_PALETTE[Math.floor(Math.random() * BURST_PALETTE.length)],
        radius: 3 + Math.random() * 3,
      });
    }
  }

  pushTrail(from: { x: number; y: number }, to: { x: number; y: number }, color: string, style: CordStyleForTrail): void {
    if (style === "laser") return;
    this.trails.push({
      from: { ...from }, to: { ...to }, color,
      life: style === "blueWeb" ? 85 : 180,
      maxLife: style === "blueWeb" ? 85 : 180,
    });
    if (this.trails.length > MAX_TRAILS) this.trails.splice(0, this.trails.length - MAX_TRAILS);
  }

  update(delta: number): void {
    this.updateParticles(delta);
    this.updateTrails(delta);
  }

  private updateParticles(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.94;
      particle.vy *= 0.94;
      particle.life -= delta;
      if (particle.life <= 0) this.particles.splice(i, 1);
    }
  }

  private updateTrails(delta: number): void {
    for (let i = this.trails.length - 1; i >= 0; i--) {
      this.trails[i].life -= delta;
      if (this.trails[i].life <= 0) this.trails.splice(i, 1);
    }
  }

  getParticles(): Particle[] { return this.particles; }
  getTrails(): TrailSegment[] { return this.trails; }
  clearTrails(): void { this.trails = []; }
}
