import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import type { PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import Phaser from "phaser";
import { handTracker } from "./HandTracker";

export type PoseLandmark = { x: number; y: number; z: number; visibility?: number };
export type BodyPayload = { pose: PoseLandmark[] };

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

class BodyTrackerClass extends Phaser.Events.EventEmitter {
  private landmarker: PoseLandmarker | null = null;
  private rafId = 0;
  private running = false;

  get isInitialized(): boolean {
    return this.landmarker !== null;
  }

  async initDetector(): Promise<void> {
    if (this.landmarker) return;
    const vision = await FilesetResolver.forVisionTasks("/wasm");
    this.landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL },
      numPoses: 1,
      runningMode: "VIDEO",
    });
    console.log("[BodyTracker] initialisé");
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.tick();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick = (): void => {
    if (!this.running || !this.landmarker) return;
    const video = handTracker.getVideoEl();
    if (video && video.readyState >= 2) {
      const result: PoseLandmarkerResult = this.landmarker.detectForVideo(video, performance.now());
      const pose = (result.landmarks?.[0] ?? []) as PoseLandmark[];
      this.emit("body", { pose });
    }
    this.rafId = requestAnimationFrame(this.tick);
  };
}

export const bodyTracker = new BodyTrackerClass();
