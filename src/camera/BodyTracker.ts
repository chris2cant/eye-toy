import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import type { PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import Phaser from "phaser";
import { handTracker } from "./HandTracker";

export type PoseLandmark = { x: number; y: number; z: number; visibility?: number };
export type BodyPayload = { pose: PoseLandmark[] };
export type BodyTrackerRuntimeOptions = { targetFps?: number; phaseMs?: number };

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const DEFAULT_TARGET_FPS = 30;

class BodyTrackerClass extends Phaser.Events.EventEmitter {
  private landmarker: PoseLandmarker | null = null;
  private rafId = 0;
  private running = false;
  private targetFrameMs = 1000 / DEFAULT_TARGET_FPS;
  private nextDetectAt = 0;

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

  start(options: BodyTrackerRuntimeOptions = {}): void {
    if (options.targetFps !== undefined) {
      this.targetFrameMs = 1000 / Math.max(1, options.targetFps);
    }
    if (options.phaseMs !== undefined) {
      this.nextDetectAt = performance.now() + Math.max(0, options.phaseMs);
    }
    if (this.running) return;
    this.running = true;
    if (options.phaseMs === undefined) this.nextDetectAt = 0;
    this.tick();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick = (): void => {
    if (!this.running || !this.landmarker) return;
    const video = handTracker.getVideoEl();
    const now = performance.now();
    if (video && video.readyState >= 2 && now >= this.nextDetectAt) {
      const result: PoseLandmarkerResult = this.landmarker.detectForVideo(video, performance.now());
      const pose = (result.landmarks?.[0] ?? []) as PoseLandmark[];
      this.emit("body", { pose });
      this.nextDetectAt = now + this.targetFrameMs;
    }
    this.rafId = requestAnimationFrame(this.tick);
  };
}

export const bodyTracker = new BodyTrackerClass();
