import Phaser from "phaser";

const VIDEO_STYLE = [
  "position:fixed",
  "inset:0",
  "width:100vw",
  "height:100vh",
  "object-fit:cover",
  "transform:scaleX(-1)",
  "pointer-events:none",
  "z-index:0",
  "display:none",
].join(";");

/**
 * Affiche la webcam via l'élément <video> du DOM, placé derrière le canvas Phaser
 * (transparent) : le compositeur du navigateur fait le miroir et le cadrage cover,
 * sans drawImage ni upload de texture à chaque frame.
 */
export class WebcamLayer {
  private videoEl: HTMLVideoElement | null = null;

  constructor(private readonly scene: Phaser.Scene) {}

  setup(videoEl: HTMLVideoElement, opacity = 1): void {
    if (this.scene.sys.settings.status >= Phaser.Scenes.SHUTDOWN) return;
    this.videoEl = videoEl;
    videoEl.style.cssText = VIDEO_STYLE;
    videoEl.style.opacity = String(opacity);
    videoEl.style.display = "block";
    if (videoEl.parentElement !== document.body) document.body.prepend(videoEl);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.hide);
  }

  private readonly hide = (): void => {
    if (this.videoEl) this.videoEl.style.display = "none";
  };

  getLandmarkMapper(screenW: number, screenH: number): (lmX: number, lmY: number) => { x: number; y: number } {
    const vw = this.videoEl?.videoWidth ?? 0;
    const vh = this.videoEl?.videoHeight ?? 0;
    if (!vw || !vh) {
      return (lmX, lmY) => ({ x: (1 - lmX) * screenW, y: lmY * screenH });
    }
    const scale = Math.max(screenW / vw, screenH / vh);
    const srcW = screenW / scale;
    const srcH = screenH / scale;
    const offsetX = (vw - srcW) / 2;
    const offsetY = (vh - srcH) / 2;
    return (lmX, lmY) => ({
      x: (1 - (lmX * vw - offsetX) / srcW) * screenW,
      y: ((lmY * vh - offsetY) / srcH) * screenH,
    });
  }
}
