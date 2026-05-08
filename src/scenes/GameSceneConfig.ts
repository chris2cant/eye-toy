import Phaser from "phaser";
import { COLOR, FONT, DEPTH } from "../design-system/tokens";

export const GAME_DURATION = 60;
export const GAME_TRACKER_FPS = 24;
export const GAME_WEBCAM_FPS = 24;
export const TIMER_ARC_FPS = 30;
export const TIMER_ARC_FRAME_MS = 1000 / TIMER_ARC_FPS;
export const BACKGROUND_MUSIC_KEY = "music-background-funny-cartoon";

export interface DifficultyTier {
  threshold: number;
  spawnDelay: number;
  radius: number;
  expireDelay: number;
  points: number;
}

export const TIERS: DifficultyTier[] = [
  { threshold: 0,    spawnDelay: 2000, radius: 40, expireDelay: 5000, points: 10 },
  { threshold: 0.33, spawnDelay: 1500, radius: 33, expireDelay: 4000, points: 15 },
  { threshold: 0.66, spawnDelay: 1000, radius: 26, expireDelay: 3000, points: 20 },
];

const COUNTDOWN_STEPS = ["3", "2", "1", "GO!"];

export function runCountdownSequence(scene: Phaser.Scene, onComplete: () => void): void {
  let index = 0;
  const showNext = () => {
    if (index >= COUNTDOWN_STEPS.length) { onComplete(); return; }
    const step = COUNTDOWN_STEPS[index];
    const isGo = step === "GO!";
    const { width, height } = scene.scale;
    const txt = scene.add.text(width / 2, height / 2, step, {
      fontSize: "160px", fontFamily: FONT.display, fontStyle: "900",
      color: isGo ? COLOR.brandPrimary : COLOR.textPrimary,
      stroke: COLOR.bgCanvas, strokeThickness: 6,
      shadow: isGo ? { offsetX: 0, offsetY: 0, color: COLOR.brandPrimary, blur: 30, fill: true } : undefined,
    }).setOrigin(0.5).setScale(2).setDepth(DEPTH.topUi);
    index++;
    scene.tweens.add({
      targets: txt, scale: 1, duration: 400, ease: "Power2.Out",
      onComplete: () => {
        scene.time.delayedCall(isGo ? 400 : 500, () => {
          scene.tweens.add({ targets: txt, alpha: 0, duration: 200, onComplete: () => { txt.destroy(); showNext(); } });
        });
      },
    });
  };
  showNext();
}
