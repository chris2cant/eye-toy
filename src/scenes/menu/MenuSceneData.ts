import { HEX, COLOR } from "../../design-system/tokens";

export interface GameEntry {
  key: string;
  name: string;
  desc: string;
  tag: string;
  icon: string;
  accentHex: number;
  accentCss: string;
}

export type Updatable = { update(hands: ({ x: number; y: number } | null)[], delta: number): void };
export type MenuSceneData = { selectedGameKey?: string };

export const GAMES: GameEntry[] = [
  {
    key: "GameScene",
    name: "Attrape les tous",
    desc: "Attrape les ronds avec tes mains\navant qu'ils disparaissent !",
    tag: "ACTION",
    icon: "✋",
    accentHex: HEX.turquoise,
    accentCss: COLOR.turquoise,
  },
  {
    key: "SableMagiqueScene",
    name: "Sable Magique",
    desc: "Dessine, crée et vois tes\ndessins s'animer !",
    tag: "RELAXATION",
    icon: "🏖️",
    accentHex: HEX.sunYellow,
    accentCss: COLOR.sunYellow,
  },
  {
    key: "SkeletonScene",
    name: "Squelette",
    desc: "Visualisation filaire de ton corps\nen temps réel par MediaPipe.",
    tag: "DÉMO",
    icon: "💀",
    accentHex: HEX.popPurple,
    accentCss: COLOR.popPurple,
  },
  {
    key: "JeuDeFicelleScene",
    name: "Jeu de Ficelle",
    desc: "Tends tes deux mains et crée\ndes cordes lumineuses entre tes doigts.",
    tag: "LUMIÈRE",
    icon: "🌟",
    accentHex: HEX.turquoise,
    accentCss: COLOR.turquoise,
  },
  {
    key: "PaintScene",
    name: "Paint",
    desc: "Pince pouce et index pour dessiner\nsur la webcam avec tes doigts.",
    tag: "CRÉATIF",
    icon: "🎨",
    accentHex: HEX.punchyPink,
    accentCss: COLOR.punchyPink,
  },
  {
    key: "PaintCleanScene",
    name: "Nettoyage Peinture",
    desc: "Efface la peinture en bougeant\ntes mains, tes bras et ton corps.",
    tag: "SPEED",
    icon: "🧼",
    accentHex: HEX.success,
    accentCss: COLOR.success,
  },
  {
    key: "KungFooScene",
    name: "Kung Foo",
    desc: "Des ninjas débarquent !\nFrappe-les avec tes mains.",
    tag: "ACTION",
    icon: "🥷",
    accentHex: HEX.punchyPink,
    accentCss: COLOR.punchyPink,
  },
  {
    key: "SimonScene",
    name: "Simon",
    desc: "Mémorise la séquence colorée\net reproduis-la avec tes mains.",
    tag: "MÉMOIRE",
    icon: "🧠",
    accentHex: HEX.sunYellow,
    accentCss: COLOR.sunYellow,
  },
];
