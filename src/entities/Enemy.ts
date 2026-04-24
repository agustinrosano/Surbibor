import { Point, Rect } from '../engine/GameEngine';
import { AssetLoader } from '../engine/AssetLoader';

export interface EnemyType {
  id: string;
  maxHp: number;
  speed: number;
  scale: number;
  xp: number;
  spriteName: string;
  numFrames: number;
  frameSpeed: number;
}

export const ENEMY_TYPES: { [key: string]: EnemyType } = {
  runner: {
    id: 'runner',
    maxHp: 1,
    speed: 90, // Adjusted for dt
    scale: 1.6,
    xp: 1,
    spriteName: 'orc',
    numFrames: 29,
    frameSpeed: 15
  },
  skeleton: {
    id: 'skeleton',
    maxHp: 2,
    speed: 70,
    scale: 2,
    xp: 3,
    spriteName: 'skeleton',
    numFrames: 13,
    frameSpeed: 15
  }
};

export class Enemy implements Point {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public hp: number;
  public maxHp: number;
  public speed: number;
  public xpValue: number;
  
  private type: EnemyType;
  private currentFrame: number = 0;
  private frameCounter: number = 0;
  
  public burnRemaining: number = 0;
  public burnTick: number = 0;

  constructor(x: number, y: number, type: EnemyType) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.hp = type.maxHp;
    this.maxHp = type.maxHp;
    this.speed = type.speed;
    this.xpValue = type.xp;

    this.height = 48 * type.scale;
    this.width = 32 * type.scale;
  }

  public get hitbox(): Rect {
    const margin = this.width * 0.25;
    return {
      x: this.x + margin,
      y: this.y + margin,
      width: this.width - margin * 2,
      height: this.height - margin * 2
    };
  }

  public update(playerPos: Point, dt: number) {
    const dx = playerPos.x - this.x;
    const dy = playerPos.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }

    this.frameCounter++;
    if (this.frameCounter >= this.type.frameSpeed) {
      this.currentFrame = (this.currentFrame + 1) % this.type.numFrames;
      this.frameCounter = 0;
    }

    if (this.burnRemaining > 0) {
      this.burnRemaining -= dt;
      this.burnTick += dt;
      if (this.burnTick >= 0.6) {
        this.burnTick = 0;
        this.hp -= 1;
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D) {
    const sprite = AssetLoader.getImage(this.type.spriteName);
    const frameW = sprite.width / this.type.numFrames;
    const frameH = sprite.height;

    ctx.drawImage(
      sprite,
      this.currentFrame * frameW, 0,
      frameW, frameH,
      this.x, this.y,
      this.width, this.height
    );
  }
}
