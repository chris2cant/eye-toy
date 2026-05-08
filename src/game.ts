import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { GameScene } from "./scenes/GameScene";
import { UIScene } from "./scenes/UIScene";
import { GameOverScene } from "./scenes/GameOverScene";
import { SkeletonScene } from "./scenes/SkeletonScene";
import { SableMagiqueScene } from "./games/sable-magique/SableMagiqueScene";
import { JeuDeFicelleScene } from "./games/cats-cradle/JeuDeFicelleScene";
import { PaintScene } from "./games/paint/PaintScene";
import { KungFooScene } from "./games/kung-foo/KungFooScene";
import { SimonScene } from "./games/simon/SimonScene";
import { DebugScene } from "./scenes/DebugScene";
import { DesignSystemScene } from "./scenes/DesignSystemScene";

export const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#FFF8F2",
  scene: [
    BootScene,
    MenuScene,
    GameScene,
    KungFooScene,
    UIScene,
    GameOverScene,
    SkeletonScene,
    SableMagiqueScene,
    JeuDeFicelleScene,
    PaintScene,
    SimonScene,
    DebugScene,
    DesignSystemScene,
  ],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};
