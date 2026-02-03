const orcSprite = new Image();
orcSprite.src = '/Assets/Orc.png';

let orcReady = false;
orcSprite.onload = () => {
  orcReady = true;
  console.log('Orc sprite cargado correctamente');
};

const skeletonSprite = new Image();
skeletonSprite.src = '/Assets/Skeleton.png';

let skeletonReady = false;
skeletonSprite.onload = () => {
  skeletonReady = true;
  console.log('Skeleton sprite cargado correctamente');
};

const numFramesOrc = 29;
const frameSpeedOrc = 15;
const numFramesSkeleton = 13;
const frameSpeedSkeleton = 15;

const enemyTypes = [
  {
    id: 'runner',
    maxHp: 1,
    speed: 0.9,
    scale: 1.6,
    xp: 1,
    sprite: orcSprite,
    ready: () => orcReady,
    frames: numFramesOrc,
    frameSpeed: frameSpeedOrc
  },
  {
    id: 'grunt',
    maxHp: 2,
    speed: 0.6,
    scale: 2,
    xp: 2,
    sprite: orcSprite,
    ready: () => orcReady,
    frames: numFramesOrc,
    frameSpeed: frameSpeedOrc
  },
  {
    id: 'brute',
    maxHp: 5,
    speed: 0.4,
    scale: 2.4,
    xp: 4,
    sprite: orcSprite,
    ready: () => orcReady,
    frames: numFramesOrc,
    frameSpeed: frameSpeedOrc
  },
  {
    id: 'skeleton',
    maxHp: 2,
    speed: 0.7,
    scale: 2,
    xp: 3,
    sprite: skeletonSprite,
    ready: () => skeletonReady,
    frames: numFramesSkeleton,
    frameSpeed: frameSpeedSkeleton
  },
  {
    id: 'skeleton2',
    maxHp: 2,
    speed: 0.7,
    scale: 2,
    xp: 3,
    sprite: skeletonSprite,
    ready: () => skeletonReady,
    frames: numFramesSkeleton,
    frameSpeed: frameSpeedSkeleton
  }
];

function getFrameMetrics(sprite, frames) {
  const frameWidth = sprite.width ? sprite.width / frames : 16;
  const frameHeight = sprite.height || 16;
  return { frameWidth, frameHeight };
}

export function createEnemy(typeId, x, y) {
  const type = enemyTypes.find(t => t.id === typeId) || enemyTypes[1];
  const { frameWidth, frameHeight } = getFrameMetrics(type.sprite, type.frames);
  return {
    x,
    y,
    width: frameWidth * type.scale,
    height: frameHeight * type.scale,
    size: frameWidth * type.scale * 0.6,
    currentFrame: 0,
    frameCounter: 0,
    hp: type.maxHp,
    maxHp: type.maxHp,
    speed: type.speed,
    xpValue: type.xp,
    type: type.id,
    sprite: type.sprite,
    ready: type.ready,
    frames: type.frames,
    frameSpeed: type.frameSpeed
  };
}

export function spawnEnemyAroundPlayer(player, level, distance = 480) {
  const angle = Math.random() * Math.PI * 2;
  const radius = distance + Math.random() * 120;
  const x = player.x + Math.cos(angle) * radius;
  const y = player.y + Math.sin(angle) * radius;
  const type = pickEnemyType(level);
  return createEnemy(type, x, y);
}

function pickEnemyType(level) {
  if (level < 3) return Math.random() < 0.7 ? 'runner' : 'grunt';
  if (level < 6) return Math.random() < 0.5 ? 'grunt' : 'runner';
  if (level < 10) return Math.random() < 0.35 ? 'grunt' : Math.random() < 0.6 ? 'runner' : Math.random() < 0.85 ? 'skeleton' : 'brute';
  return Math.random() < 0.35 ? 'grunt' : Math.random() < 0.55 ? 'runner' : Math.random() < 0.8 ? 'skeleton' : 'brute';
}

export function drawEnemies(ctx, enemies) {
  enemies.forEach(e => {
    if (!e.ready || !e.ready()) return;
    const { frameWidth, frameHeight } = getFrameMetrics(e.sprite, e.frames);
    e.frameCounter++;
    if (e.frameCounter >= e.frameSpeed) {
      e.currentFrame = (e.currentFrame + 1) % e.frames;
      e.frameCounter = 0;
    }

    ctx.drawImage(
      e.sprite,
      e.currentFrame * frameWidth,
      0,
      frameWidth,
      frameHeight,
      e.x,
      e.y,
      e.width,
      e.height
    );
  });
}

export function moveEnemiesTowardPlayer(enemies, player, obstaculos = []) {
  enemies.forEach(e => {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      const primary = { x: e.x + nx * e.speed, y: e.y + ny * e.speed };
      const alternatives = [
        { x: e.x + ny * e.speed, y: e.y - nx * e.speed },
        { x: e.x - ny * e.speed, y: e.y + nx * e.speed },
        { x: e.x + nx * e.speed * 0.6, y: e.y + ny * e.speed * 0.6 }
      ];

      const tryMove = pos => !obstaculos.some(o =>
        pos.x < o.x + o.width &&
        pos.x + e.size > o.x &&
        pos.y < o.y + o.height &&
        pos.y + e.size > o.y
      );

      if (tryMove(primary)) {
        e.x = primary.x;
        e.y = primary.y;
      } else {
        for (let i = 0; i < alternatives.length; i++) {
          if (tryMove(alternatives[i])) {
            e.x = alternatives[i].x;
            e.y = alternatives[i].y;
            break;
          }
        }
      }
    }
  });
}

export function checkPlayerCollisions(enemies, player, now) {
  enemies.forEach(e => {
    const collision =
      e.x < player.x + player.width &&
      e.x + e.size > player.x &&
      e.y < player.y + player.height &&
      e.y + e.size > player.y;

    if (collision) {
      player.takeHit(now);
      e.x += (e.x - player.x) * 1.2;
      e.y += (e.y - player.y) * 1.2;
    }
  });
}

export function findNearestEnemy(enemies, player) {
  let closest = null;
  let minDist = Infinity;
  enemies.forEach(e => {
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      closest = e;
    }
  });
  return closest;
}
