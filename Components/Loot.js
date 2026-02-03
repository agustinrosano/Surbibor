export function createLootManager() {
  return {
    drops: []
  };
}

export function spawnLoot(manager, loot) {
  manager.drops.push(loot);
}

export function updateLoot(manager, player) {
  for (let i = manager.drops.length - 1; i >= 0; i--) {
    const drop = manager.drops[i];
    const collision =
      drop.x < player.x + player.width &&
      drop.x + drop.size > player.x &&
      drop.y < player.y + player.height &&
      drop.y + drop.size > player.y;

    if (collision) {
      if (drop.onPickup) drop.onPickup(player);
      manager.drops.splice(i, 1);
    }
  }
}

export function drawLoot(ctx, manager) {
  manager.drops.forEach(drop => {
    ctx.fillStyle = drop.color || '#7ee081';
    ctx.beginPath();
    ctx.arc(drop.x, drop.y, drop.size / 2, 0, Math.PI * 2);
    ctx.fill();
  });
}
