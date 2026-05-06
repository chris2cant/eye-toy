import Phaser from "phaser";
import { handTracker } from "../../camera/HandTracker";
import type { LandmarksPayload, HandLandmark } from "../../camera/HandTracker";
import { COLOR, FONT, DEPTH, HEX } from "../../design-system/tokens";
import { DwellButton } from "../../design-system/DwellButton";
import { HandCursors } from "../../design-system/HandCursors";
import { WebcamLayer } from "../../scenes/WebcamLayer";

const FINGERTIP_INDICES = [4, 8, 12, 16, 20];

// Stable control-point offsets per finger to simulate cord droop
const CORD_SWAY = [8, -10, 6, -8, 10];

// Cross-finger connections: [left hand tip index, right hand tip index]
const CROSS_CONNECTIONS: [number, number][] = [
  [1, 2],
  [2, 1],
  [0, 1],
  [3, 4],
  [1, 3],
  [4, 2],
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  radius: number;
}

interface CordSpec {
  from: { x: number; y: number };
  to: { x: number; y: number };
  distT: number;
  fingerIndex: number;
  isCross: boolean;
}

export class JeuDeFicelleScene extends Phaser.Scene {
  private webcam!: WebcamLayer;
  private overlayTex!: Phaser.Textures.CanvasTexture;
  private btnBack!: DwellButton;
  private cursors!: HandCursors;
  private scoreTxt!: Phaser.GameObjects.Text;

  private handPositions: ({ x: number; y: number } | null)[] = [null, null, null, null];
  private rawLandmarks: (HandLandmark[] | null)[] = [null, null, null, null];

  // Smoothed fingertip positions [hand][finger] — jusqu'à 4 mains
  private smoothTips: ({ x: number; y: number } | null)[][] = [
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null],
  ];

  // Mains regroupées par joueur : [J1_main_a, J1_main_b] et [J2_main_a, J2_main_b]
  // indexées dans smoothTips / handPositions
  private playerHandIndices: [number[], number[]] = [[], []];

  private particles: Particle[] = [];
  private touchCount = 0;
  private prevTouching = false;

  constructor() {
    super({ key: "JeuDeFicelleScene" });
  }

  async create() {
    const { width, height } = this.scale;

    const videoEl = await handTracker.initCamera();
    this.webcam = new WebcamLayer(this);
    this.webcam.setup(videoEl, width, height);

    await handTracker.initDetector();
    handTracker.start();
    handTracker.on("landmarks", this.onLandmarks, this);

    if (this.textures.exists("catscradle-fx")) this.textures.remove("catscradle-fx");
    const tex = this.textures.createCanvas("catscradle-fx", width, height);
    if (!tex) throw new Error("createCanvas failed");
    this.overlayTex = tex;
    this.add
      .image(width / 2, height / 2, "catscradle-fx")
      .setDepth(DEPTH.overlay + 1);

    this.cursors = new HandCursors(this, DEPTH.cursor);
    this.buildUI(width, height);

    this.events.once("shutdown", () => {
      handTracker.off("landmarks", this.onLandmarks, this);
    });
  }

  private buildUI(width: number, height: number): void {
    this.add
      .rectangle(width / 2, 0, width, 56, HEX.bgCanvas, 0.72)
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.hud - 1);

    this.scoreTxt = this.add
      .text(width - 20, 14, "TOUCHES  0", {
        fontSize: "22px",
        fontFamily: FONT.identity,
        color: COLOR.brandPrimary,
        shadow: { offsetX: 0, offsetY: 0, color: COLOR.brandPrimary, blur: 12, fill: true },
      })
      .setOrigin(1, 0)
      .setDepth(DEPTH.topUi);

    this.btnBack = new DwellButton(this, 100, height * 0.12, {
      label: "← MENU",
      fontSize: "20px",
      onActivate: () => this.scene.start("MenuScene"),
      depth: DEPTH.hud,
      dwellMs: 1000,
    });

    this.add
      .text(width / 2, height * 0.94, "Tends tes deux mains — crée des cordes lumineuses", {
        fontSize: "14px",
        fontFamily: FONT.ui,
        color: COLOR.textMuted,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
  }

  private onLandmarks = ({ hands }: LandmarksPayload): void => {
    this.rawLandmarks = [null, null, null, null];
    this.handPositions = [null, null, null, null];
    const { width, height } = this.scale;
    const mapper = this.webcam.getLandmarkMapper(width, height);

    hands.forEach((hand, i) => {
      if (!hand || hand.length === 0 || i >= 4) return;
      this.rawLandmarks[i] = hand;
      const palm = hand[9];
      const { x, y } = mapper(palm.x, palm.y);
      this.handPositions[i] = { x, y };
    });

    // Grouper les mains par moitié d'écran : gauche = J1, droite = J2
    const p1: number[] = [];
    const p2: number[] = [];
    for (let i = 0; i < 4; i++) {
      const pos = this.handPositions[i];
      if (!pos) continue;
      if (pos.x < width / 2) p1.push(i);
      else p2.push(i);
    }
    this.playerHandIndices = [p1, p2];
  };

  update(_time: number, delta: number): void {
    if (!this.webcam) return;
    this.webcam.render();
    this.updateSmoothedTips();
    this.updateParticles(delta);
    this.checkCollisions();
    this.drawOverlay();
    this.cursors.update(this.handPositions);
    this.btnBack.update(this.handPositions, delta);
  }

  private updateSmoothedTips(): void {
    const { width, height } = this.scale;
    const mapper = this.webcam.getLandmarkMapper(width, height);
    const LERP = 0.55;

    for (let hi = 0; hi < 4; hi++) {
      const hand = this.rawLandmarks[hi];
      if (!hand) {
        this.smoothTips[hi] = [null, null, null, null, null];
        continue;
      }
      for (let fi = 0; fi < FINGERTIP_INDICES.length; fi++) {
        const lm = hand[FINGERTIP_INDICES[fi]];
        const mapped = mapper(lm.x, lm.y);
        const prev = this.smoothTips[hi][fi];
        if (!prev) {
          this.smoothTips[hi][fi] = { ...mapped };
        } else {
          prev.x += (mapped.x - prev.x) * LERP;
          prev.y += (mapped.y - prev.y) * LERP;
        }
      }
    }
  }

  private drawOverlay(): void {
    const { width, height } = this.scale;
    const ctx = this.overlayTex.getContext();
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(0, 5, 20, 0.40)";
    ctx.fillRect(0, 0, width, height);
    this.drawScanlines(ctx, width, height);

    // Dessiner les cordes pour chaque joueur (mains dans la même moitié d'écran)
    for (const indices of this.playerHandIndices) {
      if (indices.length < 2) continue;
      const t0 = this.smoothTips[indices[0]];
      const t1 = this.smoothTips[indices[1]];
      if (!t0.some((tip) => tip !== null) || !t1.some((tip) => tip !== null)) continue;
      const palm0 = this.handPositions[indices[0]];
      const palm1 = this.handPositions[indices[1]];
      const distT =
        palm0 && palm1
          ? Math.min(Math.hypot(palm0.x - palm1.x, palm0.y - palm1.y) / (width * 0.6), 1)
          : 0;
      this.drawCords(ctx, t0, t1, distT);
    }

    this.drawLandmarkDots(ctx);
    this.drawParticleLayer(ctx);
    this.overlayTex.refresh();
  }

  private drawScanlines(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    ctx.globalAlpha = 0.03;
    ctx.fillStyle = "#000";
    for (let scanY = 0; scanY < height; scanY += 4) ctx.fillRect(0, scanY, width, 1);
    ctx.restore();
  }

  private drawCords(
    ctx: CanvasRenderingContext2D,
    t0: ({ x: number; y: number } | null)[],
    t1: ({ x: number; y: number } | null)[],
    distT: number,
  ): void {
    for (let fi = 0; fi < 5; fi++) {
      const tipLeft = t0[fi];
      const tipRight = t1[fi];
      if (tipLeft && tipRight)
        this.drawCord(ctx, { from: tipLeft, to: tipRight, distT, fingerIndex: fi, isCross: false });
    }
    for (const [li, ri] of CROSS_CONNECTIONS) {
      const tipLeft = t0[li];
      const tipRight = t1[ri];
      if (tipLeft && tipRight)
        this.drawCord(ctx, { from: tipLeft, to: tipRight, distT, fingerIndex: (li + ri) % 5, isCross: true });
    }
  }

  private drawLandmarkDots(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.scale;
    const mapper = this.webcam.getLandmarkMapper(width, height);
    for (let hi = 0; hi < 4; hi++) {
      const hand = this.rawLandmarks[hi];
      if (!hand) continue;
      for (let li = 0; li < hand.length; li++) {
        const { x, y } = mapper(hand[li].x, hand[li].y);
        const color = this.lmColor(li);
        const dotRadius = FINGERTIP_INDICES.includes(li) ? 5 : 3.5;
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 18;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  private drawParticleLayer(ctx: CanvasRenderingContext2D): void {
    for (const particle of this.particles) {
      const alpha = particle.life / particle.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private lmColor(index: number): string {
    const ratio = index / 20;
    if (ratio < 0.5) {
      const blend = ratio * 2;
      return `rgb(${Math.round(blend * 255)},${Math.round((1 - blend) * 255)},255)`;
    }
    const blend = (ratio - 0.5) * 2;
    return `rgb(255,${Math.round(blend * 255)},${Math.round((1 - blend) * 255)})`;
  }

  private drawCord(ctx: CanvasRenderingContext2D, spec: CordSpec): void {
    const { from, to, distT, fingerIndex, isCross } = spec;
    // Hue shifts from cyan (180) toward orange/red (30) as distance grows
    const hue = Math.round(180 - distT * 150 + fingerIndex * 14);
    const color = `hsl(${hue}, 100%, ${60 + distT * 10}%)`;
    const lineWidth = isCross ? 1.5 : Math.max(1.5, 3 - distT * 1.5);
    const blur = isCross ? 14 : 26;

    // Stable droop control point
    const sway = CORD_SWAY[fingerIndex];
    const mx = (from.x + to.x) / 2 + sway;
    const my = (from.y + to.y) / 2 + Math.abs(sway) * 0.5;

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(mx, my, to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }

  private checkCollisions(): void {
    let touching = false;

    for (const indices of this.playerHandIndices) {
      if (indices.length < 2) continue;
      const t0 = this.smoothTips[indices[0]];
      const t1 = this.smoothTips[indices[1]];
      for (let fi = 0; fi < 5; fi++) {
        const tipLeft = t0[fi];
        const tipRight = t1[fi];
        if (!tipLeft || !tipRight) continue;
        if (Math.hypot(tipLeft.x - tipRight.x, tipLeft.y - tipRight.y) < 30) {
          touching = true;
          if (!this.prevTouching) {
            this.touchCount++;
            this.scoreTxt.setText(`TOUCHES  ${this.touchCount}`);
            this.spawnBurst((tipLeft.x + tipRight.x) / 2, (tipLeft.y + tipRight.y) / 2);
          }
          break;
        }
      }
      if (touching) break;
    }
    this.prevTouching = touching;
  }

  private spawnBurst(x: number, y: number): void {
    const palette = ["#00ffff", "#ff00ff", "#ffff00", "#ff5c7a", "#2fffaa", "#ffd166"];
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 120;
      const maxLife = 400 + Math.random() * 200;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: maxLife,
        maxLife,
        color: palette[Math.floor(Math.random() * palette.length)],
        radius: 3 + Math.random() * 3,
      });
    }
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
}
