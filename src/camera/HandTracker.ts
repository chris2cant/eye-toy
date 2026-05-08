import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";
import Phaser from "phaser";

export type HandLandmark = { x: number; y: number; z: number };
export type PinchPoint = { x: number; y: number; handIndex: number };
export type LandmarksPayload = { hands: HandLandmark[][]; pinches: PinchPoint[] };
export type CameraOptions = { width?: number; height?: number; frameRate?: number };
export type HandDetectorOptions = { numHands?: number };
export type TrackerRuntimeOptions = { targetFps?: number; phaseMs?: number };

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

const THUMB_TIP = 4;
const INDEX_TIP = 8;
const PINCH_THRESHOLD = 0.08;
const DEFAULT_CAMERA: Required<CameraOptions> = { width: 640, height: 480, frameRate: 30 };
const DEFAULT_NUM_HANDS = 2;
const DEFAULT_TARGET_FPS = 30;

class HandTrackerClass extends Phaser.Events.EventEmitter {
  private landmarker: HandLandmarker | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private rafId = 0;
  private running = false;
  private prevPinching: boolean[] = [false, false];
  private numHands = DEFAULT_NUM_HANDS;
  private targetFrameMs = 1000 / DEFAULT_TARGET_FPS;
  private nextDetectAt = 0;

  get isInitialized(): boolean {
    return this.landmarker !== null;
  }

  getVideoEl(): HTMLVideoElement | null {
    return this.videoEl;
  }

  async initCamera(options: CameraOptions = {}): Promise<HTMLVideoElement> {
    if (!this.stream) {
      const camera = { ...DEFAULT_CAMERA, ...options };
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: camera.width },
          height: { ideal: camera.height },
          frameRate: { ideal: camera.frameRate, max: camera.frameRate },
        },
      });
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

  async initDetector(options: HandDetectorOptions = {}): Promise<void> {
    const numHands = options.numHands ?? DEFAULT_NUM_HANDS;
    if (this.landmarker) {
      if (numHands !== this.numHands) {
        await this.landmarker.setOptions({ numHands });
        this.numHands = numHands;
        this.prevPinching = new Array<boolean>(numHands).fill(false);
      }
      return;
    }
    const vision = await FilesetResolver.forVisionTasks("/wasm");
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL },
      numHands,
      runningMode: "VIDEO",
    });
    this.numHands = numHands;
    this.prevPinching = new Array<boolean>(numHands).fill(false);
    console.log("[HandTracker] initialisé");
  }

  start(options: TrackerRuntimeOptions = {}): void {
    if (options.targetFps !== undefined) {
      this.targetFrameMs = 1000 / Math.max(1, options.targetFps);
    }
    if (options.phaseMs !== undefined) {
      this.nextDetectAt = performance.now() + Math.max(0, options.phaseMs);
    }
    if (this.running) return;
    this.running = true;
    this.prevPinching = new Array<boolean>(this.numHands).fill(false);
    if (options.phaseMs === undefined) this.nextDetectAt = 0;
    this.tick();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private computePinch(hand: HandLandmark[], handIndex: number): PinchPoint | null {
    const thumb = hand[THUMB_TIP];
    const index = hand[INDEX_TIP];
    const dx = thumb.x - index.x;
    const dy = thumb.y - index.y;
    if (Math.sqrt(dx * dx + dy * dy) >= PINCH_THRESHOLD) return null;
    return { x: 1 - (thumb.x + index.x) / 2, y: (thumb.y + index.y) / 2, handIndex };
  }

  private detectAndEmit(): void {
    const result: HandLandmarkerResult = this.landmarker!.detectForVideo(
      this.videoEl!,
      performance.now(),
    );
    const pinches: PinchPoint[] = [];

    for (let i = 0; i < this.numHands; i++) {
      const hand = result.landmarks[i] as HandLandmark[] | undefined;
      if (!hand) { this.prevPinching[i] = false; continue; }

      const pinchPoint = this.computePinch(hand, i);
      if (pinchPoint) {
        pinches.push(pinchPoint);
        if (!this.prevPinching[i]) this.emit("pinch", pinchPoint);
      }
      this.prevPinching[i] = pinchPoint !== null;
    }

    this.emit("landmarks", { hands: result.landmarks, pinches });
  }

  private tick = (): void => {
    if (!this.running || !this.videoEl || !this.landmarker) return;
    const now = performance.now();
    if (this.videoEl.readyState >= 2 && now >= this.nextDetectAt) {
      this.detectAndEmit();
      this.nextDetectAt = now + this.targetFrameMs;
    }
    this.rafId = requestAnimationFrame(this.tick);
  };
}

export const handTracker = new HandTrackerClass();
