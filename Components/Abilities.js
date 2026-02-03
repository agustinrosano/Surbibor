import { spawnBullet, spawnEffect } from './Projectiles.js';

const abilityDefinitions = {
  basic_shot: {
    id: 'basic_shot',
    name: 'Disparo',
    description: 'Disparo automatico al enemigo mas cercano.',
    maxLevel: 6,
    stats(level) {
      return {
        cooldown: Math.max(0.25, 0.65 - level * 0.07),
        damage: 1 + Math.floor((level - 1) / 2),
        speed: 320 + level * 25,
        bullets: level >= 4 ? 2 : 1,
        spread: level >= 4 ? 0.18 : 0
      };
    },
    update(instance, ctx) {
      instance.cooldown -= ctx.dt;
      if (instance.cooldown > 0) return;

      const target = ctx.findNearestEnemy();
      if (!target) {
        instance.cooldown = 0.2;
        return;
      }

      const stats = this.stats(instance.level);
      const dx = target.x + target.width / 2 - ctx.player.x;
      const dy = target.y + target.height / 2 - ctx.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const baseAngle = Math.atan2(dy, dx);

      let offsets = [0];
      if (stats.bullets === 2) offsets = [-stats.spread, stats.spread];
      if (stats.bullets >= 3) offsets = [0, -stats.spread, stats.spread];

      offsets.forEach(offset => {
        const angle = baseAngle + offset;
        spawnBullet(ctx.projectiles, {
          x: ctx.player.x + ctx.player.width / 2,
          y: ctx.player.y + ctx.player.height / 2,
          vx: Math.cos(angle) * stats.speed,
          vy: Math.sin(angle) * stats.speed,
          radius: 3,
          damage: stats.damage,
          life: 1.6
        });
      });

      instance.cooldown = stats.cooldown;
    },
    draw() {}
  },
  line_strike: {
    id: 'line_strike',
    name: 'Golpe Lineal',
    description: 'Golpe corto en linea recta.',
    maxLevel: 6,
    stats(level) {
      return {
        cooldown: Math.max(0.3, 0.9 - level * 0.08),
        damage: 1 + Math.floor((level - 1) / 2),
        range: 40 + level * 6,
        width: 14 + level * 2
      };
    },
    update(instance, ctx) {
      instance.cooldown -= ctx.dt;
      if (instance.cooldown > 0) return;

      const target = ctx.findNearestEnemy();
      if (!target) {
        instance.cooldown = 0.25;
        return;
      }

      const stats = this.stats(instance.level);
      const originX = ctx.player.x + ctx.player.width / 2;
      const originY = ctx.player.y + ctx.player.height / 2;
      const dx = target.x + target.width / 2 - originX;
      const dy = target.y + target.height / 2 - originY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;

      const hitbox = {
        x: originX + nx * 8 - stats.width / 2,
        y: originY + ny * 8 - stats.width / 2,
        width: stats.width,
        height: stats.range
      };

      if (Math.abs(nx) > Math.abs(ny)) {
        hitbox.width = stats.range;
        hitbox.height = stats.width;
        hitbox.x = originX + nx * 8;
        hitbox.y = originY - stats.width / 2;
        if (nx < 0) hitbox.x -= stats.range;
      } else {
        hitbox.y = originY + ny * 8;
        hitbox.x = originX - stats.width / 2;
        if (ny < 0) hitbox.y -= stats.range;
      }

      for (let i = ctx.enemies.length - 1; i >= 0; i--) {
        const e = ctx.enemies[i];
        const collision =
          hitbox.x < e.x + e.width &&
          hitbox.x + hitbox.width > e.x &&
          hitbox.y < e.y + e.height &&
          hitbox.y + hitbox.height > e.y;

        if (collision) {
          const killed = ctx.damageEnemy(e, stats.damage);
          if (killed) {
            ctx.enemies.splice(i, 1);
          }
        }
      }

      spawnEffect(ctx.projectiles, {
        type: 'slash',
        x: hitbox.x,
        y: hitbox.y,
        width: hitbox.width,
        height: hitbox.height,
        life: 0.08
      });

      instance.cooldown = stats.cooldown;
    },
    draw() {}
  },
  spiral_orbit: {
    id: 'spiral_orbit',
    name: 'Espiral',
    description: 'Gira alrededor y vuelve 10s despues de matar.',
    maxLevel: 6,
    stats(level) {
      return {
        damage: 1 + Math.floor((level - 1) / 2),
        radius: 36 + level * 4,
        speed: 4 + level * 0.4,
        cooldown: 10,
        orbCount: level >= 6 ? 3 : 1
      };
    },
    update(instance, ctx) {
      const stats = this.stats(instance.level);
      if (!instance.orbs || instance.orbs.length !== stats.orbCount) {
        const baseOffsets = [];
        for (let i = 0; i < stats.orbCount; i++) {
          baseOffsets.push((Math.PI * 2 * i) / stats.orbCount);
        }
        instance.orbs = baseOffsets.map(offset => ({
          offset,
          active: true,
          cooldown: 0
        }));
      }

      instance.angle += stats.speed * ctx.dt;

      instance.orbs.forEach(orb => {
        if (!orb.active) {
          orb.cooldown -= ctx.dt;
          if (orb.cooldown <= 0) {
            orb.active = true;
          }
          return;
        }

        const angle = instance.angle + orb.offset;
        const orbitX = ctx.player.x + ctx.player.width / 2 + Math.cos(angle) * stats.radius;
        const orbitY = ctx.player.y + ctx.player.height / 2 + Math.sin(angle) * stats.radius;
        orb.position = { x: orbitX, y: orbitY, radius: 8 };

        for (let i = ctx.enemies.length - 1; i >= 0; i--) {
          const e = ctx.enemies[i];
          const collision =
            orbitX - 6 < e.x + e.width &&
            orbitX + 6 > e.x &&
            orbitY - 6 < e.y + e.height &&
            orbitY + 6 > e.y;

          if (collision) {
            const killed = ctx.damageEnemy(e, stats.damage);
            if (killed) {
              ctx.enemies.splice(i, 1);
            }
            orb.active = false;
            orb.cooldown = stats.cooldown;
            break;
          }
        }
      });
    },
    draw(instance, ctx) {
      if (!instance.orbs) return;
      ctx.fillStyle = 'rgba(120, 220, 255, 0.8)';
      instance.orbs.forEach(orb => {
        if (!orb.active || !orb.position) return;
        ctx.beginPath();
        ctx.arc(orb.position.x, orb.position.y, orb.position.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }
  ,
  lightning_storm: {
    id: 'lightning_storm',
    name: 'Rayos',
    description: 'Rayos caen cerca del jugador y pegan en area.',
    maxLevel: 6,
    stats(level) {
      return {
        cooldown: Math.max(0.5, 2.2 - level * 0.2),
        damage: 1 + Math.floor(level / 2),
        radius: 45 + level * 5,
        area: 28 + level * 4,
        strikes: level >= 4 ? 2 : 1,
        visualLife: 0.35
      };
    },
    update(instance, ctx) {
      instance.cooldown -= ctx.dt;
      if (instance.cooldown > 0) return;

      const stats = this.stats(instance.level);
      for (let s = 0; s < stats.strikes; s++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * stats.radius;
        const strikeX = ctx.player.x + ctx.player.width / 2 + Math.cos(angle) * dist;
        const strikeY = ctx.player.y + ctx.player.height / 2 + Math.sin(angle) * dist;

        for (let i = ctx.enemies.length - 1; i >= 0; i--) {
          const e = ctx.enemies[i];
          const dx = e.x + e.width / 2 - strikeX;
          const dy = e.y + e.height / 2 - strikeY;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d <= stats.area) {
            const killed = ctx.damageEnemy(e, stats.damage);
            if (killed) ctx.enemies.splice(i, 1);
          }
        }
        spawnEffect(ctx.projectiles, {
          type: 'bolt',
          x: strikeX,
          y: strikeY,
          radius: stats.area,
          life: stats.visualLife
        });
      }

      instance.cooldown = stats.cooldown;
    },
    draw() {}
  },
  grenade_burn: {
    id: 'grenade_burn',
    name: 'Granadas',
    description: 'Explota y deja quemadura.',
    maxLevel: 6,
    stats(level) {
      return {
        cooldown: Math.max(0.6, 2.6 - level * 0.25),
        damage: 2 + Math.floor(level / 2),
        radius: 32 + level * 3,
        burn: 2 + level * 0.3
      };
    },
    update(instance, ctx) {
      instance.cooldown -= ctx.dt;
      if (instance.cooldown > 0) return;

      const target = ctx.findNearestEnemy();
      if (!target) {
        instance.cooldown = 0.4;
        return;
      }

      const stats = this.stats(instance.level);
      const gx = target.x + target.width / 2;
      const gy = target.y + target.height / 2;

      for (let i = ctx.enemies.length - 1; i >= 0; i--) {
        const e = ctx.enemies[i];
        const dx = e.x + e.width / 2 - gx;
        const dy = e.y + e.height / 2 - gy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d <= stats.radius) {
          const killed = ctx.damageEnemy(e, stats.damage);
          if (killed) {
            ctx.enemies.splice(i, 1);
          } else {
            e.burnRemaining = Math.max(e.burnRemaining || 0, stats.burn);
            e.burnTick = 0;
          }
        }
      }

      spawnEffect(ctx.projectiles, {
        type: 'blast',
        x: gx,
        y: gy,
        radius: stats.radius,
        life: 0.2
      });

      instance.cooldown = stats.cooldown;
    },
    draw() {}
  }
};

export function createAbilitySystem(startingAbilities = []) {
  const abilities = new Map();
  startingAbilities.forEach(id => {
    abilities.set(id, createAbilityInstance(id));
  });
  return { abilities };
}

export function createAbilityInstance(id) {
  return {
    id,
    level: 1,
    cooldown: 0,
    active: false,
    angle: 0,
    lastPosition: null
  };
}

export function updateAbilities(system, ctx) {
  system.abilities.forEach(instance => {
    const def = abilityDefinitions[instance.id];
    if (def) {
      def.update(instance, ctx);
    }
  });
}

export function drawAbilities(system, ctx) {
  system.abilities.forEach(instance => {
    const def = abilityDefinitions[instance.id];
    if (def && def.draw) {
      def.draw(instance, ctx);
    }
  });
}

export function getAbilityChoices(system, count = 3) {
  const available = Object.values(abilityDefinitions).filter(def => {
    const inst = system.abilities.get(def.id);
    return !inst || inst.level < def.maxLevel;
  });

  const shuffled = available.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function addOrUpgradeAbility(system, id) {
  const def = abilityDefinitions[id];
  if (!def) return;
  const current = system.abilities.get(id);
  if (!current) {
    system.abilities.set(id, createAbilityInstance(id));
  } else if (current.level < def.maxLevel) {
    current.level += 1;
  }
}

export function getAbilityDefinition(id) {
  return abilityDefinitions[id];
}
