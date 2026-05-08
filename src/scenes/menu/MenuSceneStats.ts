import Phaser from "phaser";
import { HEX, COLOR, FONT, DEPTH } from "../../design-system/tokens";

export interface CameraStatusWidget {
  dot: Phaser.GameObjects.Arc;
  text: Phaser.GameObjects.Text;
}

export interface StatPillOptions {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  accentHex: number;
  featured?: boolean;
}

export function createCameraStatus(scene: Phaser.Scene, width: number, height: number): CameraStatusWidget {
  const badgeX = Math.min(180, width * 0.14);
  const badgeY = height * 0.068;
  const BADGE_W = 218;
  const BADGE_H = 40;
  const halfW = BADGE_W / 2;
  const halfH = BADGE_H / 2;
  const gfx = scene.add.graphics().setDepth(DEPTH.hud);

  gfx.fillStyle(0x000000, 0.07);
  gfx.fillRoundedRect(badgeX - halfW + 2, badgeY - halfH + 3, BADGE_W, BADGE_H, halfH);
  gfx.fillStyle(HEX.white, 0.92);
  gfx.fillRoundedRect(badgeX - halfW, badgeY - halfH, BADGE_W, BADGE_H, halfH);

  scene.add.text(badgeX - halfW + 22, badgeY, "🎥", { fontSize: "15px" }).setOrigin(0.5).setDepth(DEPTH.hud);
  scene.add.text(badgeX - halfW + 38, badgeY, "Caméra", { fontSize: "14px", fontFamily: FONT.display, color: COLOR.nightBlue }).setOrigin(0, 0.5).setDepth(DEPTH.hud);

  const dot = scene.add.circle(badgeX + 16, badgeY, 5, 0x9ca3af, 0.8).setDepth(DEPTH.hud);
  const text = scene.add.text(badgeX + 27, badgeY, "...", { fontSize: "12px", fontFamily: FONT.ui, color: COLOR.textMuted }).setOrigin(0, 0.5).setDepth(DEPTH.hud);

  return { dot, text };
}

interface PillDims { pillW: number; pillH: number; }

export function createStatsBar(scene: Phaser.Scene, width: number, height: number, cx: number): void {
  const pillY = height * 0.895;
  const best   = parseInt(localStorage.getItem("eyetoy_best")   ?? "0", 10);
  const streak = parseInt(localStorage.getItem("eyetoy_streak") ?? "0", 10);
  const sideW   = Math.min(210, Math.max(160, width * 0.165));
  const centerW = Math.min(250, Math.max(190, width * 0.195));
  const gap     = width * 0.26;

  createStatPill(scene, { x: cx - gap, y: pillY }, { pillW: sideW, pillH: 62 }, {
    icon: "🔥", label: "Série actuelle", value: String(streak),
    sub: streak > 0 ? "Bravo ! 🔥" : "Lance-toi !", accentHex: HEX.punchyPink,
  });
  createStatPill(scene, { x: cx, y: pillY }, { pillW: centerW, pillH: 62 }, {
    icon: "🏆", label: "Meilleur",
    value: best > 0 ? `${best.toLocaleString()} pts` : "— pts",
    accentHex: HEX.sunYellow, featured: true,
  });
  createStatPill(scene, { x: cx + gap, y: pillY }, { pillW: sideW, pillH: 62 }, {
    icon: "👨‍👩‍👧", label: "Mode", value: "Famille", sub: "Jusqu'à 4 joueurs", accentHex: HEX.popPurple,
  });
}

function createStatPill(
  scene: Phaser.Scene,
  pos: { x: number; y: number },
  dims: PillDims,
  opts: StatPillOptions,
): void {
  const { x: pillCx, y: pillCy } = pos;
  const { pillW, pillH } = dims;
  const halfW = pillW / 2;
  const halfH = pillH / 2;
  const pillRadius = 16;
  const gfx = scene.add.graphics().setDepth(DEPTH.hud);

  gfx.fillStyle(0x000000, 0.07);
  gfx.fillRoundedRect(pillCx - halfW + 2, pillCy - halfH + 3, pillW, pillH, pillRadius);
  gfx.fillStyle(HEX.white, 0.95);
  gfx.fillRoundedRect(pillCx - halfW, pillCy - halfH, pillW, pillH, pillRadius);

  if (opts.featured) {
    gfx.lineStyle(2, opts.accentHex, 0.65);
    gfx.strokeRoundedRect(pillCx - halfW, pillCy - halfH, pillW, pillH, pillRadius);
  }

  const iconCx = pillCx - halfW + 32;
  gfx.fillStyle(opts.accentHex, 0.14);
  gfx.fillCircle(iconCx, pillCy, 22);
  scene.add.text(iconCx, pillCy, opts.icon, { fontSize: "18px" }).setOrigin(0.5).setDepth(DEPTH.hud);

  drawStatPillText(scene, pillCx - halfW + 60, pillCy, opts);
}

function drawStatPillText(scene: Phaser.Scene, textX: number, pillCy: number, opts: StatPillOptions): void {
  const hasSub = Boolean(opts.sub);
  const labelY = hasSub ? pillCy - 14 : pillCy - 9;
  const valueY = hasSub ? pillCy + 4  : pillCy + 9;

  scene.add.text(textX, labelY, opts.label, { fontSize: "11px", fontFamily: FONT.ui, color: COLOR.textMuted }).setOrigin(0, 0.5).setDepth(DEPTH.hud);
  scene.add.text(textX, valueY, opts.value, { fontSize: opts.featured ? "19px" : "16px", fontFamily: FONT.display, color: opts.featured ? COLOR.sunYellow : COLOR.nightBlue }).setOrigin(0, 0.5).setDepth(DEPTH.hud);

  if (opts.sub) {
    scene.add.text(textX, pillCy + 20, opts.sub, { fontSize: "10px", fontFamily: FONT.ui, color: COLOR.textMuted }).setOrigin(0, 0.5).setDepth(DEPTH.hud);
  }
}
