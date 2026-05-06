import Phaser from "phaser";

export class WebcamLayer {
  private videoEl: HTMLVideoElement | null = null;
  private tex: Phaser.Textures.CanvasTexture | null = null;
  private bg: Phaser.GameObjects.Image | null = null;

  constructor(private readonly scene: Phaser.Scene) {}

  setup(videoEl: HTMLVideoElement, width: number, height: number): void {
    this.videoEl = videoEl;
    if (this.scene.textures.exists("webcam")) this.scene.textures.remove("webcam");
    const tex = this.scene.textures.createCanvas("webcam", width, height);
    if (!tex) throw new Error("createCanvas returned null");
    this.tex = tex;
    this.bg = this.scene.add.image(width / 2, height / 2, "webcam").setDepth(-10);
    this.scene.scale.on("resize", this.onResize, this);
  }

  render(): void {
    if (!this.tex || !this.videoEl || this.videoEl.readyState < 2) return;
    const ctx = this.tex.getContext();
    if (!ctx) return;
    const { width, height } = this.scene.scale;
    const vw = this.videoEl.videoWidth;
    const vh = this.videoEl.videoHeight;
    if (!vw || !vh) return;
    const scale = Math.max(width / vw, height / vh);
    const srcW = width / scale;
    const srcH = height / scale;
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(this.videoEl, (vw - srcW) / 2, (vh - srcH) / 2, srcW, srcH, 0, 0, width, height);
    ctx.restore();
    this.tex.refresh();
  }

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

  private onResize = (gameSize: Phaser.Structs.Size): void => {
    if (!this.tex || !this.bg) return;
    this.tex.setSize(gameSize.width, gameSize.height);
    this.bg.setPosition(gameSize.width / 2, gameSize.height / 2);
  };
}
