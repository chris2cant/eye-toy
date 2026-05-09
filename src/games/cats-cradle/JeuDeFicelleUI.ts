import { COLOR, FONT, DEPTH } from "../../design-system/tokens";

export const STYLE_NAMES = ["TOILE BLEUE 5x5", "NEON FIN", "LASER BLANC", "ARCADE", "POINTILLES"];

export interface FicelleUIRefs {
  statusTxt: Phaser.GameObjects.Text;
  styleTxt: Phaser.GameObjects.Text;
}

export function buildFicelleUI(scene: Phaser.Scene, width: number, height: number, initialStyleLabel: string): FicelleUIRefs {
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

  scene.add
    .text(width / 2, height * 0.94, "Tends tes mains, rapproche les doigts, fais vibrer les fils — M ou ESPACE change le style", {
      fontSize: "14px",
      fontFamily: FONT.ui,
      color: COLOR.textMuted,
    })
    .setOrigin(0.5)
    .setDepth(DEPTH.hud);

  return { statusTxt, styleTxt };
}
