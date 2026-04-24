import { AssetLoader } from '../engine/AssetLoader';

export enum ItemType {
  FOOD = 'food',
  XP = 'xp'
}

export class Item {
  public x: number;
  public y: number;
  public width: number = 24;
  public height: number = 24;
  public type: ItemType;
  public life: number = 10; // Items disappear after 10 seconds

  constructor(x: number, y: number, type: ItemType = ItemType.FOOD) {
    this.x = x;
    this.y = y;
    this.type = type;
  }

  public update(dt: number): boolean {
    this.life -= dt;
    return this.life <= 0; // Returns true if it should be removed
  }

  public draw(ctx: CanvasRenderingContext2D, now: number) {
    const img = AssetLoader.getImage(this.type === ItemType.FOOD ? 'food' : 'xp');
    if (!img) return;

    ctx.save();
    // Bobbing animation
    const bob = Math.sin(now / 300) * 5;
    
    // Fading effect when near expiration
    if (this.life < 3) {
      ctx.globalAlpha = 0.3 + Math.sin(now / 100) * 0.7;
    }

    ctx.drawImage(img, this.x, this.y + bob, this.width, this.height);
    ctx.restore();
  }

  public checkCollision(px: number, py: number, pw: number, ph: number): boolean {
    return (
      this.x < px + pw &&
      this.x + this.width > px &&
      this.y < py + ph &&
      this.y + this.height > py
    );
  }
}
