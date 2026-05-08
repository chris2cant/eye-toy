// Joy Motion TV — Design System Tokens

export const COLOR = {
  // Palette Joy Motion TV
  nightBlue:   '#1D2340',
  punchyPink:  '#FF4F93',
  sunYellow:   '#FFC93C',
  turquoise:   '#20CFC9',
  popPurple:   '#7B61FF',
  cream:       '#FFF8F2',
  white:       '#FFFFFF',

  // Aliases sémantiques (backward compat avec les scènes de jeu)
  textPrimary:       '#1D2340',
  textSecondary:     '#4A5068',
  textMuted:         '#8B93B0',
  bgCanvas:          '#FFF8F2',
  bgSurface:         '#FFFFFF',
  bgElevated:        '#F0EBE3',
  brandPrimary:      '#20CFC9',
  brandPrimaryMuted: '#0E8F8A',
  success:           '#2FFFAA',
  warning:           '#FFC93C',
  danger:            '#FF4F93',
  info:              '#7B61FF',
} as const;

export const HEX = {
  nightBlue:   0x1d2340,
  punchyPink:  0xff4f93,
  sunYellow:   0xffc93c,
  turquoise:   0x20cfc9,
  popPurple:   0x7b61ff,
  cream:       0xfff8f2,
  white:       0xffffff,

  textPrimary:       0x1d2340,
  textSecondary:     0x4a5068,
  textMuted:         0x8b93b0,
  bgCanvas:          0xfff8f2,
  bgSurface:         0xffffff,
  bgElevated:        0xf0ebe3,
  brandPrimary:      0x20cfc9,
  brandPrimaryMuted: 0x0e8f8a,
  success:           0x2fffaa,
  warning:           0xffc93c,
  danger:            0xff4f93,
  info:              0x7b61ff,
} as const;

export const FONT = {
  display:  '"Fredoka", sans-serif',
  ui:       '"Nunito Sans", sans-serif',
  identity: '"Fredoka", sans-serif',  // backward compat
} as const;

export const TOKENS = {
  radius:  { sm: 12, md: 20, lg: 28, pill: 999 },
  spacing: { xs: 8, sm: 16, md: 24, lg: 32 },
  border:  { thin: 1, medium: 2, thick: 4 },
} as const;

export const DEPTH = {
  webcam:  -10,
  overlay: 0,
  bg:      1,
  game:    5,
  hud:     10,
  topUi:   20,
  cursor:  30,
} as const;

export const GAME_CIRCLE_PALETTE = [
  0xff4f93, // punchyPink
  0xffc93c, // sunYellow
  0x20cfc9, // turquoise
  0x7b61ff, // popPurple
  0xff8c42, // orange
  0x2fffaa, // vert menthe
] as const;
