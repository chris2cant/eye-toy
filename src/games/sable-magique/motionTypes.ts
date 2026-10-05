export interface MotionCluster {
  /** Screen-space X coordinate (pixels). */
  x: number;
  /** Screen-space Y coordinate (pixels). */
  y: number;
  /** Movement intensity in [0, 1]. */
  intensity: number;
  /** Approximate moving area radius (pixels). */
  spread: number;
}

/** Frame RGBA transférée au worker, qui garde lui-même la frame précédente. */
export interface WorkerInput {
  buffer: ArrayBuffer;
  width: number;
  height: number;
  threshold: number;
  step: number;
  clusterRadius: number;
}

export interface WorkerOutput {
  clusters: MotionCluster[];
}
