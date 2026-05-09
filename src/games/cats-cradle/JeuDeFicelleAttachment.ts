type Point = { x: number; y: number };

export function arePairHandsAttached(
  indices: number[],
  handPositions: (Point | null)[],
  smoothTips: (Point | null)[][],
  maxDistance: number,
): boolean {
  if (indices.length < 2) return false;
  const palm0 = handPositions[indices[0]];
  const palm1 = handPositions[indices[1]];
  if (!palm0 || !palm1) return false;
  const handDistance = Math.hypot(palm0.x - palm1.x, palm0.y - palm1.y);
  if (handDistance > maxDistance) return false;
  const t0 = smoothTips[indices[0]];
  const t1 = smoothTips[indices[1]];
  return t0.some((tip) => tip !== null) && t1.some((tip) => tip !== null);
}
