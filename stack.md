# Stack — eye-toy

## Context

Web app inspired by the PlayStation EyeToy: live webcam feed, real-time hand/body/face detection, 2D gameplay rendered on top. Everything runs client-side, no server, no backend.

---

## 1. Detection: MediaPipe Tasks Vision vs TensorFlow.js

### MediaPipe Tasks Vision (`@mediapipe/tasks-vision`)

| Criterion | Detail |
|-----------|--------|
| **Available models** | Hand Landmarker (21 pts/hand), Face Landmarker (478 pts), Pose Landmarker (33 pts), Holistic (hand + face + body in one call) |
| **Ease of use** | Very high-level API: `HandLandmarker.create(...)` → `.detect(videoFrame)` → landmarks ready |
| **Performance** | WASM + WebGL delegate, ~30 fps stable on an average laptop |
| **Accuracy** | Excellent for hands (state of the art), very good for face and pose |
| **Bundle size** | ~8–15 MB (models included, loaded from CDN or local) |
| **Maintenance** | Maintained by Google AI Edge, stable API since 2023 |
| **Holistic** | `HolisticLandmarker` gives hand + face + pose in a single call — ideal for this project |

### TensorFlow.js

| Criterion | Detail |
|-----------|--------|
| **Available models** | HandPose, FaceMesh, BlazePose (MoveNet), but each model is a separate package |
| **Ease of use** | More verbose: WebGL backend management, manual model loading, preprocessing pipeline to wire up |
| **Performance** | Comparable with WebGL backend, but more variable depending on config |
| **Accuracy** | Identical (MediaPipe is the upstream source for the same hand/face models) |
| **Bundle size** | Heavier: TF core (~500 KB) + WebGL backend + each model |
| **Real strength** | Custom model training, fine-tuning, complex ML pipelines |
| **For this project** | Over-engineering: no need to train or customize models |

### Detection verdict

**→ MediaPipe Tasks Vision**

- API 3× simpler for the same results
- `HolisticLandmarker` covers all 3 needs (hands + body + face) in a single call
- Better performance thanks to the WASM delegate
- TensorFlow.js brings no advantage for pure inference with pre-trained models

---

## 2. 2D rendering: library comparison

### Phaser 3

| Criterion | Detail |
|-----------|--------|
| **Type** | Full game framework (renderer + scenes + physics + assets + input) |
| **Renderer** | WebGL with Canvas fallback |
| **Assets** | Sprite atlases, Tiled tilemaps, frame-by-frame animations, tweens, particles — all built-in |
| **Scenes** | Native scene system (BootScene, GameScene, UIScene) — perfect for menu/game/score |
| **UI / Menu** | Overlay UI scene natively, ready-to-use GameObjects (Text, Image, Button) |
| **Community** | Very large, +13,000 GitHub stars, tons of examples and free asset packs |
| **Learning curve** | Gentle for classic 2D games |
| **Size** | ~1 MB minified |

### PixiJS

| Criterion | Detail |
|-----------|--------|
| **Type** | Pure 2D renderer (no game loop, no physics, no scenes) |
| **Strength** | Maximum WebGL performance, great for rich interactive UIs |
| **Missing** | No built-in scene system, no physics, no advanced asset management → everything must be wired manually |
| **Verdict** | Better choice for interactive non-game apps; custom work for a game |

### Babylon.js / Three.js

3D-oriented. Unnecessary here — significant overhead for pure 2D.

### Konva

Interactive 2D canvas. Good for tools (diagrams, editors). Not suited for a game with a game loop.

### 2D rendering verdict

**→ Phaser 3**

- Native scene system → menu, game, score screen without friction
- Assets: sprites, animations, particles available out-of-the-box
- Built-in game loop — no manual `requestAnimationFrame`
- Rich ecosystem: compatible asset packs (Kenney, itch.io...)
- The `HandTracker → EventEmitter → GameScene` decoupling is trivial to implement with Phaser

---

## 3. Chosen stack

> Official reference: [`google-ai-edge/mediapipe-samples-web`](https://github.com/google-ai-edge/mediapipe-samples-web) — aligned with their `package.json`.

| Layer | Choice | Version | Rationale |
|-------|--------|---------|-----------|
| **Detection** | `@mediapipe/tasks-vision` | `^0.10.35` | HolisticLandmarker, simple API, WASM perf |
| **2D rendering** | Phaser 3 | `^3.x` | Scenes, assets, game loop, menu — all built-in |
| **Language** | TypeScript | `^6.0` | Landmark typing, Phaser autocompletion |
| **Bundler** | Vite | `^8.0` | Fast HMR, minimal config, WASM-compatible |
| **Package manager** | pnpm | `9.x` | MediaPipe team's choice, reliable lockfile |
| **Tests** | Playwright | `^1.59` | Chromium GPU tests (required for WebGL) |
| **Base template** | `phaserjs/template-vite-ts` | — | Starts with the right config out of the box |

### Critical point: copy-wasm.js

The official samples use a `copy-wasm.js` script as **predev** and **prebuild**. MediaPipe `.wasm` files must be copied into `public/` before Vite serves them — without this, models fail to load at runtime.

```json
"scripts": {
  "predev": "node copy-wasm.js",
  "prebuild": "node copy-wasm.js"
}
```

### Detection scope

| Feature | MediaPipe model |
|---------|----------------|
| Hands (21 landmarks/hand, 2 hands) | `HandLandmarker` |
| Face (478 landmarks) | `FaceLandmarker` |
| Body / pose (33 landmarks) | `PoseLandmarker` |
| All-in-one | `HolisticLandmarker` |

---

## 4. Decoupling architecture

```
┌─────────────────────────────────────────┐
│  HandTracker (camera/HandTracker.ts)    │
│  independent loop from Phaser           │
│  requestAnimationFrame → MediaPipe      │
│         │                               │
│         │ emit("landmarks", data)       │
│         ▼                               │
│   EventEmitter (mitt / Phaser.Events)  │
│         │                               │
│         ▼                               │
│   GameScene (scenes/GameScene.ts)       │
│   listens for events, updates cursors   │
│   and checks collisions                 │
└─────────────────────────────────────────┘
```

**Hard rule:** no MediaPipe imports inside Phaser scenes. `HandTracker` is the only layer that touches the camera and models.

---

## 5. Rejected alternatives

| Alternative | Why rejected |
|-------------|-------------|
| TensorFlow.js | Same models, more complex API, no gain for pure inference |
| PixiJS | Renderer only — missing everything that makes a game (scenes, assets, loop) |
| React + Canvas | React overhead unnecessary for a real-time game |
| ml5.js | Deprecated TF.js wrapper, older models than MediaPipe |
| OpenCV.js | Low-level, no ready-to-use pose/hands models |
