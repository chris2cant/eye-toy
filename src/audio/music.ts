import Phaser from "phaser";

export const MUSIC_TRACKS = {
  funnyCartoon: "music-background-funny-cartoon",
  ninjaFight: "music-background-ninja-fight",
  runner: "music-background-runner",
} as const;

export type MusicHandle = { stop: () => void };

const readyEvent = (key: string): string => `music-ready:${key}`;

async function loadTrack(game: Phaser.Game, key: string): Promise<void> {
  const response = await fetch(`/assets/audio/${key}.mp3`);
  const data = await response.arrayBuffer();
  const manager = game.sound as Phaser.Sound.WebAudioSoundManager;
  const onDecoded = (decodedKey: string): void => {
    if (decodedKey !== key) return;
    manager.off(Phaser.Sound.Events.DECODED, onDecoded);
    game.events.emit(readyEvent(key));
  };
  manager.on(Phaser.Sound.Events.DECODED, onDecoded);
  manager.decodeAudio(key, data);
}

/** Charge et décode les musiques en arrière-plan, sans bloquer l'affichage du menu. */
export function preloadMusic(game: Phaser.Game): void {
  for (const key of Object.values(MUSIC_TRACKS)) {
    loadTrack(game, key).catch((err: unknown) => console.warn(`[music] ${key} indisponible:`, err));
  }
}

/** Lance la musique dès qu'elle est décodée ; `stop()` annule aussi un démarrage différé. */
export function startMusic(
  scene: Phaser.Scene,
  key: string,
  config: Phaser.Types.Sound.SoundConfig,
): MusicHandle {
  let sound: Phaser.Sound.BaseSound | null = null;
  let cancelled = false;
  const begin = (): void => {
    if (cancelled) return;
    sound = scene.sound.add(key, config);
    sound.play();
  };
  if (scene.cache.audio.exists(key)) begin();
  else scene.game.events.once(readyEvent(key), begin);
  return {
    stop: () => {
      cancelled = true;
      scene.game.events.off(readyEvent(key), begin);
      sound?.stop();
      sound?.destroy();
      sound = null;
    },
  };
}
