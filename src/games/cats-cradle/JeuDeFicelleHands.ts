export const FINGERTIP_INDICES = [4, 8, 12, 16, 20];

type Point = { x: number; y: number };

interface HandLandmarkLike { x: number; y: number }

interface HandsMappingState {
  handPositions: (Point | null)[];
  targetTips: (Point | null)[][];
}

export function makeEmptyHandPositions(): (Point | null)[] {
  return [null, null, null, null];
}

export function makeEmptyTargetTips(): (Point | null)[][] {
  return [
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null],
  ];
}

export function mapHandLandmarks(
  hands: (HandLandmarkLike[] | null | undefined)[],
  mapper: (x: number, y: number) => Point,
  state: HandsMappingState,
): void {
  hands.forEach((hand, i) => {
    if (!hand || hand.length === 0 || i >= 4) return;
    const palm = hand[9];
    state.handPositions[i] = mapper(palm.x, palm.y);
    for (let fi = 0; fi < FINGERTIP_INDICES.length; fi++) {
      const lm = hand[FINGERTIP_INDICES[fi]];
      state.targetTips[i][fi] = mapper(lm.x, lm.y);
    }
  });
}

export function partitionHandsByPlayer(handPositions: (Point | null)[], screenWidth: number): [number[], number[]] {
  const detectedIndices = handPositions
    .map((pos, i) => (pos ? i : null))
    .filter((i): i is number => i !== null);

  if (detectedIndices.length <= 2) return [detectedIndices, []];

  const p1: number[] = [];
  const p2: number[] = [];
  for (const i of detectedIndices) {
    const pos = handPositions[i];
    if (!pos) continue;
    if (pos.x < screenWidth / 2) p1.push(i);
    else p2.push(i);
  }
  return [p1, p2];
}
