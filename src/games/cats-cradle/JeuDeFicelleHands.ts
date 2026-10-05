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

const WRIST = 0;
const INDEX_MCP = 5;
const MIDDLE_MCP = 9;
const FINGER_MCPS = [1, 5, 9, 13, 17];
const FINGER_EXTENDED_RATIO = 1.45;
const THUMB_EXTENDED_PALM_RATIO = 0.55;

function landmarkDistance(a: HandLandmarkLike, b: HandLandmarkLike): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Le pouce est levé s'il est écarté de la base de l'index (relativement à la taille de la paume).
function isThumbExtended(hand: HandLandmarkLike[]): boolean {
  const palmSize = landmarkDistance(hand[WRIST], hand[MIDDLE_MCP]);
  return landmarkDistance(hand[4], hand[INDEX_MCP]) > palmSize * THUMB_EXTENDED_PALM_RATIO;
}

/** Un doigt est levé si son bout est bien plus loin du poignet que sa base (replié : bout proche de la paume). */
export function isFingerExtended(hand: HandLandmarkLike[], fingerIndex: number): boolean {
  if (fingerIndex === 0) return isThumbExtended(hand);
  const tipDist = landmarkDistance(hand[FINGERTIP_INDICES[fingerIndex]], hand[WRIST]);
  const mcpDist = landmarkDistance(hand[FINGER_MCPS[fingerIndex]], hand[WRIST]);
  return tipDist > mcpDist * FINGER_EXTENDED_RATIO;
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
      if (!isFingerExtended(hand, fi)) continue;
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
