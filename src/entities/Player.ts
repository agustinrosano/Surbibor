import { Point, Rect } from '../engine/GameEngine';
import { AssetLoader } from '../engine/AssetLoader';

export interface PlayerStats {
  speed: number;
  maxHp: number;
  armor: number;
}

export class Player implements Point {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public hp: number;
  public maxHp: number;
  public speed: number;
  public armor: number;
  
  public lastDirection: Point = { x: 1, y: 0 }; // Default to right
  private invulnerableUntil: number = 0;
  private currentFrame: number = 0;
  private frameCounter: number = 0;
  private frameSpeed: number = 6;
  private numFrames: number = 43;

  constructor(x: number, y: number, stats: PlayerStats) {
    this.x = x;
    this.y = y;
    this.speed = stats.speed;
    this.maxHp = stats.maxHp;
    this.hp = this.maxHp;
    this.armor = stats.armor;
    
    // Base height, width will be calculated in draw once sprite is ready
    this.height = 64; 
    this.width = 32;
  }

  /**
   * Returns the actual collision box (hitbox), which is smaller than the sprite.
   * This provides a "tighter" feel for collisions.
   */
  public get hitbox(): Rect {
    const marginW = this.width * 0.4;
    const marginH = this.height * 0.2;
    return {
      x: this.x + marginW / 2,
      y: this.y + marginH * 0.6, // Offset towards feet
      width: this.width - marginW,
      height: this.height - marginH
    };
  }

  public update(keys: { [key: string]: boolean }, dt: number) {
    let dx = 0;
    let dy = 0;

    if (keys['ArrowUp'] || keys['w']) dy -= 1;
    if (keys['ArrowDown'] || keys['s']) dy += 1;
    if (keys['ArrowLeft'] || keys['a']) dx -= 1;
    if (keys['ArrowRight'] || keys['d']) dx += 1;

    if (dx !== 0 || dy !== 0) {
      // Normalize movement
      const mag = Math.sqrt(dx * dx + dy * dy);
      dx /= mag;
      dy /= mag;

      this.lastDirection = { x: dx, y: dy };

      this.x += dx * this.speed * dt * 100;
      this.y += dy * this.speed * dt * 100;

      this.frameCounter++;
      if (this.frameCounter >= this.frameSpeed) {
        this.currentFrame = (this.currentFrame + 1) % this.numFrames;
        this.frameCounter = 0;
      }
    } else {
      this.currentFrame = 1; // Idle frame
    }
  }

  public takeDamage(amount: number, now: number) {
    if (now < this.invulnerableUntil) return;
    
    const actualDamage = Math.max(1, amount - this.armor);
    this.hp = Math.max(0, this.hp - actualDamage);
    this.invulnerableUntil = now + 650;
    
    // Trigger screen shake or other feedback here
  }

  public draw(ctx: CanvasRenderingContext2D, now: number) {
    const sprite = AssetLoader.getImage('soldier');
    const frameW = sprite.width / this.numFrames;
    const frameH = sprite.height;

    const isInvulnerable = now < this.invulnerableUntil;
    if (isInvulnerable) {
      ctx.globalAlpha = 0.5 + Math.sin(now * 0.02) * 0.3; // Flash effect
    }

    ctx.drawImage(
      sprite,
      this.currentFrame * frameW, 0,
      frameW, frameH,
      this.x, this.y,
      this.width, this.height
    );

    ctx.globalAlpha = 1;
    
    // Debug: Draw Hitbox
    // ctx.strokeStyle = 'red';
    // ctx.strokeRect(this.hitbox.x, this.hitbox.y, this.hitbox.width, this.hitbox.height);
  }
}
