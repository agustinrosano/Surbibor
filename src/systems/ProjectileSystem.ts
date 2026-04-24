import { Point, Rect } from '../engine/GameEngine';

export interface Projectile extends Point {
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  life: number;
  color: string;
  onDeath?: (x: number, y: number) => void;
}

export class ProjectileSystem {
  private projectiles: Projectile[] = [];

  public spawn(p: Projectile) {
    this.projectiles.push(p);
  }

  public update(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      if (p.life <= 0) {
        if (p.onDeath) p.onDeath(p.x, p.y);
        this.projectiles.splice(i, 1);
      }
    }
  }

  public checkCollisions(targets: { hitbox: Rect, hp: number }[], onHit: (target: any, p: Projectile) => void) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      for (const target of targets) {
        const dx = p.x - (target.hitbox.x + target.hitbox.width / 2);
        const dy = p.y - (target.hitbox.y + target.hitbox.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < p.radius + Math.max(target.hitbox.width, target.hitbox.height) / 2) {
          onHit(target, p);
          if (p.onDeath) p.onDeath(p.x, p.y);
          this.projectiles.splice(i, 1);
          break;
        }
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D) {
    ctx.shadowBlur = 10;
    this.projectiles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }
}
