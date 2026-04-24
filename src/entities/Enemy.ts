import { Player } from './Player';
import { AssetLoader } from '../engine/AssetLoader';

export enum EnemyType {
  RUNNER = 'runner',
  SKELETON = 'skeleton',
  BAT = 'bat',
  ZOMBIE = 'zombie'
}

export interface EnemyConfig {
  type: EnemyType;
  hp: number;
  speed: number;
  xpValue: number;
  asset: string;
  width: number;
  height: number;
  frames: number;
  isSheet: boolean;
}

export const ENEMY_TYPES: Record<EnemyType, EnemyConfig> = {
  [EnemyType.RUNNER]: {
    type: EnemyType.RUNNER,
    hp: 3,
    speed: 1.2,
    xpValue: 1, // Reduced XP
    asset: 'orc',
    width: 32,
    height: 32,
    frames: 24,
    isSheet: true
  },
  [EnemyType.SKELETON]: {
    type: EnemyType.SKELETON,
    hp: 8,
    speed: 0.7,
    xpValue: 2, // Reduced XP
    asset: 'skeleton',
    width: 40,
    height: 48,
    frames: 14,
    isSheet: true
  },
  [EnemyType.BAT]: {
    type: EnemyType.BAT,
    hp: 2,
    speed: 2.2,
    xpValue: 1,
    asset: 'bat',
    width: 32,
    height: 32,
    frames: 1,
    isSheet: false
  },
  [EnemyType.ZOMBIE]: {
    type: EnemyType.ZOMBIE,
    hp: 15,
    speed: 0.5,
    xpValue: 4, // Reduced XP
    asset: 'zombie',
    width: 32,
    height: 40,
    frames: 1,
    isSheet: false
  }
};

export class Enemy {
  public x: number;
  public y: number;
  public hp: number;
  public maxHp: number;
  public config: EnemyConfig;
  public width: number;
  public height: number;
  public xpValue: number;
  
  private currentFrame: number = 0;
  private frameTimer: number = 0;
  private frameSpeed: number = 0.1;

  constructor(x: number, y: number, type: EnemyType = EnemyType.RUNNER, difficultyMultiplier: number = 1.0) {
    this.config = ENEMY_TYPES[type];
    this.x = x;
    this.y = y;
    
    // Scaling HP based on difficulty (time passed)
    const scaledHp = Math.floor(this.config.hp * difficultyMultiplier);
    this.hp = scaledHp;
    this.maxHp = scaledHp;
    
    this.width = this.config.width;
    this.height = this.config.height;
    this.xpValue = this.config.xpValue;
    this.currentFrame = Math.floor(Math.random() * this.config.frames);
  }

  public update(player: Player, dt: number) {
    const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
    const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      this.x += (dx / dist) * this.config.speed * dt * 100;
      this.y += (dy / dist) * this.config.speed * dt * 100;
    }

    this.frameTimer += dt;
    if (this.frameTimer >= this.frameSpeed) {
      this.currentFrame = (this.currentFrame + 1) % this.config.frames;
      this.frameTimer = 0;
    }
  }

  public draw(ctx: CanvasRenderingContext2D) {
    const img = AssetLoader.getImage(this.config.asset);
    if (!img) return;

    ctx.save();
    
    if (this.config.type === EnemyType.BAT || this.config.type === EnemyType.ZOMBIE) {
        const bob = Math.sin(Date.now() / 200) * 5;
        ctx.translate(0, bob);
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(img, this.x, this.y, this.width, this.height);
        ctx.globalCompositeOperation = 'source-over';
    } else if (this.config.isSheet) {
      const frameW = img.width / this.config.frames;
      const frameH = img.height;
      ctx.drawImage(
        img,
        this.currentFrame * frameW, 0,
        frameW, frameH,
        this.x, this.y,
        this.width, this.height
      );
    } else {
      ctx.drawImage(img, this.x, this.y, this.width, this.height);
    }

    ctx.restore();

    if (this.hp < this.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(this.x, this.y - 8, this.width, 4);
      ctx.fillStyle = '#f00';
      ctx.fillRect(this.x, this.y - 8, (this.hp / this.maxHp) * this.width, 4);
    }
  }

  public get hitbox() {
    const padding = this.config.type === EnemyType.BAT ? -10 : 5;
    return {
      x: this.x + padding,
      y: this.y + padding,
      width: this.width - padding * 2,
      height: this.height - padding * 2
    };
  }
}
