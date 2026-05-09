/** All configurable constants for the Sable Magique mini-game. */

export const PARTICLES = {
  /** Minimum particle lifespan in milliseconds. */
  LIFESPAN_MIN: 1300,
  /** Maximum particle lifespan in milliseconds. */
  LIFESPAN_MAX: 2200,
  /** Downward gravity in px/s². */
  GRAVITY_Y: 620,
  /** Minimum initial speed in px/s. */
  SPEED_MIN: 55,
  /** Maximum initial speed in px/s. */
  SPEED_MAX: 135,
  /** Emission angle range (degrees) — 90 = straight down. */
  ANGLE_MIN: 84,
  ANGLE_MAX: 96,
  /** Hard cap on particles per single hand burst. */
  BURST_MAX: 28,
  /** Hand velocity (px between landmark frames) above which sand spawns. */
  MOTION_THRESHOLD: 10,
  /** particles = velocity * VELOCITY_SCALE, capped at BURST_MAX. */
  VELOCITY_SCALE: 0.28,
  /** Hue rotation speed in degrees per second. */
  HUE_SPEED: 25,
} as const;
