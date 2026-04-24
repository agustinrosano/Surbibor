import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { ProjectileSystem } from './ProjectileSystem';
import { ParticleSystem } from './ParticleSystem';

export interface AbilityContext {
  player: Player;
  enemies: Enemy[];
  projectiles: ProjectileSystem;
  particles: ParticleSystem;
  dt: number;
  now: number;
}

export abstract class Ability {
  public abstract id: string;
  public abstract name: string;
  public abstract description: string;
  public level: number = 1;
  public maxLevel: number = 5;
  protected cooldownTimer: number = 0;

  public abstract update(ctx: AbilityContext): void;
  public abstract draw(ctx: CanvasRenderingContext2D, ctxGame: AbilityContext): void;
  
  public upgrade() {
    if (this.level < this.maxLevel) {
      this.level++;
    }
  }
}

export class BasicShot extends Ability {
  public id = 'basic_shot';
  public name = 'Disparo';
  public description = 'Dispara proyectiles rápidos al enemigo más cercano.';

  public update(ctx: AbilityContext) {
    this.cooldownTimer -= ctx.dt;
    if (this.cooldownTimer > 0) return;

    const nearest = this.findNearestEnemy(ctx.player, ctx.enemies);
    if (!nearest) return;

    const dx = nearest.x + nearest.width/2 - (ctx.player.x + ctx.player.width/2);
    const dy = nearest.y + nearest.height/2 - (ctx.player.y + ctx.player.height/2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    ctx.projectiles.spawn({
      x: ctx.player.x + ctx.player.width / 2,
      y: ctx.player.y + ctx.player.height / 2,
      vx: (dx / dist) * 450,
      vy: (dy / dist) * 450,
      radius: 4,
      damage: 1 + Math.floor(this.level / 2),
      life: 2,
      color: '#00e5ff'
    });

    this.cooldownTimer = Math.max(0.1, 0.6 - this.level * 0.08);
  }

  private findNearestEnemy(player: Player, enemies: Enemy[]): Enemy | null {
    let nearest: Enemy | null = null;
    let minDist = Infinity;
    for (const e of enemies) {
      const dx = (e.x + e.width/2) - (player.x + player.width/2);
      const dy = (e.y + e.height/2) - (player.y + player.height/2);
      const d = dx * dx + dy * dy;
      if (d < minDist) {
        minDist = d;
        nearest = e;
      }
    }
    return nearest;
  }

  public draw() {}
}

export class WhipAbility extends Ability {
  public id = 'whip';
  public name = 'Latigazo';
  public description = 'Un golpe rápido en área. Nivel 3+ ataca en ambas direcciones.';

  public update(ctx: AbilityContext) {
    this.cooldownTimer -= ctx.dt;
    if (this.cooldownTimer > 0) return;

    const range = 100 + this.level * 15;
    const damage = 3 + this.level * 2;
    
    // Attack in player's last direction
    this.performAttack(ctx, ctx.player.lastDirection, range, damage);

    // Level 3+ attack in reverse direction too
    if (this.level >= 3) {
      this.performAttack(ctx, { x: -ctx.player.lastDirection.x, y: -ctx.player.lastDirection.y }, range, damage);
    }

    this.cooldownTimer = Math.max(0.4, 1.2 - this.level * 0.15);
  }

  private performAttack(ctx: AbilityContext, dir: {x: number, y: number}, range: number, damage: number) {
    const originX = ctx.player.x + ctx.player.width / 2;
    const originY = ctx.player.y + ctx.player.height / 2;
    const attackX = originX + dir.x * 60;
    const attackY = originY + dir.y * 60;

    ctx.enemies.forEach(e => {
      const dx = (e.x + e.width/2) - attackX;
      const dy = (e.y + e.height/2) - attackY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < range) {
        e.hp -= damage;
        ctx.particles.emit(e.x + e.width/2, e.y + e.height/2, '#ffffff', 5, false);
      }
    });

    // Visual effect: Slash
    ctx.particles.emit(attackX, attackY, '#ffffff', 15, true);
  }

  public draw() {}
}

export class GrenadeAbility extends Ability {
  public id = 'grenade';
  public name = 'Granada';
  public description = 'Lanza una bomba que explota al contacto dañando a todos cerca.';

  public update(ctx: AbilityContext) {
    this.cooldownTimer -= ctx.dt;
    if (this.cooldownTimer > 0) return;

    const target = ctx.player.x + (Math.random() - 0.5) * 500;
    const targetY = ctx.player.y + (Math.random() - 0.5) * 500;

    ctx.projectiles.spawn({
      x: ctx.player.x + ctx.player.width / 2,
      y: ctx.player.y + ctx.player.height / 2,
      vx: (target - ctx.player.x) * 1.2,
      vy: (targetY - ctx.player.y) * 1.2,
      radius: 8,
      damage: 0,
      life: 1.2,
      color: '#ff9100',
      onDeath: (x, y) => {
        const explosionRadius = 120 + this.level * 20;
        const explosionDamage = 10 + this.level * 5;
        ctx.enemies.forEach(e => {
          const dx = (e.x + e.width/2) - x;
          const dy = (e.y + e.height/2) - y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < explosionRadius) {
            e.hp -= explosionDamage;
            ctx.particles.emit(e.x + e.width/2, e.y + e.height/2, '#ff4b2b', 5);
          }
        });
        ctx.particles.emit(x, y, '#ff4b2b', 30, true);
      }
    });

    this.cooldownTimer = Math.max(0.8, 2.5 - this.level * 0.3);
  }

  // Override to handle area damage on projectile death or collision
  // For now, let's simplify and make the projectile system call this or just do area damage here if we could.
  // Actually, let's keep it simple: the projectile will explode on death.
  // I will modify ProjectileSystem to handle a callback on death for area damage.
  
  public draw() {}
}

interface Orb {
  angle: number;
  active: boolean;
  cooldown: number;
}

export class OrbsAbility extends Ability {
  public id = 'orbs';
  public name = 'Orbes';
  public description = 'Esferas rotativas que dañan enemigos. Mejora: más orbes y velocidad.';
  
  private orbs: Orb[] = [];
  private rotationAngle: number = 0;

  constructor() {
    super();
    this.initOrbs();
  }

  private initOrbs() {
    const count = 1 + Math.floor(this.level / 2);
    this.orbs = [];
    for (let i = 0; i < count; i++) {
      this.orbs.push({
        angle: (i * Math.PI * 2) / count,
        active: true,
        cooldown: 0
      });
    }
  }

  public upgrade() {
    super.upgrade();
    this.initOrbs();
  }

  public update(ctx: AbilityContext) {
    const rotSpeed = 2 + this.level * 0.5;
    const orbitRadius = 80 + this.level * 5;
    const damage = 2 + this.level;
    const cooldownTime = Math.max(0.5, 3 - this.level * 0.5);

    this.rotationAngle += rotSpeed * ctx.dt;

    this.orbs.forEach(orb => {
      if (!orb.active) {
        orb.cooldown -= ctx.dt;
        if (orb.cooldown <= 0) orb.active = true;
        return;
      }

      const currentAngle = this.rotationAngle + orb.angle;
      const ox = ctx.player.x + ctx.player.width / 2 + Math.cos(currentAngle) * orbitRadius;
      const oy = ctx.player.y + ctx.player.height / 2 + Math.sin(currentAngle) * orbitRadius;

      // Check collision with enemies
      for (const e of ctx.enemies) {
        const dx = (e.x + e.width/2) - ox;
        const dy = (e.y + e.height/2) - oy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 20) {
          e.hp -= damage;
          orb.active = false;
          orb.cooldown = cooldownTime;
          ctx.particles.emit(ox, oy, '#00ff88', 10, true);
          break;
        }
      }
    });
  }

  public draw(ctx: CanvasRenderingContext2D, ctxGame: AbilityContext) {
    const orbitRadius = 80 + this.level * 5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ff88';
    
    this.orbs.forEach(orb => {
      if (!orb.active) return;
      const currentAngle = this.rotationAngle + orb.angle;
      const ox = ctxGame.player.x + ctxGame.player.width / 2 + Math.cos(currentAngle) * orbitRadius;
      const oy = ctxGame.player.y + ctxGame.player.height / 2 + Math.sin(currentAngle) * orbitRadius;

      ctx.fillStyle = '#00ff88';
      ctx.beginPath();
      ctx.arc(ox, oy, 8, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }
}

export class ArmorUpgrade extends Ability {
  public id = 'armor_up';
  public name = 'Armadura';
  public description = 'Reduce el daño recibido en cada golpe.';

  public update(ctx: AbilityContext) {
    ctx.player.armor = this.level;
  }
  public draw() {}
}

export class AbilitySystem {
  public activeAbilities: Ability[] = [];

  public addAbility(ability: Ability) {
    const existing = this.activeAbilities.find(a => a.id === ability.id);
    if (existing) {
      existing.upgrade();
    } else {
      this.activeAbilities.push(ability);
    }
  }

  public getAvailableAbilities(): Ability[] {
    const pool: Ability[] = [
      new BasicShot(),
      new WhipAbility(),
      new GrenadeAbility(),
      new OrbsAbility(),
      new ArmorUpgrade()
    ];
    
    return pool.sort(() => Math.random() - 0.5).slice(0, 3);
  }

  public update(ctx: AbilityContext) {
    this.activeAbilities.forEach(a => a.update(ctx));
  }

  public draw(ctx: CanvasRenderingContext2D, ctxGame: AbilityContext) {
    this.activeAbilities.forEach(a => a.draw(ctx, ctxGame));
  }
}
