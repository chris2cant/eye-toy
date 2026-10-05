import type { MotionCluster, WorkerInput } from "./motionTypes";

type ClusterAccum = { x: number; y: number; totalDiff: number; count: number; cell: number };

function cellKey(cx: number, cy: number): number {
  return cy * 4096 + cx;
}

function nearestInBucket(
  bucket: ClusterAccum[] | undefined,
  point: { x: number; y: number },
  maxSq: number,
): { cluster: ClusterAccum; distSq: number } | null {
  let best: { cluster: ClusterAccum; distSq: number } | null = null;
  let bestSq = maxSq;
  for (const cl of bucket ?? []) {
    const distSq = (point.x - cl.x) ** 2 + (point.y - cl.y) ** 2;
    if (distSq < bestSq) { bestSq = distSq; best = { cluster: cl, distSq }; }
  }
  return best;
}

function findNearest(
  grid: Map<number, ClusterAccum[]>,
  point: { x: number; y: number },
  radius: number,
): ClusterAccum | null {
  const cx = Math.floor(point.x / radius);
  const cy = Math.floor(point.y / radius);
  let nearest: ClusterAccum | null = null;
  let nearestSq = radius * radius;
  for (let gy = cy - 1; gy <= cy + 1; gy++) {
    for (let gx = cx - 1; gx <= cx + 1; gx++) {
      const candidate = nearestInBucket(grid.get(cellKey(gx, gy)), point, nearestSq);
      if (!candidate) continue;
      nearest = candidate.cluster;
      nearestSq = candidate.distSq;
    }
  }
  return nearest;
}

function addToCell(grid: Map<number, ClusterAccum[]>, cl: ClusterAccum, radius: number): void {
  cl.cell = cellKey(Math.floor(cl.x / radius), Math.floor(cl.y / radius));
  const bucket = grid.get(cl.cell);
  if (bucket) bucket.push(cl);
  else grid.set(cl.cell, [cl]);
}

function moveCluster(grid: Map<number, ClusterAccum[]>, cl: ClusterAccum, radius: number): void {
  const nextCell = cellKey(Math.floor(cl.x / radius), Math.floor(cl.y / radius));
  if (nextCell === cl.cell) return;
  const bucket = grid.get(cl.cell);
  if (bucket) bucket.splice(bucket.indexOf(cl), 1);
  addToCell(grid, cl, radius);
}

function absorb(cl: ClusterAccum, pixel: { x: number; y: number; diff: number }): void {
  cl.count++;
  cl.x += (pixel.x - cl.x) / cl.count;
  cl.y += (pixel.y - cl.y) / cl.count;
  cl.totalDiff += pixel.diff;
}

function clusterPixel(
  state: { grid: Map<number, ClusterAccum[]>; all: ClusterAccum[] },
  pixel: { x: number; y: number; diff: number },
  radius: number,
): void {
  const near = findNearest(state.grid, pixel, radius);
  if (near) {
    absorb(near, pixel);
    moveCluster(state.grid, near, radius);
    return;
  }
  const created: ClusterAccum = { x: pixel.x, y: pixel.y, totalDiff: pixel.diff, count: 1, cell: 0 };
  state.all.push(created);
  addToCell(state.grid, created, radius);
}

export function diffFrames(input: WorkerInput, curr: Uint8ClampedArray, prev: Uint8ClampedArray): ClusterAccum[] {
  const { width, height, threshold, step, clusterRadius } = input;
  const state = { grid: new Map<number, ClusterAccum[]>(), all: [] as ClusterAccum[] };
  for (let py = 0; py < height; py += step) {
    for (let px = 0; px < width; px += step) {
      const idx = (py * width + px) * 4;
      const diff =
        (Math.abs(curr[idx] - prev[idx]) + Math.abs(curr[idx + 1] - prev[idx + 1]) + Math.abs(curr[idx + 2] - prev[idx + 2])) / 3;
      if (diff > threshold) clusterPixel(state, { x: px, y: py, diff }, clusterRadius);
    }
  }
  return state.all;
}

export function toClusters(accums: ClusterAccum[], step: number): MotionCluster[] {
  return accums.map((cl) => ({
    x: cl.x,
    y: cl.y,
    intensity: Math.min(1, (cl.totalDiff / cl.count / 255) * (1 + cl.count * 0.04)),
    spread: Math.max(step, Math.sqrt(cl.count) * step * 0.9),
  }));
}

/** Diff pixel à pixel entre deux frames RGBA, regroupé en clusters de mouvement. */
export function detectMotion(input: WorkerInput, curr: Uint8ClampedArray, prev: Uint8ClampedArray): MotionCluster[] {
  return toClusters(diffFrames(input, curr, prev), input.step);
}
