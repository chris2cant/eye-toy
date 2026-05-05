import Phaser from "phaser";
import { handTracker } from "../camera/HandTracker";
import type { LandmarksPayload } from "../camera/HandTracker";
import { AudioFX } from "../audio/AudioFX";
import { HEX, COLOR, FONT, DEPTH, GAME_CIRCLE_PALETTE } from "../design-system/tokens";

const PALM_LANDMARK = 9;
const CURSOR_COLORS = [HEX.brandPrimary, HEX.info];
const GAME_DURATION = 60; // secondes

const HIT_TOLERANCE = 20;
const MAX_CIRCLES = 5;
const SPAWN_TWEEN_MS = 200;
const POP_TWEEN_MS = 150;
const EXPIRE_TWEEN_MS = 300;
const PALETTE = [...GAME_CIRCLE_PALETTE];

interface DifficultyTier {
  threshold: number;   // fraction du temps écoulé [0, 1)
  spawnDelay: number;  // ms entre chaque spawn
  radius: number;      // rayon du rond en px
  expireDelay: number; // ms avant expiration
  points: number;      // points pour attraper
}

const TIERS: DifficultyTier[] = [
  { threshold: 0,    spawnDelay: 2000, radius: 40, expireDelay: 5000, points: 10 },
  { threshold: 0.33, spawnDelay: 1500, radius: 33, expireDelay: 4000, points: 15 },
  { threshold: 0.66, spawnDelay: 1000, radius: 26, expireDelay: 3000, points: 20 },
];

type GameCircle = Phaser.GameObjects.Graphics & {
  radius: number;
  circleColor: number;
  spawnTime: number;
  expireTimer: Phaser.Time.TimerEvent;
  expireDelay: number;
  points: number;
};

const FLOAT_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: "28px",
  fontFamily: FONT.identity,
  color: COLOR.brandPrimary,
  stroke: COLOR.bgCanvas,
  strokeThickness: 3,
};

export class GameScene extends Phaser.Scene {
  private videoEl!: HTMLVideoElement;
  private webcamTex!: Phaser.Textures.CanvasTexture;
  private bg!: Phaser.GameObjects.Image;
  private cursors: Phaser.GameObjects.Arc[] = [];
  private circles: GameCircle[] = [];
  private timerGraphics!: Phaser.GameObjects.Graphics;
  private score = 0;
  private timeLeft = GAME_DURATION;
  private gameActive = false;
  private currentTierIndex = 0;
  private spawnTimer!: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: "GameScene" });
  }

  async create() {
    // Réinitialiser avant tout await pour éviter que update() utilise l'ancienne texture détruite
    this.webcamTex = null!;
    this.videoEl = null!;

    const { width, height } = this.scale;

    this.timerGraphics = this.add.graphics().setDepth(6);
    this.cursors = CURSOR_COLORS.map((color) =>
      this.add.circle(0, 0, 24, color, 0.8).setDepth(10).setVisible(false),
    );

    try {
      this.videoEl = await handTracker.initCamera();

      if (this.textures.exists("webcam")) this.textures.remove("webcam");
      const tex = this.textures.createCanvas("webcam", width, height);
      if (!tex) throw new Error("createCanvas returned null");
      this.webcamTex = tex;
      this.bg = this.add.image(width / 2, height / 2, "webcam").setDepth(-10);

      this.scale.on("resize", this.onResize, this);

      await handTracker.initDetector();
      handTracker.on("landmarks", this.onLandmarks, this);
      this.events.once("shutdown", () => handTracker.off("landmarks", this.onLandmarks, this));
      handTracker.start();

      this.runCountdown();
    } catch (err) {
      console.error("[GameScene] erreur d'initialisation:", err);
      this.add
        .text(width / 2, height / 2, "Caméra refusée\nVeuillez autoriser l'accès à la webcam", {
          fontSize: "28px",
          color: COLOR.danger,
          fontFamily: FONT.ui,
          align: "center",
        })
        .setOrigin(0.5);
    }
  }

  private get tier(): DifficultyTier {
    return TIERS[this.currentTierIndex];
  }

  private runCountdown() {
    const { width, height } = this.scale;
    const steps = ["3", "2", "1", "GO!"];
    let i = 0;

    const showNext = () => {
      if (i >= steps.length) {
        this.startGame();
        return;
      }
      const isGo = steps[i] === "GO!";
      const txt = this.add
        .text(width / 2, height / 2, steps[i], {
          fontSize: "160px",
          fontFamily: FONT.identity,
          fontStyle: "900",
          color: isGo ? COLOR.brandPrimary : COLOR.textPrimary,
          stroke: COLOR.bgCanvas,
          strokeThickness: 6,
          shadow: isGo
            ? { offsetX: 0, offsetY: 0, color: COLOR.brandPrimary, blur: 30, fill: true }
            : undefined,
        })
        .setOrigin(0.5)
        .setScale(2)
        .setDepth(DEPTH.topUi);

      i++;
      this.tweens.add({
        targets: txt,
        scale: 1,
        duration: 400,
        ease: "Power2.Out",
        onComplete: () => {
          this.time.delayedCall(isGo ? 400 : 500, () => {
            this.tweens.add({
              targets: txt,
              alpha: 0,
              duration: 200,
              onComplete: () => { txt.destroy(); showNext(); },
            });
          });
        },
      });
    };

    showNext();
  }

  private startGame() {
    this.currentTierIndex = 0;
    this.timeLeft = GAME_DURATION;
    this.score = 0;
    this.scene.launch("UIScene");
    this.game.events.emit("score:update", 0);
    this.game.events.emit("timer:update", GAME_DURATION);

    this.spawnTimer = this.time.addEvent({
      delay: this.tier.spawnDelay,
      loop: true,
      callback: this.spawnCircle,
      callbackScope: this,
    });

    this.gameActive = true;
    this.time.addEvent({
      delay: 1000,
      repeat: GAME_DURATION - 1,
      callback: this.onTick,
      callbackScope: this,
    });
  }

  private onTick() {
    this.timeLeft -= 1;
    this.game.events.emit("timer:update", this.timeLeft);

    const elapsed = (GAME_DURATION - this.timeLeft) / GAME_DURATION;
    const newTierIndex = TIERS.reduce(
      (best, t, i) => (elapsed >= t.threshold ? i : best),
      0,
    );

    if (newTierIndex !== this.currentTierIndex) {
      this.currentTierIndex = newTierIndex;
      this.spawnTimer.reset({
        delay: this.tier.spawnDelay,
        loop: true,
        callback: this.spawnCircle,
        callbackScope: this,
      });
    }

    if (this.timeLeft <= 0) this.endGame();
  }

  private endGame() {
    this.gameActive = false;
    this.circles.forEach((c) => { c.expireTimer.destroy(); c.destroy(); });
    this.circles = [];
    this.scene.stop("UIScene");
    this.scene.launch("GameOverScene", { score: this.score });
  }

  private spawnCircle() {
    if (!this.gameActive || this.circles.length >= MAX_CIRCLES) return;

    const { width, height } = this.scale;
    const { radius, expireDelay, points } = this.tier;
    const margin = radius + 20;
    const x = Phaser.Math.Between(margin, width - margin);
    const y = Phaser.Math.Between(margin, height - margin);
    const color = Phaser.Utils.Array.GetRandom(PALETTE) as number;

    const circle = this.add.graphics() as GameCircle;
    circle.setPosition(x, y).setDepth(DEPTH.game).setScale(0);
    circle.radius = radius;
    circle.circleColor = color;
    this.drawReticle(circle, color, radius);

    circle.spawnTime = this.time.now;
    circle.expireDelay = expireDelay;
    circle.points = points;
    circle.expireTimer = this.time.addEvent({
      delay: expireDelay,
      callback: () => {
        const idx = this.circles.indexOf(circle);
        if (idx !== -1) this.expireCircle(idx);
      },
    });

    this.circles.push(circle);
    this.tweens.add({ targets: circle, scale: 1, duration: SPAWN_TWEEN_MS, ease: "Back.Out" });
  }

  private drawReticle(gfx: Phaser.GameObjects.Graphics, color: number, r: number) {
    gfx.clear();

    // Fill translucide
    gfx.fillStyle(color, 0.10);
    gfx.fillCircle(0, 0, r);

    // Anneau extérieur halo (légèrement plus grand, très transparent)
    gfx.lineStyle(6, color, 0.08);
    gfx.strokeCircle(0, 0, r + 4);

    // Anneau extérieur principal
    gfx.lineStyle(2, color, 1.0);
    gfx.strokeCircle(0, 0, r);

    // Anneau intérieur (targeting)
    gfx.lineStyle(1, color, 0.35);
    gfx.strokeCircle(0, 0, r * 0.55);

    // 4 tick marks aux 4 points cardinaux
    const tickOuter = r + 8;
    const tickInner = r + 2;
    gfx.lineStyle(2, color, 0.85);
    for (const angle of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      gfx.lineBetween(cos * tickInner, sin * tickInner, cos * tickOuter, sin * tickOuter);
    }

    // Point central brillant
    gfx.fillStyle(color, 1.0);
    gfx.fillCircle(0, 0, r * 0.10);
  }

  private onLandmarks({ hands }: LandmarksPayload) {
    if (!this.gameActive) {
      this.cursors.forEach((c) => c.setVisible(false));
      return;
    }
    const { width, height } = this.scale;
    this.cursors.forEach((cursor, i) => {
      const hand = hands[i];
      if (!hand) { cursor.setVisible(false); return; }
      const lm = hand[PALM_LANDMARK];
      const hx = (1 - lm.x) * width;
      const hy = lm.y * height;
      cursor.setPosition(hx, hy).setVisible(true);
      this.checkCollisions(hx, hy);
    });
  }

  private checkCollisions(hx: number, hy: number) {
    if (!this.gameActive) return;
    for (let i = this.circles.length - 1; i >= 0; i--) {
      const circle = this.circles[i];
      if (!circle.active) continue;
      const dist = Phaser.Math.Distance.Between(hx, hy, circle.x, circle.y);
      if (dist < circle.radius + HIT_TOLERANCE) {
        this.popCircle(i);
      }
    }
  }

  private popCircle(index: number) {
    const circle = this.circles[index];
    circle.setActive(false);
    circle.expireTimer.destroy();
    this.circles.splice(index, 1);

    const pts = circle.points;
    this.score = Math.max(0, this.score + pts);
    this.game.events.emit("score:update", this.score);
    this.spawnFloatText(circle.x, circle.y, `+${pts}`, "#ffff00");
    AudioFX.pop();

    this.tweens.add({
      targets: circle,
      scale: 0,
      alpha: 0,
      duration: POP_TWEEN_MS,
      ease: "Power2.In",
      onComplete: () => circle.destroy(),
    });
  }

  private spawnFloatText(x: number, y: number, label: string, color: string) {
    const txt = this.add
      .text(x, y, label, { ...FLOAT_TEXT_STYLE, color })
      .setOrigin(0.5)
      .setDepth(15);

    this.tweens.add({
      targets: txt,
      y: y - 60,
      alpha: 0,
      duration: 600,
      ease: "Power1.Out",
      onComplete: () => txt.destroy(),
    });
  }

  private expireCircle(index: number) {
    const circle = this.circles[index];
    circle.setActive(false);
    this.circles.splice(index, 1);

    this.score = Math.max(0, this.score - 5);
    this.game.events.emit("score:update", this.score);
    this.spawnFloatText(circle.x, circle.y, "-5", "#ff4444");
    AudioFX.expire();

    // Flash en rouge puis disparaît
    this.drawReticle(circle, HEX.danger, circle.radius);
    this.tweens.add({
      targets: circle,
      scale: 0,
      alpha: 0,
      duration: EXPIRE_TWEEN_MS,
      ease: "Power2.In",
      onComplete: () => circle.destroy(),
    });
  }

  private onResize(gameSize: Phaser.Structs.Size) {
    if (!this.webcamTex) return;
    this.webcamTex.setSize(gameSize.width, gameSize.height);
    this.bg.setPosition(gameSize.width / 2, gameSize.height / 2);
  }

  update() {
    if (!this.webcamTex || !this.videoEl || this.videoEl.readyState < 2) return;

    const ctx = this.webcamTex.getContext();
    if (!ctx) return;
    const { width, height } = this.scale;

    const vw = this.videoEl.videoWidth;
    const vh = this.videoEl.videoHeight;
    if (!vw || !vh) return;

    const scale = Math.max(width / vw, height / vh);
    const srcW = width / scale;
    const srcH = height / scale;
    const srcX = (vw - srcW) / 2;
    const srcY = (vh - srcH) / 2;

    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(this.videoEl, srcX, srcY, srcW, srcH, 0, 0, width, height);
    ctx.restore();
    this.webcamTex.refresh();

    this.timerGraphics.clear();
    for (const circle of this.circles) {
      if (!circle.active) continue;
      const elapsed = this.time.now - circle.spawnTime;
      const remaining = 1 - Math.min(elapsed / circle.expireDelay, 1);
      if (remaining <= 0) continue;

      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + 2 * Math.PI * remaining;
      const arcColor = remaining > 0.4 ? 0xffffff : 0xff6600;

      this.timerGraphics.lineStyle(4, arcColor, 0.9);
      this.timerGraphics.beginPath();
      this.timerGraphics.arc(circle.x, circle.y, circle.radius + 6, startAngle, endAngle, false);
      this.timerGraphics.strokePath();
    }
  }
}
