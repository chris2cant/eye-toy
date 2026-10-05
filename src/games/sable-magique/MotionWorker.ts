/// <reference lib="webworker" />
import { detectMotion } from "./motionClustering";
import type { WorkerInput, WorkerOutput } from "./motionTypes";

let prevFrame: Uint8ClampedArray | null = null;
let prevSize = "";

self.onmessage = (msg: MessageEvent<WorkerInput>): void => {
  const input = msg.data;
  const curr = new Uint8ClampedArray(input.buffer);
  const size = `${input.width}x${input.height}`;
  const prev = size === prevSize ? prevFrame : null;
  const clusters = prev ? detectMotion(input, curr, prev) : [];
  prevFrame = curr;
  prevSize = size;
  const result: WorkerOutput = { clusters };
  self.postMessage(result);
};
