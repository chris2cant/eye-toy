import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";
import Phaser from "phaser";

export type HandLandmark = { x: number; y: number; z: number };
export type LandmarksPayload = { hands: HandLandmark[][] };

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export class HandTracker extends Phaser.Events.EventEmitter {
  private landmarker!: HandLandmarker;
  private videoEl!: HTMLVideoElement;
  private rafId = 0;
  private running = false;

  async init(videoEl: HTMLVideoElement): Promise<void> {
    this.videoEl = videoEl;

    const vision = await FilesetResolver.forVisionTasks("/wasm");
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
      },
      numHands: 2,
      runningMode: "VIDEO",
    });

    console.log("[HandTracker] initialisé, prêt à détecter");
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    console.log("[HandTracker] boucle démarrée");
    this.tick();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick = (): void => {
    if (!this.running) return;

    if (this.videoEl.readyState >= 2) {
      const result: HandLandmarkerResult = this.landmarker.detectForVideo(
        this.videoEl,
        performance.now(),
      );
      if (result.landmarks.length > 0) {
        console.log("[HandTracker] mains détectées:", result.landmarks.length);
      }
      this.emit("landmarks", { hands: result.landmarks });
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}
