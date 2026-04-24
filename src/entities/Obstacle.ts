import { AssetLoader } from '../engine/AssetLoader';

export enum ObstacleType {
  ROCK = 'rock',
  STUMP = 'stump'
}

export class Obstacle {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public type: ObstacleType;
  public radius: number;

  constructor(x: number, y: number, type: ObstacleType) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.width = type === ObstacleType.ROCK ? 64 : 48;
    this.height = type === ObstacleType.ROCK ? 48 : 32;
    // For collision detection, we'll use a radius from the center
    this.radius = Math.max(this.width, this.height) / 2 - 5;
  }

  public draw(ctx: CanvasRenderingContext2D) {
    const img = AssetLoader.getImage(this.type === ObstacleType.ROCK ? 'rock' : 'stump');
    if (img) {
      ctx.drawImage(img, this.x, this.y, this.width, this.height);
    } else {
      // Fallback
      ctx.fillStyle = '#444';
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
  }

  public get centerX() { return this.x + this.width / 2; }
  public get centerY() { return this.y + this.height / 2; }
}
