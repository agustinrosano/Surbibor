export enum ProjectileType {
  ARROW = 'arrow',
  MAGIC = 'magic',
  BASIC = 'basic'
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  life: number;
  color: string;
  type: ProjectileType;
  onDeath?: (x: number, y: number) => void;
}

export class ProjectileSystem {
  public projectiles: Projectile[] = [];

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

  public draw(ctx: CanvasRenderingContext2D) {
    this.projectiles.forEach(p => {
      ctx.save();
      
      if (p.type === ProjectileType.ARROW) {
        // Draw -->
        const angle = Math.atan2(p.vy, p.vx);
        ctx.translate(p.x, p.y);
        ctx.rotate(angle);
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        // Shaft
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.lineTo(0, 0);
        ctx.stroke();
        // Head
        ctx.beginPath();
        ctx.moveTo(-5, -5);
        ctx.lineTo(5, 0);
        ctx.lineTo(-5, 5);
        ctx.stroke();
        
        // Glow
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#ffffff';
        
      } else if (p.type === ProjectileType.MAGIC) {
        // Draw glowing blue ball
        ctx.fillStyle = '#00e5ff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00e5ff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    });
  }

  public checkCollisions(enemies: any[], onHit: (enemy: any, p: Projectile) => void) {
    this.projectiles.forEach(p => {
      enemies.forEach(e => {
        const hitbox = e.hitbox || { x: e.x, y: e.y, width: e.width, height: e.height };
        
        const hitX = p.x > hitbox.x && p.x < hitbox.x + hitbox.width;
        const hitY = p.y > hitbox.y && p.y < hitbox.y + hitbox.height;

        if (hitX && hitY) {
          onHit(e, p);
          p.life = 0;
        }
      });
    });
  }
}
 export type { Projectile as IProjectile };
