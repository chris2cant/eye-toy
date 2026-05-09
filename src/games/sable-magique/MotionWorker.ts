/// <reference lib="webworker" />
export {}; // module scope

interface WorkerInput {
  prevData: Uint8ClampedArray;
  currData: Uint8ClampedArray;
  width: number;
  height: number;
  threshold: number;
  step: number;
  clusterRadius: number;
}

interface RawCluster {
  x: number;
  y: number;
  intensity: number;
  spread: number;
}

interface WorkerOutput {
  clusters: RawCluster[];
}

type ActivePixel = { x: number; y: number; diff: number };
type ClusterAccum = { x: number; y: number; totalDiff: number; count: number };

function clusterActivePixels(active: ActivePixel[], clusterRadius: number): ClusterAccum[] {
  const clusters: ClusterAccum[] = [];
  for (const pixel of active) {
    let nearestIdx = -1;
    let nearestDist = Infinity;
    for (let ci = 0; ci < clusters.length; ci++) {
      const cl = clusters[ci];
      const dx = pixel.x - cl.x;
      const dy = pixel.y - cl.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = ci;
      }
    }
    if (nearestIdx >= 0 && nearestDist < clusterRadius) {
      const cl = clusters[nearestIdx];
      cl.count++;
      cl.x += (pixel.x - cl.x) / cl.count;
      cl.y += (pixel.y - cl.y) / cl.count;
      cl.totalDiff += pixel.diff;
    } else {
      clusters.push({ x: pixel.x, y: pixel.y, totalDiff: pixel.diff, count: 1 });
    }
  }
  return clusters;
}

self.onmessage = (msg: MessageEvent<WorkerInput>): void => {
  const { prevData, currData, width, height, threshold, step, clusterRadius } = msg.data;

  // Collect pixels whose average RGB delta exceeds the threshold.
  const active: ActivePixel[] = [];
  for (let py = 0; py < height; py += step) {
    for (let px = 0; px < width; px += step) {
      const idx = (py * width + px) * 4;
      const dR = Math.abs(currData[idx] - prevData[idx]);
      const dG = Math.abs(currData[idx + 1] - prevData[idx + 1]);
      const dB = Math.abs(currData[idx + 2] - prevData[idx + 2]);
      const diff = (dR + dG + dB) / 3;
      if (diff > threshold) active.push({ x: px, y: py, diff });
    }
  }

  const clusters = clusterActivePixels(active, clusterRadius);

  // Derive a [0, 1] intensity from mean diff, boosted by cluster density.
  const result: WorkerOutput = {
    clusters: clusters.map((cl) => ({
      x: cl.x,
      y: cl.y,
      intensity: Math.min(1, (cl.totalDiff / cl.count / 255) * (1 + cl.count * 0.04)),
      spread: Math.max(step, Math.sqrt(cl.count) * step * 0.9),
    })),
  };

  self.postMessage(result);
};
