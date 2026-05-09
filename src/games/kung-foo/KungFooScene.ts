import Phaser from "phaser";
import { handTracker } from "../../camera/HandTracker";
import type { LandmarksPayload } from "../../camera/HandTracker";
import { COLOR, FONT } from "../../design-system/tokens";
import { WebcamLayer } from "../../scenes/WebcamLayer";
import { MotionDetector } from "../sable-magique/MotionDetector";
import type { MotionCluster } from "../sable-magique/MotionDetector";
import type { Difficulty } from "./WaveManager";
import { createKungFooState, KF_HAND_TRACKER_FPS, KF_WEBCAM_FPS, PALM_LANDMARK } from "./KungFooState";
import { showDifficultySelector, applyDifficultyState, buildGameplayUi, runCountdown } from "./KungFooSetup";
import { initWaveManager, startGame, processMotion, advanceGame, tickTimer, endGame } from "./KungFooGameplay";

export class KungFooScene extends Phaser.Scene {
  private webcam!: WebcamLayer;
  private state = createKungFooState();

  constructor() {
    super({ key: "KungFooScene" });
  }

  async create() {
    const { width, height } = this.scale;
    const data = this.scene.settings.data as { difficulty?: Difficulty } | undefined;

    try {
      const videoEl = await handTracker.initCamera();
      this.webcam = new WebcamLayer(this);
      this.webcam.setup(videoEl, width, height);
      await handTracker.initDetector({ numHands: 2 });
      handTracker.start({ targetFps: KF_HAND_TRACKER_FPS });
      handTracker.on("landmarks", this.onLandmarks, this);
      this.input.keyboard?.on("keydown-Q", this.onQuitToMenu);

      this.state.motionDetector = new MotionDetector(videoEl, width, height, this.onMotionClusters);

      this.events.once("shutdown", () => {
        handTracker.off("landmarks", this.onLandmarks, this);
        this.input.keyboard?.off("keydown-Q", this.onQuitToMenu);
        this.state.motionDetector?.destroy();
        endGame(this, this.state);
      });
    } catch (err) {
      console.error("[KungFooScene] erreur d'initialisation:", err);
      const { width: errorW, height: errorH } = this.scale;
      this.add
        .text(errorW / 2, errorH / 2, "Caméra refusée\nVeuillez autoriser l'accès à la webcam", {
          fontSize: "28px",
          color: COLOR.danger,
          fontFamily: FONT.ui,
          align: "center",
        })
        .setOrigin(0.5);
      return;
    }

    this.startDifficultyFlow(data?.difficulty, width, height);
  }

  private initDifficulty(difficulty: Difficulty, width: number, height: number): void {
    this.state.difficulty = difficulty;
    applyDifficultyState(this.state, difficulty);
    initWaveManager(this.state, difficulty);
    buildGameplayUi(this, this.state, width, height);
    runCountdown(this, () => startGame(this, this.state));
  }

  private startDifficultyFlow(initialDifficulty: Difficulty | undefined, width: number, height: number): void {
    if (initialDifficulty) {
      this.initDifficulty(initialDifficulty, width, height);
      return;
    }
    showDifficultySelector(this, {
      state: this.state,
      width,
      height,
      onPick: (difficulty) => this.initDifficulty(difficulty, width, height),
    });
  }

  private onMotionClusters = (clusters: MotionCluster[]): void => {
    processMotion(this, this.state, clusters);
  };

  private onLandmarks = ({ hands }: LandmarksPayload): void => {
    const { width, height } = this.scale;
    const mapper = this.webcam.getLandmarkMapper(width, height);
    hands.forEach((hand, i) => {
      if (!hand || hand.length === 0) {
        this.state.handPositions[i] = null;
        return;
      }
      const palm = hand[PALM_LANDMARK];
      this.state.handPositions[i] = mapper(palm.x, palm.y);
    });
  };

  update(time: number, delta: number): void {
    if (!this.webcam) return;
    this.webcam.render(time, KF_WEBCAM_FPS);

    if (!this.state.gameActive) {
      this.state.difficultyButtons.forEach((diffBtn) => diffBtn.update(this.state.handPositions, delta));
      return;
    }

    advanceGame(this, this.state, delta);
    tickTimer(this, this.state);
  }

  private readonly onQuitToMenu = (): void => {
    this.scene.start("MenuScene", { selectedGameKey: this.sys.settings.key });
  };
}
