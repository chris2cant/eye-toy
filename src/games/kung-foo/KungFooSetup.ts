import { COLOR, FONT, DEPTH, HEX } from "../../design-system/tokens";
import { DwellButton } from "../../design-system/DwellButton";
import { createLivesBadge } from "../../design-system/components/LivesBadge";
import type { Difficulty } from "./WaveManager";
import { MAX_LIVES, PLAT_W, STAGE_Y_FRACS } from "./KungFooState";
import type { KungFooState } from "./KungFooState";

export function showDifficultySelector(
  scene: Phaser.Scene,
  spec: { state: KungFooState; width: number; height: number; onPick: (difficulty: Difficulty) => void },
): void {
  const { state, width, height, onPick } = spec;
  buildDifficultyHeader(scene, state, width, height);
  buildDifficultyButtons(scene, { state, width, height, onPick });
}

function buildDifficultyHeader(scene: Phaser.Scene, state: KungFooState, width: number, height: number): void {
  const addToUi = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
    state.difficultyUiElements.push(obj);
    return obj;
  };
  addToUi(scene.add.text(width / 2, height * 0.18, "KUNG FOO", {
    fontSize: "52px", fontFamily: FONT.display, fontStyle: "900", color: COLOR.danger,
    shadow: { offsetX: 0, offsetY: 0, color: COLOR.danger, blur: 20, fill: true },
  }).setOrigin(0.5).setDepth(DEPTH.topUi));
  addToUi(scene.add.text(width / 2, height * 0.27, "Choisis ta difficulté", {
    fontSize: "20px", fontFamily: FONT.ui, color: COLOR.textSecondary,
  }).setOrigin(0.5).setDepth(DEPTH.hud));
}

function buildDifficultyButtons(
  scene: Phaser.Scene,
  spec: { state: KungFooState; width: number; height: number; onPick: (difficulty: Difficulty) => void },
): void {
  const { state, width, height, onPick } = spec;
  const difficulties: Array<{ label: string; value: Difficulty; y: number }> = [
    { label: "EASY", value: "easy", y: height * 0.35 },
    { label: "MEDIUM", value: "medium", y: height * 0.42 },
    { label: "HARD", value: "hard", y: height * 0.49 },
  ];
  difficulties.forEach(({ label, value, y }) => {
    const btn = new DwellButton(scene, width / 2, y, {
      label, fontSize: "28px",
      onActivate: () => {
        state.difficultyButtons.forEach((diffBtn) => diffBtn.destroy());
        state.difficultyButtons = [];
        state.difficultyUiElements.forEach((el) => el.destroy());
        state.difficultyUiElements = [];
        onPick(value);
      },
      depth: DEPTH.hud, dwellMs: 1200,
    });
    state.difficultyButtons.push(btn);
  });
}

export function applyDifficultyState(state: KungFooState, difficulty: Difficulty): void {
  const milestonesByDifficulty: Record<Difficulty, number[]> = {
    easy: [300, 700, 1400, 2500],
    medium: [500, 1200, 2500, 4500],
    hard: [800, 2000, 4000, 7000],
  };
  state.milestones = milestonesByDifficulty[difficulty];
  state.nextMilestoneIdx = 0;
}

export function buildGameplayUi(scene: Phaser.Scene, state: KungFooState, width: number, height: number): void {
  state.livesBadge = createLivesBadge(scene, width - 100, height * 0.06, MAX_LIVES);
  state.livesBadge.container.setDepth(DEPTH.hud);
  buildPlatforms(scene, width, height);
  buildCenterLine(scene, width, height);
  state.turboOverlay = scene.add.rectangle(width / 2, height / 2, width, height, HEX.warning, 0).setDepth(DEPTH.overlay).setVisible(false);
  state.turboBackground = scene.add.rectangle(width - 8, height - 12, 190, 38, HEX.warning, 0.15).setOrigin(1, 1).setDepth(DEPTH.topUi - 1).setVisible(false);
  state.turboText = scene.add.text(width - 16, height - 20, "✦ TURBO ✦  ×2", {
    fontSize: "22px", fontFamily: FONT.display, color: COLOR.warning,
    shadow: { offsetX: 0, offsetY: 0, color: COLOR.warning, blur: 14, fill: true },
  }).setOrigin(1, 1).setDepth(DEPTH.topUi).setVisible(false);
}

function buildPlatforms(scene: Phaser.Scene, width: number, height: number): void {
  const graphics = scene.add.graphics().setDepth(DEPTH.game - 2);
  const platformHeight = 8;
  const feetOffset = 68;
  const xs = [{ x0: 0, x1: PLAT_W }, { x0: width - PLAT_W, x1: width }];
  for (const frac of STAGE_Y_FRACS) {
    const y = frac * height + feetOffset;
    for (const { x0, x1 } of xs) {
      graphics.fillStyle(HEX.danger, 0.08); graphics.fillRect(x0, y - 4, x1 - x0, platformHeight + 8);
      graphics.fillStyle(HEX.nightBlue, 0.85); graphics.fillRect(x0, y, x1 - x0, platformHeight);
      graphics.lineStyle(2, HEX.danger, 0.75); graphics.lineBetween(x0, y, x1, y);
      graphics.lineStyle(1, 0xffffff, 0.12); graphics.lineBetween(x0, y + 2, x1, y + 2);
    }
  }
}

function buildCenterLine(scene: Phaser.Scene, width: number, height: number): void {
  const line = scene.add.graphics();
  line.lineStyle(2, HEX.danger, 0.45);
  line.lineBetween(width / 2, 0, width / 2, height);
  line.fillStyle(HEX.danger, 0.06);
  line.fillRect(width / 2 - 40, 0, 80, height);
  line.setDepth(DEPTH.game - 1);
  scene.tweens.add({ targets: line, alpha: { from: 0.5, to: 1 }, duration: 900, yoyo: true, repeat: -1, ease: "Sine.InOut" });
  scene.add.text(width / 2, height * 0.92, "⚡ DÉFENDS LE CENTRE ⚡", {
    fontSize: "13px", fontFamily: FONT.ui, color: COLOR.danger,
  }).setOrigin(0.5).setAlpha(0.55).setDepth(DEPTH.game - 1);
}

export function runCountdown(scene: Phaser.Scene, onComplete: () => void): void {
  const steps = ["3", "2", "1", "GO!"];
  let stepIndex = 0;
  const showNext = () => {
    if (stepIndex >= steps.length) { onComplete(); return; }
    const step = steps[stepIndex];
    const isGo = step === "GO!";
    stepIndex++;
    const txt = createCountdownText(scene, step, isGo);
    animateCountdownStep(scene, txt, isGo, showNext);
  };
  showNext();
}

function createCountdownText(scene: Phaser.Scene, step: string, isGo: boolean): Phaser.GameObjects.Text {
  const { width, height } = scene.scale;
  return scene.add.text(width / 2, height / 2, step, {
    fontSize: "160px", fontFamily: FONT.display, fontStyle: "900",
    color: isGo ? COLOR.brandPrimary : COLOR.textPrimary,
    stroke: COLOR.bgCanvas, strokeThickness: 6,
    shadow: isGo ? { offsetX: 0, offsetY: 0, color: COLOR.brandPrimary, blur: 30, fill: true } : undefined,
  }).setOrigin(0.5).setScale(2).setDepth(DEPTH.topUi);
}

function animateCountdownStep(scene: Phaser.Scene, txt: Phaser.GameObjects.Text, isGo: boolean, onDone: () => void): void {
  scene.tweens.add({
    targets: txt, scale: 1, duration: 400, ease: "Power2.Out",
    onComplete: () => {
      scene.time.delayedCall(isGo ? 400 : 500, () => {
        scene.tweens.add({ targets: txt, alpha: 0, duration: 200, onComplete: () => { txt.destroy(); onDone(); } });
      });
    },
  });
}
