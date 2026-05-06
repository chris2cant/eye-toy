/** All configurable constants for the Sable Magique mini-game. */

export const MOTION = {
  /** Detection canvas size relative to screen (0.25 = quarter resolution). */
  CANVAS_SCALE: 0.25,
  /** Sample every Nth pixel in the detection canvas (reduces CPU load). */
  SAMPLE_STEP: 2,
  /** Average RGB delta threshold below which a pixel is considered still. */
  THRESHOLD: 18,
  /** Max distance in detection-canvas pixels to merge two active samples into one cluster. */
  CLUSTER_RADIUS: 28,
} as const;

export const PARTICLES = {
  /** Maximum alive particles at once. */
  MAX: 300,
  /** Minimum particle lifespan in milliseconds. */
  LIFESPAN_MIN: 800,
  /** Maximum particle lifespan in milliseconds. */
  LIFESPAN_MAX: 2000,
  /** Downward gravity in px/s². */
  GRAVITY_Y: 260,
  /** Minimum initial speed in px/s. */
  SPEED_MIN: 40,
  /** Maximum initial speed in px/s. */
  SPEED_MAX: 200,
  /** Particles = floor(intensity * PER_INTENSITY_SCALE), capped at BURST_MAX. */
  PER_INTENSITY_SCALE: 35,
  /** Hard cap on particles per single cluster burst. */
  BURST_MAX: 28,
  /** Sand colour palette — warm gold tones, white tint channel. */
  TINT: [0xf4c542, 0xf5d060, 0xe8b430, 0xfad050, 0xd4a820] as number[],
} as const;
