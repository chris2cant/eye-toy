export const COLOR = {
  bgCanvas: "#05070D",
  bgSurface: "#0B111A",
  bgElevated: "#101824",
  textPrimary: "#F4F7FB",
  textSecondary: "#A9B7C6",
  textMuted: "#607080",
  brandPrimary: "#25F4E1",
  brandPrimaryMuted: "#0E6F6B",
  success: "#2FFFAA",
  warning: "#FFD166",
  danger: "#FF5C7A",
  info: "#5AB8FF",
} as const;

export const HEX = {
  bgCanvas: 0x05070d,
  bgSurface: 0x0b111a,
  bgElevated: 0x101824,
  textPrimary: 0xf4f7fb,
  textSecondary: 0xa9b7c6,
  textMuted: 0x607080,
  brandPrimary: 0x25f4e1,
  brandPrimaryMuted: 0x0e6f6b,
  success: 0x2fffaa,
  warning: 0xffd166,
  danger: 0xff5c7a,
  info: 0x5ab8ff,
} as const;

export const FONT = {
  identity: '"Orbitron", monospace',
  ui: '"IBM Plex Sans", sans-serif',
} as const;

export const DEPTH = {
  webcam: -10,
  overlay: 0,
  bg: 1,
  game: 5,
  hud: 10,
  topUi: 20,
  cursor: 30,
} as const;

export const GAME_CIRCLE_PALETTE = [
  0xff5c7a, // danger
  0x5ab8ff, // info
  0x2fffaa, // success
  0xffd166, // warning
  0xff8c42, // orange
  0xa78bfa, // violet
] as const;
