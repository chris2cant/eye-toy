const BASE = "https://storage.googleapis.com/mediapipe-models";

const MODELS = {
  hand: { local: "/models/hand_landmarker.task", remote: `${BASE}/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task` },
  poseLite: { local: "/models/pose_landmarker_lite.task", remote: `${BASE}/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task` },
} as const;

export type ModelName = keyof typeof MODELS;

/** Modèle local si présent (cache HTTP, pas de réseau tiers), sinon CDN Google. */
export async function resolveModelUrl(name: ModelName): Promise<string> {
  const { local, remote } = MODELS[name];
  try {
    const head = await fetch(local, { method: "HEAD" });
    const type = head.headers.get("content-type") ?? "";
    return head.ok && !type.includes("text/html") ? local : remote;
  } catch {
    return remote;
  }
}
