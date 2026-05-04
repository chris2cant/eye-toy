import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";
import Phaser from "phaser";

export type HandLandmark = { x: number; y: number; z: number };
export type PinchPoint = { x: number; y: number; handIndex: number };
export type LandmarksPayload = { hands: HandLandmark[][]; pinches: PinchPoint[] };

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

const THUMB_TIP = 4;
const INDEX_TIP = 8;
const PINCH_THRESHOLD = 0.08;

class HandTrackerClass extends Phaser.Events.EventEmitter {
  private landmarker: HandLandmarker | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private rafId = 0;
  private running = false;
  private prevPinching: boolean[] = [false, false];

  get isInitialized(): boolean {
    return this.landmarker !== null;
  }

  getVideoEl(): HTMLVideoElement | null {
    return this.videoEl;
  }

  async initCamera(): Promise<HTMLVideoElement> {
    if (!this.stream) {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement("video");
      video.srcObject = this.stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      await new Promise<void>((resolve) => {
        if (video.readyState >= 1) resolve();
        else video.onloadedmetadata = () => resolve();
      });
      this.videoEl = video;
    }
    return this.videoEl!;
  }

  async initDetector(): Promise<void> {
    if (this.landmarker) return;
    const vision = await FilesetResolver.forVisionTasks("/wasm");
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL },
      numHands: 2,
      runningMode: "VIDEO",
    });
    console.log("[HandTracker] initialisé");
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.prevPinching = [false, false];
    this.tick();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick = (): void => {
    if (!this.running || !this.videoEl || !this.landmarker) return;

    if (this.videoEl.readyState >= 2) {
      const result: HandLandmarkerResult = this.landmarker.detectForVideo(
        this.videoEl,
        performance.now(),
      );

      const pinches: PinchPoint[] = [];

      for (let i = 0; i < 2; i++) {
        const hand = result.landmarks[i];
        if (!hand) {
          this.prevPinching[i] = false;
          continue;
        }
        const thumb = hand[THUMB_TIP];
        const index = hand[INDEX_TIP];
        const dx = thumb.x - index.x;
        const dy = thumb.y - index.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const isPinching = dist < PINCH_THRESHOLD;

        if (isPinching) {
          const p: PinchPoint = {
            x: 1 - (thumb.x + index.x) / 2,
            y: (thumb.y + index.y) / 2,
            handIndex: i,
          };
          pinches.push(p);
          if (!this.prevPinching[i]) {
            this.emit("pinch", p);
          }
        }
        this.prevPinching[i] = isPinching;
      }

      this.emit("landmarks", { hands: result.landmarks, pinches });
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}

export const handTracker = new HandTrackerClass();
