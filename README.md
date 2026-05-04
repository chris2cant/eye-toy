# eye-toy

Web game inspired by the PlayStation EyeToy — hands in front of the webcam to catch targets on screen.

**Stack:** Phaser 3 · MediaPipe Tasks Vision · Vite · TypeScript · pnpm

## Concept

The live webcam feed is displayed on a canvas. MediaPipe detects landmarks for both hands in real time and passes them to Phaser via an EventEmitter. Colored targets appear randomly; the player "catches" them by hovering a hand over them before they expire.

## Architecture

```
src/
├── scenes/
│   ├── BootScene.ts      # asset & webcam init
│   ├── GameScene.ts      # game logic + collisions
│   └── UIScene.ts        # score overlay
├── camera/
│   └── HandTracker.ts    # MediaPipe loop, emits landmarks
├── game.ts               # Phaser config
└── main.ts               # entry point
```

**Architecture rules:**
- `HandTracker` runs independently of the Phaser game loop
- Landmarks are passed to scenes exclusively via `EventEmitter`
- No MediaPipe imports inside Phaser scenes
- 100% client-side, no SSR

## Getting started

```bash
pnpm install
pnpm dev
```

## Agent tooling

Context7 is configured for Phaser and MediaPipe (see `.mcp.json`):

| Lib | Context7 ID |
|-----|-------------|
| Phaser 3 | `/websites/phaser_io` |
| MediaPipe Samples | `/google-ai-edge/mediapipe-samples` |
| MediaPipe core | `/google-ai-edge/mediapipe` |
