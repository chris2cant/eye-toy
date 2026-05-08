import Phaser from "phaser";
import { HEX, COLOR, FONT } from "../tokens";

const TIERS: { min: number; color: number; label: string }[] = [
  { min: 300, color: HEX.turquoise,  label: "GÉNIAL !" },
  { min: 200, color: HEX.sunYellow,  label: "SUPER !"  },
  { min:   0, color: HEX.punchyPink, label: "BRAVO !"  },
];

export interface FeedbackConfig {
  x: number;
  y: number;
  points: number;
  label?: string;
}

function buildFeedbackBubble(
  scene: Phaser.Scene,
  config: FeedbackConfig,
): Phaser.GameObjects.Container {
  const tier = TIERS.find((entry) => config.points >= entry.min) ?? TIERS[TIERS.length - 1];
  const mainLabel = config.label ?? tier.label;
  const pointsStr = config.points > 0 ? ` +${config.points}` : "";

  const container = scene.add.container(config.x, config.y).setDepth(40);
  const bg = scene.add.graphics();
  const text = scene.add
    .text(0, 0, `${mainLabel}${pointsStr}`, {
      fontSize: "48px",
      fontFamily: FONT.display,
      color: COLOR.white,
      stroke: COLOR.nightBlue,
      strokeThickness: 3,
    })
    .setOrigin(0.5);

  const bgWidth = text.width + 40;
  const bgHeight = text.height + 20;
  bg.fillStyle(tier.color, 1);
  bg.fillRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 20);

  container.add([bg, text]);
  container.setScale(0.7);
  return container;
}

function animateFeedbackBubble(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  targetY: number,
): void {
  scene.tweens.add({
    targets: container,
    scaleX: 1,
    scaleY: 1,
    duration: 160,
    ease: "Back.easeOut",
    onComplete: () => {
      scene.tweens.add({
        targets: container,
        y: targetY - 60,
        alpha: 0,
        duration: 700,
        ease: "Cubic.easeIn",
        delay: 300,
        onComplete: () => container.destroy(),
      });
    },
  });
}

export function showFeedback(scene: Phaser.Scene, config: FeedbackConfig): void {
  const container = buildFeedbackBubble(scene, config);
  animateFeedbackBubble(scene, container, config.y);
}
