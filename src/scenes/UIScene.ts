import Phaser from "phaser";
import { DEPTH } from "../design-system/tokens";
import { createScoreBadge } from "../design-system/components/ScoreBadge";
import { createTimerBadge } from "../design-system/components/TimerBadge";
import type { ScoreBadgeHandle } from "../design-system/components/ScoreBadge";
import type { TimerBadgeHandle } from "../design-system/components/TimerBadge";

export class UIScene extends Phaser.Scene {
  private scoreBadge!: ScoreBadgeHandle;
  private timerBadge!: TimerBadgeHandle;

  constructor() {
    super({ key: "UIScene" });
  }

  create() {
    const { width, height } = this.scale;

    this.scoreBadge = createScoreBadge(this, 100, height * 0.06);
    this.scoreBadge.container.setDepth(DEPTH.topUi);

    this.timerBadge = createTimerBadge(this, width / 2, height * 0.06);
    this.timerBadge.container.setDepth(DEPTH.topUi);

    this.game.events.on("score:update", this.onScoreUpdate, this);
    this.game.events.on("timer:update", this.onTimerUpdate, this);
    this.events.once("shutdown", () => {
      this.game.events.off("score:update", this.onScoreUpdate, this);
      this.game.events.off("timer:update", this.onTimerUpdate, this);
    });
  }

  private onScoreUpdate = (score: number): void => {
    this.scoreBadge.setValue(score);
  };

  private onTimerUpdate = (seconds: number): void => {
    this.timerBadge.setTime(Math.max(0, seconds));
  };
}
