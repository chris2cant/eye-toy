import { copyFileSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";

const src = "node_modules/@mediapipe/tasks-vision/wasm";
const dest = "public/wasm";

mkdirSync(dest, { recursive: true });

for (const file of readdirSync(src)) {
  copyFileSync(join(src, file), join(dest, file));
  console.log(`copied ${file}`);
}
