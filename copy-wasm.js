import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";

const src = "node_modules/@mediapipe/tasks-vision/wasm";
const dest = "public/wasm";
const modelsDest = "public/models";
const BASE = "https://storage.googleapis.com/mediapipe-models";
const MODELS = {
  "hand_landmarker.task": `${BASE}/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
  "pose_landmarker_lite.task": `${BASE}/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
};

mkdirSync(dest, { recursive: true });
for (const file of readdirSync(src)) {
  copyFileSync(join(src, file), join(dest, file));
  console.log(`copied ${file}`);
}

// Modèles MediaPipe hébergés localement (gitignorés). Téléchargés une seule fois ;
// en cas d'échec réseau le runtime retombe sur le CDN Google.
mkdirSync(modelsDest, { recursive: true });
for (const [name, url] of Object.entries(MODELS)) {
  const target = join(modelsDest, name);
  if (existsSync(target)) continue;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    writeFileSync(target, Buffer.from(await response.arrayBuffer()));
    console.log(`downloaded ${name}`);
  } catch (err) {
    console.warn(`model ${name} non téléchargé (${err.message}) — fallback CDN au runtime`);
  }
}
