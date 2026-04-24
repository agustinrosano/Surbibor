import { Point } from '../engine/GameEngine';

export interface Particle extends Point {
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  glow: boolean;
}

export class ParticleSystem {
  private particles: Particle[] = [];

  public emit(x: number, y: number, color: string, count: number = 10, glow: boolean = true) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 150 + 50;
      const life = Math.random() * 0.5 + 0.2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        color,
        size: Math.random() * 3 + 1,
        glow
      });
    }
  }

  public update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.size *= 0.95; // Shrink over time

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D) {
    this.particles.forEach(p => {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      
      if (p.glow) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
      }
      
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      
      if (p.glow) {
        ctx.shadowBlur = 0;
      }
    });
    ctx.globalAlpha = 1;
  }
}
