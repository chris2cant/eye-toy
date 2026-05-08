import { COLOR, FONT, DEPTH, HEX } from "../../design-system/tokens";
import { DwellButton } from "../../design-system/DwellButton";

export const STYLE_NAMES = ["TOILE BLEUE 5x5", "NEON FIN", "LASER BLANC", "ARCADE", "POINTILLES"];

export interface FicelleUIRefs {
  statusTxt: Phaser.GameObjects.Text;
  styleTxt: Phaser.GameObjects.Text;
  btnBack: DwellButton;
}

export function buildFicelleUI(scene: Phaser.Scene, width: number, height: number, initialStyleLabel: string): FicelleUIRefs {
  scene.add.rectangle(width / 2, 0, width, 56, HEX.bgCanvas, 0.72).setOrigin(0.5, 0).setDepth(DEPTH.hud - 1);

  const statusTxt = scene.add
    .text(width - 20, 14, "MODE FICELLE LIBRE", {
      fontSize: "22px",
      fontFamily: FONT.display,
      color: COLOR.brandPrimary,
      shadow: { offsetX: 0, offsetY: 0, color: COLOR.brandPrimary, blur: 12, fill: true },
    })
    .setOrigin(1, 0)
    .setDepth(DEPTH.topUi);

  const styleTxt = scene.add
    .text(width / 2, 14, initialStyleLabel, {
      fontSize: "18px",
      fontFamily: FONT.display,
      color: COLOR.textPrimary,
      shadow: { offsetX: 0, offsetY: 0, color: COLOR.brandPrimary, blur: 10, fill: true },
    })
    .setOrigin(0.5, 0)
    .setDepth(DEPTH.topUi);

  const btnBack = new DwellButton(scene, 100, height * 0.12, {
    label: "← MENU",
    fontSize: "20px",
    onActivate: () => scene.scene.start("MenuScene", { selectedGameKey: scene.sys.settings.key }),
    depth: DEPTH.hud,
    dwellMs: 1000,
    fillColor: HEX.nightBlue,
  });

  scene.add
    .text(width / 2, height * 0.94, "Tends tes mains, rapproche les doigts, fais vibrer les fils — M ou ESPACE change le style", {
      fontSize: "14px",
      fontFamily: FONT.ui,
      color: COLOR.textMuted,
    })
    .setOrigin(0.5)
    .setDepth(DEPTH.hud);

  return { statusTxt, styleTxt, btnBack };
}
