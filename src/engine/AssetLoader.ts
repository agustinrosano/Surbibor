export class AssetLoader {
  private static images: Map<string, HTMLImageElement> = new Map();
  private static totalToLoad: number = 0;
  private static loadedCount: number = 0;

  public static async loadImages(paths: { [key: string]: string }): Promise<void> {
    const entries = Object.entries(paths);
    this.totalToLoad = entries.length;
    this.loadedCount = 0;

    const promises = entries.map(([name, path]) => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.src = path;
        img.onload = () => {
          this.images.set(name, img);
          this.loadedCount++;
          resolve();
        };
        img.onerror = () => reject(`Failed to load image: ${path}`);
      });
    });

    await Promise.all(promises);
  }

  public static getImage(name: string): HTMLImageElement {
    const img = this.images.get(name);
    if (!img) throw new Error(`Image not found: ${name}`);
    return img;
  }

  public static get progress(): number {
    return this.totalToLoad === 0 ? 1 : this.loadedCount / this.totalToLoad;
  }
}
