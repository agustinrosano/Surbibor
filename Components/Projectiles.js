export function createProjectileManager() {
  return {
    bullets: [],
    effects: []
  };
}

export function spawnBullet(manager, bullet) {
  manager.bullets.push(bullet);
}

export function spawnEffect(manager, effect) {
  manager.effects.push(effect);
}

export function updateProjectiles(manager, enemies, dt, damageEnemy) {
  for (let i = manager.bullets.length - 1; i >= 0; i--) {
    const b = manager.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    let hit = false;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      const collision =
        b.x - b.radius < e.x + e.width &&
        b.x + b.radius > e.x &&
        b.y - b.radius < e.y + e.height &&
        b.y + b.radius > e.y;

      if (collision) {
        const killed = damageEnemy(e, b.damage);
        hit = true;
        if (killed) {
          enemies.splice(j, 1);
        }
        break;
      }
    }

    if (hit || b.life <= 0) {
      manager.bullets.splice(i, 1);
    }
  }

  for (let i = manager.effects.length - 1; i >= 0; i--) {
    const e = manager.effects[i];
    e.life -= dt;
    if (e.life <= 0) {
      manager.effects.splice(i, 1);
    }
  }
}

export function drawProjectiles(ctx, manager) {
  ctx.fillStyle = '#f1c40f';
  manager.bullets.forEach(b => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  manager.effects.forEach(e => {
    if (e.type === 'slash') {
      ctx.fillStyle = 'rgba(255, 120, 80, 0.6)';
      ctx.fillRect(e.x, e.y, e.width, e.height);
      return;
    }
    if (e.type === 'bolt') {
      ctx.strokeStyle = 'rgba(120, 220, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y - e.radius);
      ctx.lineTo(e.x, e.y + e.radius);
      ctx.stroke();
      ctx.fillStyle = 'rgba(120, 220, 255, 0.35)';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (e.type === 'blast') {
      ctx.fillStyle = 'rgba(255, 120, 60, 0.35)';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}
