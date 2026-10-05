import { defineConfig } from "vite";

export default defineConfig({
  assetsInclude: ["**/*.wasm"],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ["phaser"],
          mediapipe: ["@mediapipe/tasks-vision"],
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
});
