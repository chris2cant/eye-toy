import Phaser from "phaser";
import { handTracker } from "../../camera/HandTracker";
import type { LandmarksPayload } from "../../camera/HandTracker";
import { COLOR, FONT, DEPTH, HEX } from "../../design-system/tokens";
import { DwellButton } from "../../design-system/DwellButton";
import { HandCursors } from "../../design-system/HandCursors";
import { WebcamLayer } from "../../scenes/WebcamLayer";

const FINGERTIP_INDICES = [4, 8, 12, 16, 20];
const FICELLE_TRACKER_FPS = 22;
const FICELLE_WEBCAM_FPS = 15;
const FICELLE_OVERLAY_FPS = 30;
const FICELLE_OVERLAY_FRAME_MS = 1000 / FICELLE_OVERLAY_FPS;

const FINGER_PALETTE = ["#25f4e1", "#ff5c7a", "#ffd166", "#a78bfa", "#2fffaa"];
const STYLE_NAMES = ["TOILE BLEUE 5x5", "NEON FIN", "LASER BLANC", "ARCADE", "POINTILLES"];
const RESONANCE_MS = 520;
const SMOOTH_BASE_SPEED = 18;
const SMOOTH_FAST_SPEED = 42;
const MAX_TRAILS = 90;

type Point = { x: number; y: number };
type CordStyle = "neon" | "blueWeb" | "laser" | "arcade" | "dotted";

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
  from: Point;
  to: Point;
  distT: number;
  fromFingerIndex: number;
  toFingerIndex: number;
  linkIndex: number;
}

interface TrailSegment {
  from: Point;
  to: Point;
  color: string;
  life: number;
  maxLife: number;
}

export class JeuDeFicelleScene extends Phaser.Scene {
  private webcam!: WebcamLayer;
  private overlayTex!: Phaser.Textures.CanvasTexture;
  private btnBack!: DwellButton;
  private cursors!: HandCursors;
  private statusTxt!: Phaser.GameObjects.Text;
  private styleTxt!: Phaser.GameObjects.Text;
  private atmosphereCanvas!: HTMLCanvasElement;

  private handPositions: (Point | null)[] = [null, null, null, null];
  private targetTips: (Point | null)[][] = [
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null],
  ];

  // Smoothed fingertip positions [hand][finger] — jusqu'à 4 mains
  private smoothTips: (Point | null)[][] = [
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null],
  ];

  // Mains regroupées par joueur : [J1_main_a, J1_main_b] et [J2_main_a, J2_main_b]
  // indexées dans smoothTips / handPositions
  private playerHandIndices: [number[], number[]] = [[], []];

  private particles: Particle[] = [];
  private trails: TrailSegment[] = [];
  private prevTouching = false;
  private nextOverlayRenderAt = 0;
  private visualTime = 0;
  private lastResonanceAt = -RESONANCE_MS;
  private statusResetEvent?: Phaser.Time.TimerEvent;
  private currentStyleIndex = 0;

  constructor() {
    super({ key: "JeuDeFicelleScene" });
  }

  async create() {
    const { width, height } = this.scale;

    const videoEl = await handTracker.initCamera();
    this.webcam = new WebcamLayer(this);
    this.webcam.setup(videoEl, width, height);

    await handTracker.initDetector({ numHands: 4 });
    handTracker.start({ targetFps: FICELLE_TRACKER_FPS });
    handTracker.on("landmarks", this.onLandmarks, this);

    if (this.textures.exists("catscradle-fx")) this.textures.remove("catscradle-fx");
    const tex = this.textures.createCanvas("catscradle-fx", width, height);
    if (!tex) throw new Error("createCanvas failed");
    this.overlayTex = tex;
    this.add
      .image(width / 2, height / 2, "catscradle-fx")
      .setDepth(DEPTH.overlay + 1);
    this.atmosphereCanvas = this.createAtmosphereCanvas(width, height);

    this.cursors = new HandCursors(this, DEPTH.cursor);
    this.buildUI(width, height);
    this.input.keyboard?.on("keydown-M", this.cycleCordStyle, this);
    this.input.keyboard?.on("keydown-SPACE", this.cycleCordStyle, this);

    this.events.once("shutdown", () => {
      handTracker.off("landmarks", this.onLandmarks, this);
      this.input.keyboard?.off("keydown-M", this.cycleCordStyle, this);
      this.input.keyboard?.off("keydown-SPACE", this.cycleCordStyle, this);
    });
  }

  private buildUI(width: number, height: number): void {
    this.add
      .rectangle(width / 2, 0, width, 56, HEX.bgCanvas, 0.72)
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.hud - 1);

    this.statusTxt = this.add
      .text(width - 20, 14, "MODE FICELLE LIBRE", {
        fontSize: "22px",
        fontFamily: FONT.identity,
        color: COLOR.brandPrimary,
        shadow: { offsetX: 0, offsetY: 0, color: COLOR.brandPrimary, blur: 12, fill: true },
      })
      .setOrigin(1, 0)
      .setDepth(DEPTH.topUi);

    this.styleTxt = this.add
      .text(width / 2, 14, this.getStyleLabel(), {
        fontSize: "18px",
        fontFamily: FONT.identity,
        color: COLOR.textPrimary,
        shadow: { offsetX: 0, offsetY: 0, color: COLOR.brandPrimary, blur: 10, fill: true },
      })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.topUi);

    this.btnBack = new DwellButton(this, 100, height * 0.12, {
      label: "← MENU",
      fontSize: "20px",
      onActivate: () => this.scene.start("MenuScene", { selectedGameKey: this.sys.settings.key }),
      depth: DEPTH.hud,
      dwellMs: 1000,
    });

    this.add
      .text(width / 2, height * 0.94, "Tends tes mains, rapproche les doigts, fais vibrer les fils — M ou ESPACE change le style", {
        fontSize: "14px",
        fontFamily: FONT.ui,
        color: COLOR.textMuted,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
  }

  private onLandmarks = ({ hands }: LandmarksPayload): void => {
    this.handPositions = [null, null, null, null];
    this.targetTips = [
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
    ];
    const { width, height } = this.scale;
    const mapper = this.webcam.getLandmarkMapper(width, height);

    hands.forEach((hand, i) => {
      if (!hand || hand.length === 0 || i >= 4) return;
      const palm = hand[9];
      const { x, y } = mapper(palm.x, palm.y);
      this.handPositions[i] = { x, y };
      for (let fi = 0; fi < FINGERTIP_INDICES.length; fi++) {
        const lm = hand[FINGERTIP_INDICES[fi]];
        this.targetTips[i][fi] = mapper(lm.x, lm.y);
      }
    });

    const detectedHandIndices = this.handPositions
      .map((pos, i) => (pos ? i : null))
      .filter((i): i is number => i !== null);

    if (detectedHandIndices.length <= 2) {
      this.playerHandIndices = [detectedHandIndices, []];
      return;
    }

    // A partir de 3 mains, passer en mode 2 joueurs auto par moitié d'écran.
    const p1: number[] = [];
    const p2: number[] = [];
    for (const i of detectedHandIndices) {
      const pos = this.handPositions[i];
      if (!pos) continue;
      if (pos.x < width / 2) p1.push(i);
      else p2.push(i);
    }
    this.playerHandIndices = [p1, p2];
  };

  update(time: number, delta: number): void {
    if (!this.webcam) return;
    this.visualTime = time;
    this.webcam.render(time, FICELLE_WEBCAM_FPS);
    this.updateSmoothedTips(delta);
    this.updateParticles(delta);
    this.updateTrails(delta);
    this.checkCollisions();
    if (time >= this.nextOverlayRenderAt) {
      this.drawOverlay();
      this.nextOverlayRenderAt = time + FICELLE_OVERLAY_FRAME_MS;
    }
    this.cursors.update(this.handPositions);
    this.btnBack.update(this.handPositions, delta);
  }

  private updateSmoothedTips(delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    for (let hi = 0; hi < 4; hi++) {
      for (let fi = 0; fi < FINGERTIP_INDICES.length; fi++) {
        const target = this.targetTips[hi][fi];
        if (!target) {
          this.smoothTips[hi][fi] = null;
          continue;
        }
        const prev = this.smoothTips[hi][fi];
        if (!prev) {
          this.smoothTips[hi][fi] = { ...target };
        } else {
          const dist = Math.hypot(target.x - prev.x, target.y - prev.y);
          const speed = dist > 44 ? SMOOTH_FAST_SPEED : SMOOTH_BASE_SPEED;
          const alpha = 1 - Math.exp(-speed * dt);
          prev.x += (target.x - prev.x) * alpha;
          prev.y += (target.y - prev.y) * alpha;
        }
      }
    }
  }

  private drawOverlay(): void {
    const { width, height } = this.scale;
    const ctx = this.overlayTex.getContext();
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(this.atmosphereCanvas, 0, 0);
    this.drawResonanceWash(ctx, width, height);
    this.drawTrailLayer(ctx);

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
      this.drawCords(ctx, t0, t1, distT, this.currentCordStyle);
    }

    this.drawFingertipDots(ctx);
    this.drawParticleLayer(ctx);
    this.overlayTex.refresh();
  }

  private createAtmosphereCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;
    const cx = width / 2;
    const cy = height / 2;
    const glow = ctx.createRadialGradient(cx, cy, height * 0.08, cx, cy, Math.max(width, height) * 0.72);

    glow.addColorStop(0, "rgba(37, 244, 225, 0.09)");
    glow.addColorStop(0.45, "rgba(5, 12, 32, 0.34)");
    glow.addColorStop(1, "rgba(0, 4, 16, 0.68)");

    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = "#25f4e1";
    ctx.lineWidth = 1;
    for (let x = width * 0.08; x < width; x += 72) {
      ctx.beginPath();
      ctx.moveTo(x, height * 0.18);
      ctx.lineTo(x - width * 0.08, height);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.03;
    ctx.fillStyle = "#000";
    for (let scanY = 0; scanY < height; scanY += 4) ctx.fillRect(0, scanY, width, 1);
    ctx.restore();

    return canvas;
  }

  private drawResonanceWash(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const resonanceT = Math.max(0, 1 - (this.visualTime - this.lastResonanceAt) / RESONANCE_MS);
    if (resonanceT <= 0) return;
    const cx = width / 2;
    const cy = height / 2;
    const glow = ctx.createRadialGradient(cx, cy, height * 0.05, cx, cy, Math.max(width, height) * 0.62);

    glow.addColorStop(0, `rgba(255, 255, 255, ${0.03 * resonanceT})`);
    glow.addColorStop(0.42, `rgba(37, 244, 225, ${0.12 * resonanceT})`);
    glow.addColorStop(1, "rgba(37, 244, 225, 0)");

    ctx.save();
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  private drawCords(
    ctx: CanvasRenderingContext2D,
    t0: (Point | null)[],
    t1: (Point | null)[],
    distT: number,
    style: CordStyle,
  ): void {
    let linkIndex = 0;

    if (style === "blueWeb") {
      for (let li = 0; li < 5; li++) {
        const tipLeft = t0[li];
        if (!tipLeft) continue;
        for (let ri = 0; ri < 5; ri++) {
          const tipRight = t1[ri];
          if (!tipRight) continue;
          const color = this.getCordColor(style, li, ri, linkIndex);
          this.drawCord(ctx, {
            from: tipLeft,
            to: tipRight,
            distT,
            fromFingerIndex: li,
            toFingerIndex: ri,
            linkIndex,
          });
          this.pushTrail(tipLeft, tipRight, color, style);
          linkIndex++;
        }
      }
      return;
    }

    for (let fi = 0; fi < 5; fi++) {
      const tipLeft = t0[fi];
      const tipRight = t1[fi];
      if (tipLeft && tipRight) {
        const color = this.getCordColor(style, fi, fi, linkIndex);
        this.drawCord(ctx, {
          from: tipLeft,
          to: tipRight,
          distT,
          fromFingerIndex: fi,
          toFingerIndex: fi,
          linkIndex,
        });
        this.pushTrail(tipLeft, tipRight, color, style);
        linkIndex++;
      }
    }
  }

  private drawFingertipDots(ctx: CanvasRenderingContext2D): void {
    const isBlueWeb = this.currentCordStyle === "blueWeb";
    for (let hi = 0; hi < 4; hi++) {
      for (let fi = 0; fi < 5; fi++) {
        const tip = this.smoothTips[hi][fi];
        if (!tip) continue;
        const color = isBlueWeb ? (fi % 2 === 0 ? COLOR.brandPrimary : COLOR.info) : FINGER_PALETTE[fi];
        const outerRadius = isBlueWeb ? 18 : 14;
        const coreRadius = isBlueWeb ? 5.8 : 4.8;

        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = isBlueWeb ? 34 : 24;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.globalAlpha = isBlueWeb ? 0.18 : 0.14;
        ctx.arc(tip.x, tip.y, outerRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = isBlueWeb ? 0.55 : 0.42;
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, outerRadius * 0.48, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.95;
        ctx.shadowBlur = isBlueWeb ? 18 : 14;
        ctx.fillStyle = isBlueWeb ? "#e9ffff" : color;
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, coreRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.72;
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, Math.max(2.2, coreRadius * 0.42), 0, Math.PI * 2);
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

  private pushTrail(from: Point, to: Point, color: string, style: CordStyle): void {
    if (style === "laser") return;
    this.trails.push({
      from: { ...from },
      to: { ...to },
      color,
      life: style === "blueWeb" ? 85 : 180,
      maxLife: style === "blueWeb" ? 85 : 180,
    });
    if (this.trails.length > MAX_TRAILS) this.trails.splice(0, this.trails.length - MAX_TRAILS);
  }

  private drawTrailLayer(ctx: CanvasRenderingContext2D): void {
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const trail = this.trails[i];
      const alpha = trail.life / trail.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha * 0.18;
      ctx.shadowColor = trail.color;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = trail.color;
      ctx.lineWidth = 0.6 + alpha * 0.9;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(trail.from.x, trail.from.y);
      ctx.lineTo(trail.to.x, trail.to.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawCord(ctx: CanvasRenderingContext2D, spec: CordSpec): void {
    const { from, to, distT, fromFingerIndex, toFingerIndex, linkIndex } = spec;
    const style = this.currentCordStyle;
    const color = this.getCordColor(style, fromFingerIndex, toFingerIndex, linkIndex);
    const pulse = 0.5 + Math.sin(this.visualTime * 0.008 + linkIndex * 0.53 + fromFingerIndex * 1.7) * 0.5;
    const resonanceT = Math.max(0, 1 - (this.visualTime - this.lastResonanceAt) / RESONANCE_MS);
    const lineWidth = this.getCordLineWidth(style, distT, pulse, resonanceT);

    ctx.save();
    ctx.lineCap = "round";
    if (style === "dotted") ctx.setLineDash([7, 11]);

    ctx.shadowColor = color;
    ctx.shadowBlur = this.getCordGlow(style, pulse, resonanceT);
    ctx.strokeStyle = color;
    ctx.globalAlpha = style === "blueWeb" ? 0.16 + resonanceT * 0.1 : 0.34 + resonanceT * 0.16;
    ctx.lineWidth = lineWidth * (style === "blueWeb" ? 2.2 : 3.5);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    ctx.shadowColor = color;
    ctx.shadowBlur = style === "blueWeb" ? 6 + resonanceT * 6 : style === "laser" ? 4 : 12 + pulse * 8;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = style === "blueWeb" ? 0.78 : 0.94;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    if (style === "dotted") ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = style === "arcade" ? "#ffe66d" : "#ffffff";
    ctx.globalAlpha = style === "blueWeb" ? 0.26 : 0.35 + pulse * 0.2;
    ctx.lineWidth = style === "blueWeb" ? 0.45 : style === "laser" ? 1 : 0.8;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    ctx.restore();
  }

  private get currentCordStyle(): CordStyle {
    return ["blueWeb", "neon", "laser", "arcade", "dotted"][this.currentStyleIndex] as CordStyle;
  }

  private cycleCordStyle = (): void => {
    this.currentStyleIndex = (this.currentStyleIndex + 1) % STYLE_NAMES.length;
    this.trails = [];
    this.styleTxt.setText(this.getStyleLabel());
    this.statusTxt.setText("STYLE CHANGE");
    this.statusResetEvent?.remove(false);
    this.statusResetEvent = this.time.delayedCall(520, () => this.statusTxt.setText("MODE FICELLE LIBRE"));
  };

  private getStyleLabel(): string {
    return `STYLE ${this.currentStyleIndex + 1}/5  ${STYLE_NAMES[this.currentStyleIndex]}`;
  }

  private getCordColor(style: CordStyle, fromFingerIndex: number, toFingerIndex: number, linkIndex: number): string {
    if (style === "blueWeb") return linkIndex % 3 === 0 ? "#dffcff" : linkIndex % 2 === 0 ? COLOR.brandPrimary : COLOR.info;
    if (style === "laser") return linkIndex % 2 === 0 ? "#ffffff" : "#9ffcff";
    if (style === "arcade") {
      const hue = Math.round((this.visualTime * 0.08 + linkIndex * 36 + fromFingerIndex * 18) % 360);
      return `hsl(${hue}, 100%, 62%)`;
    }
    if (style === "dotted") return fromFingerIndex % 2 === 0 ? "#ffd166" : "#ff5c7a";
    return FINGER_PALETTE[(fromFingerIndex + toFingerIndex) % FINGER_PALETTE.length];
  }

  private getCordLineWidth(style: CordStyle, distT: number, pulse: number, resonanceT: number): number {
    if (style === "blueWeb") return 0.45 + (1 - distT) * 0.22 + resonanceT * 0.18;
    if (style === "laser") return 0.9 + resonanceT * 0.35;
    if (style === "arcade") return 2.1 + pulse * 0.45 + resonanceT * 0.9;
    if (style === "dotted") return 1.8 + pulse * 0.2 + resonanceT * 0.45;
    return 1.4 + (1 - distT) * 0.9 + pulse * 0.25 + resonanceT * 0.6;
  }

  private getCordGlow(style: CordStyle, pulse: number, resonanceT: number): number {
    if (style === "blueWeb") return 12 + resonanceT * 18;
    if (style === "laser") return 10 + resonanceT * 16;
    if (style === "arcade") return 30 + pulse * 12 + resonanceT * 32;
    if (style === "dotted") return 24 + pulse * 10 + resonanceT * 22;
    return 26 + pulse * 8 + resonanceT * 24;
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
            this.lastResonanceAt = this.visualTime;
            this.statusTxt.setText("RESONANCE");
            this.statusResetEvent?.remove(false);
            this.statusResetEvent = this.time.delayedCall(RESONANCE_MS, () =>
              this.statusTxt.setText("MODE FICELLE LIBRE"),
            );
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

  private updateTrails(delta: number): void {
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const trail = this.trails[i];
      trail.life -= delta;
      if (trail.life <= 0) this.trails.splice(i, 1);
    }
  }
}
