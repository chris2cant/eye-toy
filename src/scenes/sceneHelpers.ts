import Phaser from "phaser";
import { handTracker } from "../camera/HandTracker";
import type { LandmarksPayload } from "../camera/HandTracker";
import { COLOR, DEPTH, FONT } from "../design-system/tokens";

/** Touche Q → retour au menu (avec le jeu courant présélectionné). Nettoyée au shutdown. */
export function bindQuitKey(scene: Phaser.Scene): void {
  if (scene.sys.settings.status >= Phaser.Scenes.SHUTDOWN) return;
  const onQuit = (): void => {
    scene.scene.start("MenuScene", { selectedGameKey: scene.sys.settings.key });
  };
  scene.input.keyboard?.on("keydown-Q", onQuit);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.input.keyboard?.off("keydown-Q", onQuit));
}

/**
 * Écoute les landmarks pendant la durée de vie de la scène. Sans effet si la scène
 * a déjà été quittée pendant son initialisation asynchrone (pas de listener orphelin).
 */
export function listenLandmarks(scene: Phaser.Scene, handler: (payload: LandmarksPayload) => void): void {
  if (scene.sys.settings.status >= Phaser.Scenes.SHUTDOWN) return;
  handTracker.on("landmarks", handler);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => handTracker.off("landmarks", handler));
}

export function showCameraError(scene: Phaser.Scene): void {
  const { width, height } = scene.scale;
  scene.add
    .text(width / 2, height / 2, "Caméra refusée\nVeuillez autoriser l'accès à la webcam", {
      fontSize: "28px",
      fontFamily: FONT.ui,
      color: COLOR.danger,
      align: "center",
    })
    .setOrigin(0.5)
    .setDepth(DEPTH.topUi);
}
