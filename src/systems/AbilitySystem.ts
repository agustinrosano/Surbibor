import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { ProjectileSystem, ProjectileType } from './ProjectileSystem';
import { ParticleSystem } from './ParticleSystem';

export interface AbilityContext {
  player: Player;
  enemies: Enemy[];
  projectiles: ProjectileSystem;
  particles: ParticleSystem;
  dt: number;
  now: number;
  targetsTaken: Enemy[]; // To prevent multiple abilities targeting same enemy
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

  protected findTarget(player: Player, enemies: Enemy[], exclude: Enemy[]): Enemy | null {
    let nearest: Enemy | null = null;
    let minDist = Infinity;
    for (const e of enemies) {
      if (exclude.includes(e)) continue;
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
}

export class BasicShot extends Ability {
  public id = 'basic_shot';
  public name = 'Flecha Veloz';
  public description = 'Dispara flechas. A más nivel, dispara doble flecha con más alcance.';

  public update(ctx: AbilityContext) {
    this.cooldownTimer -= ctx.dt;
    if (this.cooldownTimer > 0) return;

    const target = this.findTarget(ctx.player, ctx.enemies, ctx.targetsTaken);
    if (!target) return;
    ctx.targetsTaken.push(target);

    const dx = target.x + target.width/2 - (ctx.player.x + ctx.player.width/2);
    const dy = target.y + target.height/2 - (ctx.player.y + ctx.player.height/2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Lowered base speed, scales with level
    const speed = 350 + this.level * 40;
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;

    const count = this.level >= 3 ? 2 : 1;
    const offset = 10;

    for (let i = 0; i < count; i++) {
        const yOff = (i - (count-1)/2) * offset;
        ctx.projectiles.spawn({
            x: ctx.player.x + ctx.player.width / 2,
            y: ctx.player.y + ctx.player.height / 2 + yOff,
            vx: vx,
            vy: vy,
            radius: 5,
            damage: 3 + this.level * 2,
            life: 1.2 + this.level * 0.4,
            color: '#ffffff',
            type: ProjectileType.ARROW
        });
    }

    ctx.particles.emit(ctx.player.x + ctx.player.width/2, ctx.player.y + ctx.player.height, '#ffffff', 2);
    this.cooldownTimer = Math.max(0.1, 0.45 - this.level * 0.05);
  }

  public draw() {}
}

export class MagicShot extends Ability {
    public id = 'magic_shot';
    public name = 'Orbe Arcano';
    public description = 'Lanza esferas mágicas azules. A más nivel, más proyectiles.';
  
    public update(ctx: AbilityContext) {
      this.cooldownTimer -= ctx.dt;
      if (this.cooldownTimer > 0) return;
  
      const target = this.findTarget(ctx.player, ctx.enemies, ctx.targetsTaken);
      if (!target) return;
      ctx.targetsTaken.push(target);
  
      const dx = target.x + target.width/2 - (ctx.player.x + ctx.player.width/2);
      const dy = target.y + target.height/2 - (ctx.player.y + ctx.player.height/2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Lowered base speed, scales with level
      const speed = 400 + this.level * 50;
      const vx = (dx / dist) * speed;
      const vy = (dy / dist) * speed;
  
      const count = this.level >= 3 ? 2 : 1;
      const offset = 12;
  
      for (let i = 0; i < count; i++) {
          const yOff = (i - (count-1)/2) * offset;
          ctx.projectiles.spawn({
              x: ctx.player.x + ctx.player.width / 2,
              y: ctx.player.y + ctx.player.height / 2 + yOff,
              vx: vx,
              vy: vy,
              radius: 6,
              damage: 4 + this.level * 2,
              life: 1.0 + this.level * 0.3,
              color: '#00e5ff',
              type: ProjectileType.MAGIC
          });
      }
  
      ctx.particles.emit(ctx.player.x + ctx.player.width/2, ctx.player.y + ctx.player.height/2, '#00e5ff', 3);
      this.cooldownTimer = Math.max(0.2, 0.6 - this.level * 0.06);
    }
  
    public draw() {}
}

export class WhipAbility extends Ability {
  public id = 'whip';
  public name = 'Latigazo Real';
  public description = 'Un golpe circular potente. Nivel 3+ golpea en ambas direcciones.';
  
  private visualTimer: number = 0;
  private attackDir: {x: number, y: number} = {x: 1, y: 0};

  public update(ctx: AbilityContext) {
    this.cooldownTimer -= ctx.dt;
    this.visualTimer -= ctx.dt;

    if (this.cooldownTimer > 0) return;

    this.attackDir = { ...ctx.player.lastDirection };
    const range = 120 + this.level * 20;
    const damage = 5 + this.level * 3;
    
    this.performAttack(ctx, this.attackDir, range, damage);

    if (this.level >= 3) {
      this.performAttack(ctx, { x: -this.attackDir.x, y: -this.attackDir.y }, range, damage);
    }

    this.cooldownTimer = Math.max(0.3, 1.0 - this.level * 0.12);
    this.visualTimer = 0.15;
  }

  private performAttack(ctx: AbilityContext, dir: {x: number, y: number}, range: number, damage: number) {
    const originX = ctx.player.x + ctx.player.width / 2;
    const originY = ctx.player.y + ctx.player.height / 2;
    const attackX = originX + dir.x * 70;
    const attackY = originY + dir.y * 70;

    ctx.enemies.forEach(e => {
      const dx = (e.x + e.width/2) - attackX;
      const dy = (e.y + e.height/2) - attackY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < range) {
        e.hp -= damage;
        for(let i=0; i<3; i++) {
            ctx.particles.emit(e.x + e.width/2, e.y + e.height/2, '#ffffff', 1);
        }
      }
    });

    for(let i=0; i<10; i++) {
        const angleOffset = (Math.random() - 0.5) * Math.PI;
        const angle = Math.atan2(dir.y, dir.x) + angleOffset;
        const px = originX + Math.cos(angle) * 80;
        const py = originY + Math.sin(angle) * 80;
        ctx.particles.emit(px, py, '#ffffff', 1, false);
    }
  }

  public draw(ctx: CanvasRenderingContext2D, ctxGame: AbilityContext) {
    if (this.visualTimer <= 0) return;

    const originX = ctxGame.player.x + ctxGame.player.width / 2;
    const originY = ctxGame.player.y + ctxGame.player.height / 2;
    const baseAngle = Math.atan2(this.attackDir.y, this.attackDir.x);
    
    this.drawArc(ctx, originX, originY, baseAngle);
    if (this.level >= 3) {
      this.drawArc(ctx, originX, originY, baseAngle + Math.PI);
    }
  }

  private drawArc(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.globalAlpha = (this.visualTimer / 0.15);
    
    ctx.beginPath();
    ctx.arc(x, y, 90, angle - Math.PI / 2.5, angle + Math.PI / 2.5);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.globalAlpha *= 0.5;
    ctx.beginPath();
    ctx.arc(x, y, 95, angle - Math.PI / 3, angle + Math.PI / 3);
    ctx.stroke();

    ctx.restore();
  }
}

export class AuraAbility extends Ability {
  public id = 'aura';
  public name = 'Luz Sagrada';
  public description = 'Aura protectora que daña enemigos. Ahora tiene un ciclo de parpadeo.';
  
  private active: boolean = true;
  private timer: number = 0;

  public update(ctx: AbilityContext) {
    this.timer += ctx.dt;
    
    const cycle = 4.5;
    const activeTime = 3.0;
    this.active = (this.timer % cycle) < activeTime;

    if (!this.active) return;

    const range = 110 + this.level * 15;
    const damagePerSec = 3 + this.level * 2;
    
    ctx.enemies.forEach(e => {
      const dx = (e.x + e.width/2) - (ctx.player.x + ctx.player.width/2);
      const dy = (e.y + e.height/2) - (ctx.player.y + ctx.player.height/2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < range) {
        e.hp -= damagePerSec * ctx.dt;
        if (Math.random() < 0.05) {
            ctx.particles.emit(e.x + e.width/2, e.y + e.height/2, '#fff700', 1);
        }
      }
    });
  }

  public draw(ctx: CanvasRenderingContext2D, ctxGame: AbilityContext) {
    if (!this.active) return;
    
    const range = 110 + this.level * 15;
    ctx.save();
    const flicker = 0.1 + Math.sin(ctxGame.now / 50) * 0.05;
    ctx.globalAlpha = flicker;
    ctx.fillStyle = '#fff700';
    ctx.beginPath();
    ctx.arc(ctxGame.player.x + ctxGame.player.width/2, ctxGame.player.y + ctxGame.player.height/2, range, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.globalAlpha = flicker * 2;
    ctx.strokeStyle = '#fff700';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();
  }
}

export class LightningAbility extends Ability {
  public id = 'lightning';
  public name = 'Rayo Divino';
  public description = 'Lanza un rayo que salta entre enemigos.';

  public update(ctx: AbilityContext) {
    this.cooldownTimer -= ctx.dt;
    if (this.cooldownTimer > 0) return;

    let currentTarget: Enemy | null = this.findRandomEnemy(ctx.enemies);
    if (!currentTarget) return;

    const jumps = 1 + this.level;
    const damage = 4 + this.level * 2;
    
    let lastX = ctx.player.x + ctx.player.width/2;
    let lastY = ctx.player.y + ctx.player.height/2;

    for (let i = 0; i < jumps; i++) {
      if (!currentTarget) break;
      
      currentTarget.hp -= damage;
      ctx.particles.emit(currentTarget.x + currentTarget.width/2, currentTarget.y + currentTarget.height/2, '#00ffff', 10, true);
      this.emitLightningPath(ctx, lastX, lastY, currentTarget.x + currentTarget.width/2, currentTarget.y + currentTarget.height/2);

      lastX = currentTarget.x + currentTarget.width/2;
      lastY = currentTarget.y + currentTarget.height/2;
      currentTarget = this.findNearestEnemy(currentTarget, ctx.enemies, 200);
    }

    this.cooldownTimer = Math.max(1, 3.5 - this.level * 0.5);
  }

  private emitLightningPath(ctx: AbilityContext, x1: number, y1: number, x2: number, y2: number) {
    const dist = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
    const steps = Math.floor(dist / 10);
    for (let i = 0; i <= steps; i++) {
      const px = x1 + (x2-x1) * (i / steps);
      const py = y1 + (y2-y1) * (i / steps);
      ctx.particles.emit(px, py, '#00ffff', 1, false);
    }
  }

  private findRandomEnemy(enemies: Enemy[]): Enemy | null {
    if (enemies.length === 0) return null;
    return enemies[Math.floor(Math.random() * enemies.length)];
  }

  private findNearestEnemy(from: Enemy, enemies: Enemy[], maxDist: number): Enemy | null {
    let nearest: Enemy | null = null;
    let minDist = maxDist;
    for (const e of enemies) {
      if (e === from) continue;
      const dx = (e.x + e.width/2) - (from.x + from.width/2);
      const dy = (e.y + e.height/2) - (from.y + from.height/2);
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minDist) {
        minDist = d;
        nearest = e;
      }
    }
    return nearest;
  }

  public draw() {}
}

export class ArmorUpgrade extends Ability {
  public id = 'armor_up';
  public name = 'Placas de Acero';
  public description = 'Refuerza tu armadura para recibir menos daño.';

  public update(ctx: AbilityContext) {
    ctx.player.armor = this.level * 2;
  }
  public draw() {}
}

export class SpeedUpgrade extends Ability {
    public id = 'speed_up';
    public name = 'Botas del Viento';
    public description = 'Aumenta permanentemente tu velocidad de movimiento.';
  
    public update(ctx: AbilityContext) {
      const baseSpeed = ctx.player.maxHp > 20 ? 1.7 : 1.5;
      ctx.player.speed = baseSpeed + this.level * 0.15;
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
      new MagicShot(),
      new WhipAbility(),
      new LightningAbility(),
      new AuraAbility(),
      new ArmorUpgrade(),
      new SpeedUpgrade()
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
