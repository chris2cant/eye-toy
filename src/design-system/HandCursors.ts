import Phaser from "phaser";
import { HEX } from "./tokens";

export class HandCursors {
  private readonly _arcs: Phaser.GameObjects.Arc[];

  constructor(scene: Phaser.Scene, depth: number) {
    this._arcs = [HEX.brandPrimary, HEX.info].map((color) =>
      scene.add.circle(0, 0, 20, color, 0.85).setDepth(depth).setVisible(false),
    );
  }

  update(positions: ({ x: number; y: number } | null)[]) {
    positions.forEach((pos, i) => {
      const arc = this._arcs[i];
      if (!pos) {
        arc.setVisible(false);
        return;
      }
      arc.setPosition(pos.x, pos.y).setVisible(true);
    });
  }
}
