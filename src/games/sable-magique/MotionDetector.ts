import { MOTION } from "./config";

export interface MotionCluster {
  /** Screen-space X coordinate (pixels). */
  x: number;
  /** Screen-space Y coordinate (pixels). */
  y: number;
  /** Movement intensity in [0, 1]. */
  intensity: number;
}

interface WorkerInput {
  prevData: Uint8ClampedArray;
  currData: Uint8ClampedArray;
  width: number;
  height: number;
  threshold: number;
  step: number;
  clusterRadius: number;
}

interface WorkerOutput {
  clusters: Array<{ x: number; y: number; intensity: number }>;
}

/**
 * Compares consecutive webcam frames on a small offscreen canvas, dispatches
 * pixel-diff work to a Web Worker, and calls onClusters with screen-space
 * motion clusters whenever results arrive.
 */
export class MotionDetector {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly worker: Worker;
  private readonly canvasW: number;
  private readonly canvasH: number;
  private readonly scaleX: number;
  private readonly scaleY: number;

  private prevBytes: Uint8ClampedArray | null = null;
  private workerBusy = false;

  constructor(
    private readonly videoEl: HTMLVideoElement,
    screenW: number,
    screenH: number,
    private readonly onClusters: (clusters: MotionCluster[]) => void,
  ) {
    this.canvasW = Math.round(screenW * MOTION.CANVAS_SCALE);
    this.canvasH = Math.round(screenH * MOTION.CANVAS_SCALE);
    // Scale factors to convert detection-canvas coords back to screen space.
    this.scaleX = screenW / this.canvasW;
    this.scaleY = screenH / this.canvasH;

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.canvasW;
    this.canvas.height = this.canvasH;

    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("[MotionDetector] cannot get 2d context");
    this.ctx = ctx;

    this.worker = new Worker(new URL("./MotionWorker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = this.handleWorkerMessage;
  }

  /** Call every frame (e.g. from Phaser update). */
  tick(): void {
    if (this.videoEl.readyState < 2) return;

    const { canvasW: canvasWidth, canvasH: canvasHeight, videoEl, ctx } = this;
    const vw = videoEl.videoWidth;
    const vh = videoEl.videoHeight;
    if (!vw || !vh) return;

    // Draw mirrored, aspect-ratio-correct frame at reduced resolution —
    // same transform as WebcamLayer so detection coords map cleanly to screen.
    const scale = Math.max(canvasWidth / vw, canvasHeight / vh);
    const srcW = canvasWidth / scale;
    const srcH = canvasHeight / scale;
    ctx.save();
    ctx.translate(canvasWidth, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoEl, (vw - srcW) / 2, (vh - srcH) / 2, srcW, srcH, 0, 0, canvasWidth, canvasHeight);
    ctx.restore();

    const currBytes = new Uint8ClampedArray(ctx.getImageData(0, 0, canvasWidth, canvasHeight).data);

    if (!this.workerBusy && this.prevBytes) {
      this.workerBusy = true;
      const input: WorkerInput = {
        prevData: this.prevBytes,
        currData: currBytes,
        width: canvasWidth,
        height: canvasHeight,
        threshold: MOTION.THRESHOLD,
        step: MOTION.SAMPLE_STEP,
        clusterRadius: MOTION.CLUSTER_RADIUS,
      };
      this.worker.postMessage(input);
    }

    this.prevBytes = currBytes;
  }

  private handleWorkerMessage = (msg: MessageEvent<WorkerOutput>): void => {
    this.workerBusy = false;
    const clusters: MotionCluster[] = msg.data.clusters.map((cl) => ({
      x: cl.x * this.scaleX,
      y: cl.y * this.scaleY,
      intensity: cl.intensity,
    }));
    this.onClusters(clusters);
  };

  destroy(): void {
    this.worker.terminate();
  }
}
