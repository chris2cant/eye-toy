import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import type { PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import Phaser from "phaser";
import { handTracker } from "./HandTracker";
import { measure } from "./perfProbe";
import { resolveModelUrl } from "./modelUrl";

export type PoseLandmark = { x: number; y: number; z: number; visibility?: number };
export type BodyPayload = { pose: PoseLandmark[] };
export type BodyTrackerRuntimeOptions = { targetFps?: number; phaseMs?: number };

const DEFAULT_TARGET_FPS = 30;
const DETECT_PROBE = "pose";

type Vision = Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>;

/** Tente le delegate GPU, retombe sur CPU si indisponible. */
async function createLandmarker(vision: Vision): Promise<PoseLandmarker> {
  const modelAssetPath = await resolveModelUrl("poseLite");
  const create = (delegate: "GPU" | "CPU") =>
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath, delegate },
      numPoses: 1,
      runningMode: "VIDEO",
    });
  try {
    return await create("GPU");
  } catch (err) {
    console.warn("[BodyTracker] delegate GPU indisponible, repli CPU:", err);
    return create("CPU");
  }
}

class BodyTrackerClass extends Phaser.Events.EventEmitter {
  private landmarker: PoseLandmarker | null = null;
  private rafId = 0;
  private running = false;
  private targetFrameMs = 1000 / DEFAULT_TARGET_FPS;
  private nextDetectAt = 0;
  private lastVideoTime = -1;

  get isInitialized(): boolean {
    return this.landmarker !== null;
  }

  async initDetector(): Promise<void> {
    if (this.landmarker) return;
    const vision = await FilesetResolver.forVisionTasks("/wasm");
    this.landmarker = await createLandmarker(vision);
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

  private detectAndEmit(video: HTMLVideoElement, landmarker: PoseLandmarker): void {
    this.lastVideoTime = video.currentTime;
    const result: PoseLandmarkerResult = measure(DETECT_PROBE, () =>
      landmarker.detectForVideo(video, performance.now()),
    );
    const pose = (result.landmarks?.[0] ?? []) as PoseLandmark[];
    this.emit("body", { pose });
  }

  private isReady(video: HTMLVideoElement | null, now: number): video is HTMLVideoElement {
    if (!video || video.readyState < 2) return false;
    if (now < this.nextDetectAt || video.currentTime === this.lastVideoTime) return false;
    return this.listenerCount("body") > 0;
  }

  private tick = (): void => {
    if (!this.running || !this.landmarker) return;
    const video = handTracker.getVideoEl();
    const now = performance.now();
    if (this.isReady(video, now)) {
      this.detectAndEmit(video, this.landmarker);
      this.nextDetectAt = now + this.targetFrameMs;
    }
    this.rafId = requestAnimationFrame(this.tick);
  };
}

export const bodyTracker = new BodyTrackerClass();
