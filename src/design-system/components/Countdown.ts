import Phaser from "phaser";
import { COLOR, FONT, DEPTH } from "../tokens";

const STEP_MS = 1000;
const FADE_MS = 150;
const GO_HOLD_MS = 700;

export function runCountdown(scene: Phaser.Scene, onComplete: () => void): void {
  const steps = ["3", "2", "1", "GO!"];

  steps.forEach((step, i) => {
    const isGo = step === "GO!";
    scene.time.delayedCall(i * STEP_MS, () => {
      const { width, height } = scene.scale;
      const txt = scene.add
        .text(width / 2, height / 2, step, {
          fontSize: "160px",
          fontFamily: FONT.display,
          fontStyle: "900",
          color: isGo ? COLOR.brandPrimary : COLOR.textPrimary,
          stroke: COLOR.bgCanvas,
          strokeThickness: 6,
          shadow: isGo
            ? { offsetX: 0, offsetY: 0, color: COLOR.brandPrimary, blur: 30, fill: true }
            : undefined,
        })
        .setOrigin(0.5)
        .setScale(2)
        .setDepth(DEPTH.topUi);

      scene.tweens.add({ targets: txt, scale: 1, duration: 350, ease: "Back.Out" });

      const holdMs = isGo ? GO_HOLD_MS - FADE_MS : STEP_MS - FADE_MS;
      scene.time.delayedCall(holdMs, () => {
        scene.tweens.add({
          targets: txt,
          alpha: 0,
          duration: FADE_MS,
          onComplete: () => txt.destroy(),
        });
      });
    });
  });

  scene.time.delayedCall(3 * STEP_MS + GO_HOLD_MS, onComplete);
}
