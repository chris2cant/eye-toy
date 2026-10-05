import { describe, expect, it } from "vitest";
import { detectMotion } from "../../src/games/sable-magique/motionClustering";
import type { WorkerInput } from "../../src/games/sable-magique/motionTypes";

const SIZE = 40;

function blankFrame(): Uint8ClampedArray {
  return new Uint8ClampedArray(SIZE * SIZE * 4);
}

function paintSquare(frame: Uint8ClampedArray, x0: number, y0: number, side: number): void {
  for (let y = y0; y < y0 + side; y++) {
    for (let x = x0; x < x0 + side; x++) frame.fill(255, (y * SIZE + x) * 4, (y * SIZE + x) * 4 + 3);
  }
}

const input: WorkerInput = {
  buffer: new ArrayBuffer(0),
  width: SIZE,
  height: SIZE,
  threshold: 18,
  step: 1,
  clusterRadius: 8,
};

describe("detectMotion", () => {
  it("ne détecte rien entre deux frames identiques", () => {
    expect(detectMotion(input, blankFrame(), blankFrame())).toEqual([]);
  });

  it("regroupe un bloc de pixels changés en un seul cluster centré dessus", () => {
    const curr = blankFrame();
    paintSquare(curr, 10, 10, 4);
    const clusters = detectMotion(input, curr, blankFrame());
    expect(clusters).toHaveLength(1);
    expect(clusters[0].x).toBeCloseTo(11.5, 1);
    expect(clusters[0].y).toBeCloseTo(11.5, 1);
    expect(clusters[0].intensity).toBeGreaterThan(0.5);
  });

  it("sépare deux zones éloignées en deux clusters", () => {
    const curr = blankFrame();
    paintSquare(curr, 2, 2, 3);
    paintSquare(curr, 30, 30, 3);
    expect(detectMotion(input, curr, blankFrame())).toHaveLength(2);
  });
});
