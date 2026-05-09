import Phaser from "phaser";
import { handTracker } from "../../camera/HandTracker";
import { COLOR, DEPTH, FONT } from "../../design-system/tokens";
import { WebcamLayer } from "../../scenes/WebcamLayer";
import { createScoreBadge } from "../../design-system/components/ScoreBadge";
import { createTimerBadge } from "../../design-system/components/TimerBadge";
import type { ScoreBadgeHandle } from "../../design-system/components/ScoreBadge";
import type { TimerBadgeHandle } from "../../design-system/components/TimerBadge";
import { MotionDetector, type MotionCluster } from "../sable-magique/MotionDetector";
import { PAINT_CLEAN, computeEraseRadius, computeRoundPercent } from "./PaintCleanConfig";
import { runCountdown } from "../../design-system/components/Countdown";

type Point = { x: number; y: number };

export class PaintCleanScene extends Phaser.Scene {
  private webcam!: WebcamLayer;
  private motionDetector!: MotionDetector;
  private paintTexture: Phaser.Textures.CanvasTexture | null = null;
  private paintImage: Phaser.GameObjects.Image | null = null;
  private handPositions: (Point | null)[] = [null, null];
  private gameActive = false;
  private roundIndex = 0;
  private roundSecondsLeft = PAINT_CLEAN.roundDurationSec;
  private roundScores = [0, 0, 0];
  private totalScore = 0;
  private scoreBadge!: ScoreBadgeHandle;
  private timerBadge!: TimerBadgeHandle;
  private roundTxt!: Phaser.GameObjects.Text;
  private tickTimer: Phaser.Time.TimerEvent | null = null;
  private backgroundMusic: Phaser.Sound.BaseSound | null = null;

  constructor() {
    super({ key: "PaintCleanScene" });
  }

  async create(): Promise<void> {
    const { width, height } = this.scale;

    this.input.keyboard?.on("keydown-Q", this.onQuitToMenu);

    try {
      const videoEl = await handTracker.initCamera();
      this.webcam = new WebcamLayer(this);
      this.webcam.setup(videoEl, width, height);
      this.motionDetector = new MotionDetector(videoEl, width, height, this.onClusters);
      this.createPaintLayer(width, height);
      this.buildUi(width, height);
      this.startBackgroundMusic();
      runCountdown(this, () => this.startRound(0));
      this.scale.on("resize", this.onResize, this);
      this.events.once("shutdown", () => this.cleanupScene());
    } catch (err) {
      this.showCameraError(width, height, err);
    }
  }

  private createPaintLayer(width: number, height: number): void {
    if (this.textures.exists("paint-clean-layer")) this.textures.remove("paint-clean-layer");
    const texture = this.textures.createCanvas("paint-clean-layer", width, height);
    if (!texture) throw new Error("paint-clean-layer unavailable");
    this.paintTexture = texture;
    this.paintImage = this.add.image(width / 2, height / 2, "paint-clean-layer").setDepth(DEPTH.game);
  }

  private buildUi(width: number, height: number): void {
    this.timerBadge = createTimerBadge(this, width / 2, height * 0.06);
    this.timerBadge.container.setDepth(DEPTH.hud);
    this.scoreBadge = createScoreBadge(this, width - 100, height * 0.06);
    this.scoreBadge.container.setDepth(DEPTH.hud);
    this.roundTxt = this.add
      .text(24, height * 0.06, "", {
        fontSize: "20px",
        fontFamily: FONT.display,
        color: COLOR.white,
        stroke: "#1D2340",
        strokeThickness: 4,
      })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud);
    this.refreshHud();
  }

  private startRound(roundIndex: number): void {
    this.roundIndex = roundIndex;
    this.roundSecondsLeft = PAINT_CLEAN.roundDurationSec;
    this.gameActive = true;
    this.paintCurrentRoundColor();
    this.refreshHud();
    if (this.tickTimer) this.tickTimer.destroy();
    this.tickTimer = this.time.addEvent({ delay: 1000, loop: true, callback: () => this.onRoundTick() });
  }

  private paintCurrentRoundColor(): void {
    if (!this.paintTexture) return;
    const ctx = this.paintTexture.getContext();
    if (!ctx) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = PAINT_CLEAN.roundColors[this.roundIndex] ?? PAINT_CLEAN.roundColors[0];
    ctx.globalAlpha = 1;
    ctx.fillRect(0, 0, this.paintTexture.width, this.paintTexture.height);
    this.paintTexture.refresh();
  }

  private onRoundTick(): void {
    this.roundSecondsLeft = Math.max(0, this.roundSecondsLeft - 1);
    this.refreshHud();
    if (this.roundSecondsLeft > 0) return;
    this.finishRound();
  }

  private finishRound(): void {
    this.gameActive = false;
    if (this.tickTimer) this.tickTimer.destroy();
    const roundPercent = this.measureCurrentRoundPercent();
    this.roundScores[this.roundIndex] = roundPercent;
    this.totalScore = this.roundScores.reduce((sum, value) => sum + value, 0);
    this.refreshHud();
    if (this.roundIndex >= PAINT_CLEAN.rounds - 1) {
      this.endGame();
      return;
    }
    this.time.delayedCall(450, () => this.startRound(this.roundIndex + 1));
  }

  private measureCurrentRoundPercent(): number {
    if (!this.paintTexture) return 0;
    const ctx = this.paintTexture.getContext();
    if (!ctx) return 0;
    const alphaBytes = ctx.getImageData(0, 0, this.paintTexture.width, this.paintTexture.height).data;
    return computeRoundPercent(alphaBytes);
  }

  private endGame(): void {
    this.stopBackgroundMusic();
    this.scene.start("GameOverScene", {
      score: this.totalScore,
      gameName: "NETTOYAGE PEINTURE",
      gameKey: this.sys.settings.key,
    });
  }

  private onClusters = (clusters: MotionCluster[]): void => {
    this.updateHandPositions(clusters);
    if (!this.gameActive || !this.paintTexture) return;
    const ctx = this.paintTexture.getContext();
    if (!ctx) return;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = PAINT_CLEAN.eraseAlpha;
    for (const cluster of clusters) {
      const radius = computeEraseRadius(cluster.spread, cluster.intensity);
      ctx.beginPath();
      ctx.arc(cluster.x, cluster.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    this.paintTexture.refresh();
  };

  private updateHandPositions(clusters: MotionCluster[]): void {
    const sorted = clusters.slice().sort((clusterA, clusterB) => clusterB.intensity - clusterA.intensity);
    this.handPositions[0] = sorted[0] ? { x: sorted[0].x, y: sorted[0].y } : null;
    this.handPositions[1] = sorted[1] ? { x: sorted[1].x, y: sorted[1].y } : null;
  }

  private refreshHud(): void {
    this.roundTxt.setText(`MANCHE ${this.roundIndex + 1}/${PAINT_CLEAN.rounds}`);
    this.timerBadge.setTime(this.roundSecondsLeft);
    this.scoreBadge.setValue(this.totalScore);
  }

  update(time: number, _delta: number): void {
    if (!this.webcam || !this.motionDetector) return;
    this.webcam.render(time, PAINT_CLEAN.webcamFps);
    this.motionDetector.tick();
  }

  private onResize = (gameSize: Phaser.Structs.Size): void => {
    if (!this.paintTexture || !this.paintImage) return;
    this.paintTexture.setSize(gameSize.width, gameSize.height);
    this.paintImage.setPosition(gameSize.width / 2, gameSize.height / 2);
    this.paintCurrentRoundColor();
  };

  private readonly onQuitToMenu = (): void => {
    this.scene.start("MenuScene", { selectedGameKey: this.sys.settings.key });
  };

  private cleanupScene(): void {
    this.input.keyboard?.off("keydown-Q", this.onQuitToMenu);
    if (this.tickTimer) this.tickTimer.destroy();
    this.stopBackgroundMusic();
    this.motionDetector?.destroy();
    this.scale.off("resize", this.onResize, this);
  }

  private startBackgroundMusic(): void {
    if (this.backgroundMusic?.isPlaying) return;
    this.backgroundMusic = this.sound.add("music-background-runner", { loop: true, volume: 0.35 });
    this.backgroundMusic.play();
  }

  private stopBackgroundMusic(): void {
    if (!this.backgroundMusic) return;
    this.backgroundMusic.stop();
    this.backgroundMusic.destroy();
    this.backgroundMusic = null;
  }

  private showCameraError(width: number, height: number, err: unknown): void {
    console.error("[PaintCleanScene] erreur d'initialisation:", err);
    this.add
      .text(width / 2, height / 2, "Caméra refusée\nVeuillez autoriser l'accès à la webcam", {
        fontSize: "28px",
        fontFamily: FONT.ui,
        color: COLOR.danger,
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.topUi);
  }
}
