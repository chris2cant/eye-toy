import { COLOR, HEX } from "../design-system/tokens";

export const PALETTE_ENTRIES = [
  { hex: HEX.nightBlue,  css: COLOR.nightBlue,  label: "Night Blue"  },
  { hex: HEX.punchyPink, css: COLOR.punchyPink,  label: "Punchy Pink" },
  { hex: HEX.sunYellow,  css: COLOR.sunYellow,   label: "Sun Yellow"  },
  { hex: HEX.turquoise,  css: COLOR.turquoise,   label: "Turquoise"   },
  { hex: HEX.popPurple,  css: COLOR.popPurple,   label: "Pop Purple"  },
  { hex: HEX.bgElevated, css: COLOR.bgElevated,  label: "Cream"       },
  { hex: HEX.white,      css: COLOR.white,        label: "White"       },
];

export const DEMO_CARDS = [
  {
    name: "Attrape les tous",
    desc: "Attrape les ronds avec tes mains\navant qu'ils disparaissent !",
    tag: "ACTION", icon: "✋", accentHex: HEX.turquoise, accentCss: COLOR.turquoise,
  },
  {
    name: "Kung Foo",
    desc: "Des ninjas débarquent !\nFrappe-les avec tes mains.",
    tag: "ACTION", icon: "🥷", accentHex: HEX.punchyPink, accentCss: COLOR.punchyPink,
  },
  {
    name: "Simon",
    desc: "Mémorise la séquence colorée\net reproduis-la avec tes mains.",
    tag: "MÉMO", icon: "🧠", accentHex: HEX.sunYellow, accentCss: COLOR.sunYellow,
  },
];
