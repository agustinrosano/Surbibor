import { AssetLoader } from '../engine/AssetLoader';

export enum ItemType {
  FOOD = 'food',
  XP = 'xp' // Maybe we can use physical XP drops too later
}

export class Item {
  public x: number;
  public y: number;
  public type: ItemType;
  public width: number = 24;
  public height: number = 24;
  public alive: boolean = true;

  constructor(x: number, y: number, type: ItemType) {
    this.x = x;
    this.y = y;
    this.type = type;
  }

  public draw(ctx: CanvasRenderingContext2D, now: number) {
    const img = AssetLoader.getImage('food');
    if (img) {
      // Gentle bobbing animation
      const bob = Math.sin(now / 200) * 5;
      ctx.drawImage(img, this.x, this.y + bob, this.width, this.height);
    } else {
      ctx.fillStyle = 'green';
      ctx.beginPath();
      ctx.arc(this.x + this.width/2, this.y + this.height/2, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  public checkCollision(playerX: number, playerY: number, playerW: number, playerH: number): boolean {
    const dx = (this.x + this.width/2) - (playerX + playerW/2);
    const dy = (this.y + this.height/2) - (playerY + playerH/2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < 30;
  }
}
