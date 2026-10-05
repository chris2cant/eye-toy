import { measure } from "../../camera/perfProbe";
import type { MotionCluster, WorkerInput, WorkerOutput } from "./motionTypes";

export type { MotionCluster } from "./motionTypes";

const MOTION = {
  CANVAS_SCALE: 0.25,
  SAMPLE_STEP: 2,
  THRESHOLD: 18,
  CLUSTER_RADIUS: 28,
  MAX_FPS: 25,
} as const;

const FRAME_MS = 1000 / MOTION.MAX_FPS;

/**
 * Échantillonne la webcam sur un petit canvas offscreen (cadencé), transfère la
 * frame à un Web Worker (zéro copie) et appelle onClusters avec les clusters de
 * mouvement en coordonnées écran. Le worker conserve la frame précédente.
 */
export class MotionDetector {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly worker: Worker;
  private readonly canvasW: number;
  private readonly canvasH: number;
  private readonly scaleX: number;
  private readonly scaleY: number;

  private workerBusy = false;
  private nextTickAt = 0;

  constructor(
    private readonly videoEl: HTMLVideoElement,
    screenW: number,
    screenH: number,
    private readonly onClusters: (clusters: MotionCluster[]) => void,
  ) {
    this.canvasW = Math.round(screenW * MOTION.CANVAS_SCALE);
    this.canvasH = Math.round(screenH * MOTION.CANVAS_SCALE);
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

  /** À appeler à chaque frame (ex. depuis update) ; cadence interne à MAX_FPS. */
  tick(): void {
    const now = performance.now();
    if (this.workerBusy || now < this.nextTickAt || this.videoEl.readyState < 2) return;
    if (!this.videoEl.videoWidth || !this.videoEl.videoHeight) return;
    this.nextTickAt = now + FRAME_MS;
    measure("motion", () => this.sendFrame());
  }

  private sendFrame(): void {
    const { canvasW, canvasH, videoEl, ctx } = this;
    const vw = videoEl.videoWidth;
    const vh = videoEl.videoHeight;
    // Même transformation que WebcamLayer : cadrage cover + miroir.
    const scale = Math.max(canvasW / vw, canvasH / vh);
    const srcW = canvasW / scale;
    const srcH = canvasH / scale;
    ctx.save();
    ctx.translate(canvasW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoEl, (vw - srcW) / 2, (vh - srcH) / 2, srcW, srcH, 0, 0, canvasW, canvasH);
    ctx.restore();

    const { buffer } = ctx.getImageData(0, 0, canvasW, canvasH).data;
    const input: WorkerInput = {
      buffer,
      width: canvasW,
      height: canvasH,
      threshold: MOTION.THRESHOLD,
      step: MOTION.SAMPLE_STEP,
      clusterRadius: MOTION.CLUSTER_RADIUS,
    };
    this.workerBusy = true;
    this.worker.postMessage(input, [buffer]);
  }

  private handleWorkerMessage = (msg: MessageEvent<WorkerOutput>): void => {
    this.workerBusy = false;
    const spreadScale = Math.max(this.scaleX, this.scaleY);
    const clusters: MotionCluster[] = msg.data.clusters.map((cl) => ({
      x: cl.x * this.scaleX,
      y: cl.y * this.scaleY,
      intensity: cl.intensity,
      spread: cl.spread * spreadScale,
    }));
    this.onClusters(clusters);
  };

  destroy(): void {
    this.worker.terminate();
  }
}
