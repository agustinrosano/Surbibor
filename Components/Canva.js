import { Player } from '../Components/Player.js';
import {
  spawnEnemyAroundPlayer,
  drawEnemies,
  moveEnemiesTowardPlayer,
  checkPlayerCollisions,
  findNearestEnemy
} from '../Components/Enemys.js';
import { createObstaculos, drawObstaculos } from '../Components/obstaculos.js';
import { createGameState, updateGameState, addXp, getSpawnRate } from '../Components/GameState.js';
import {
  createAbilitySystem,
  updateAbilities,
  drawAbilities,
  getAbilityChoices,
  addOrUpgradeAbility,
  getAbilityDefinition
} from '../Components/Abilities.js';
import { createProjectileManager, updateProjectiles, drawProjectiles } from '../Components/Projectiles.js';
import { getCharacter } from '../Components/Characters.js';
import { items } from '../Components/Items.js';
import { createLootManager, spawnLoot, updateLoot, drawLoot } from '../Components/Loot.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  const width = window.innerWidth || 800;
  const height = window.innerHeight || 800;
  canvas.width = width;
  canvas.height = height;
}

window.addEventListener('resize', () => {
  resizeCanvas();
});

resizeCanvas();

const bgImage = new Image();
bgImage.src = '../Assets/grass.png';

const menu = document.getElementById('menu');
const newGameBtn = document.getElementById('newGameBtn');
const settingsBtn = document.getElementById('settingsBtn');
const characterSelect = document.getElementById('characterSelect');
const mainMenuButtons = document.getElementById('mainMenuButtons');
const backBtn = document.getElementById('backBtn');
const characterButtons = document.querySelectorAll('[data-character]');

const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key.toLowerCase() === 'p') {
    if (!levelUpActive) paused = !paused;
  }
});
window.addEventListener('keyup', e => (keys[e.key] = false));

let game = null;
let running = false;
let paused = false;
let levelUpActive = false;
let levelUpChoices = [];
let levelUpRects = [];
let gameOverActive = false;
let gameOverButton = null;
let lastTime = 0;
let loopActive = false;

newGameBtn.addEventListener('click', () => {
  mainMenuButtons.classList.add('hidden');
  characterSelect.classList.remove('hidden');
});

backBtn.addEventListener('click', () => {
  characterSelect.classList.add('hidden');
  mainMenuButtons.classList.remove('hidden');
});

settingsBtn.addEventListener('click', () => {
  console.log('Settings pendiente');
});

characterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const characterId = btn.dataset.character;
    startGame(characterId);
  });
});

function startGame(characterId) {
  menu.classList.add('hidden');
  game = createGame(characterId);
  paused = false;
  levelUpActive = false;
  levelUpChoices = [];
  gameOverActive = false;
  gameOverButton = null;
  running = true;
  lastTime = performance.now();
  if (!loopActive) {
    loopActive = true;
    requestAnimationFrame(loop);
  }
}

function returnToMenu() {
  running = false;
  paused = false;
  levelUpActive = false;
  levelUpChoices = [];
  gameOverActive = false;
  gameOverButton = null;
  menu.classList.remove('hidden');
  characterSelect.classList.add('hidden');
  mainMenuButtons.classList.remove('hidden');
  game = null;
}

function createGame(characterId) {
  const character = getCharacter(characterId);
  return {
    character,
    player: new Player(canvas.width / 2, canvas.height / 2, character.baseStats),
    enemies: [],
    gameState: createGameState(),
    abilities: createAbilitySystem(character.startingAbilities),
    projectiles: createProjectileManager(),
    loot: createLootManager(),
    obstaculosPorChunk: new Map(),
    spawnAccumulator: 0
  };
}

function getUpgradeChoices() {
  const abilityChoices = getAbilityChoices(game.abilities, 99).map(choice => ({
    ...choice,
    kind: 'ability'
  }));
  const itemChoices = Object.values(items).map(item => ({
    ...item,
    kind: 'item'
  }));

  const pool = [...abilityChoices, ...itemChoices];
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(3, shuffled.length));
}

function getCameraOffset() {
  return {
    x: game.player.x - canvas.width / 2,
    y: game.player.y - canvas.height / 2
  };
}

function renderWithCamera(drawFn) {
  const offset = getCameraOffset();
  ctx.save();
  ctx.translate(-offset.x, -offset.y);
  drawFn(ctx);
  ctx.restore();
}

function drawBackground() {
  const { x: ox, y: oy } = getCameraOffset();
  const bw = bgImage.width || 16;
  const bh = bgImage.height || 16;
  const startX = -((ox % bw) + bw) % bw;
  const startY = -((oy % bh) + bh) % bh;
  for (let x = startX; x < canvas.width; x += bw) {
    for (let y = startY; y < canvas.height; y += bh) {
      ctx.drawImage(bgImage, x, y);
    }
  }
}

function getCurrentChunk(x, y, chunkSize = 800) {
  return {
    chunkX: Math.floor(x / chunkSize),
    chunkY: Math.floor(y / chunkSize)
  };
}

function ensureChunkObstacles(playerX, playerY) {
  const { chunkX, chunkY } = getCurrentChunk(playerX, playerY);

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const key = `${chunkX + dx},${chunkY + dy}`;
      if (!game.obstaculosPorChunk.has(key)) {
        const nuevos = createObstaculos(800, 800, 10).map(o => ({
          ...o,
          x: o.x + (chunkX + dx) * 800,
          y: o.y + (chunkY + dy) * 800
        }));
        game.obstaculosPorChunk.set(key, nuevos);
      }
    }
  }
}

function getVisibleObstaculos() {
  const todos = [];
  for (let obs of game.obstaculosPorChunk.values()) {
    todos.push(...obs);
  }
  return todos;
}

function damageEnemy(enemy, amount) {
  enemy.hp -= amount;
  if (enemy.hp <= 0) {
    addXp(game.gameState, enemy.xpValue);
    maybeDropLoot(enemy);
    return true;
  }
  return false;
}

function maybeDropLoot(enemy) {
  if (Math.random() < 0.12) {
    spawnLoot(game.loot, {
      x: enemy.x + enemy.width / 2,
      y: enemy.y + enemy.height / 2,
      size: 14,
      color: '#7ee081',
      onPickup: player => {
        player.hp = Math.min(player.maxHp, player.hp + 2);
      }
    });
  }
}

function updateEnemyStatus(dt) {
  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const e = game.enemies[i];
    if (e.burnRemaining > 0) {
      e.burnRemaining -= dt;
      e.burnTick += dt;
      if (e.burnTick >= 0.6) {
        e.burnTick = 0;
        const killed = damageEnemy(e, 1);
        if (killed) {
          game.enemies.splice(i, 1);
        }
      }
    }
  }
}

function update(dt, now) {
  ensureChunkObstacles(game.player.x, game.player.y);
  const obstaculos = getVisibleObstaculos();

  updateGameState(game.gameState, dt);
  game.player.update(keys, obstaculos);

  game.spawnAccumulator += getSpawnRate(game.gameState) * dt;
  while (game.spawnAccumulator >= 1) {
    game.enemies.push(spawnEnemyAroundPlayer(game.player, game.gameState.level));
    game.spawnAccumulator -= 1;
  }

  const abilityContext = {
    player: game.player,
    enemies: game.enemies,
    projectiles: game.projectiles,
    dt,
    damageEnemy,
    findNearestEnemy: () => findNearestEnemy(game.enemies, game.player)
  };

  updateAbilities(game.abilities, abilityContext);
  updateProjectiles(game.projectiles, game.enemies, dt, damageEnemy);
  updateEnemyStatus(dt);
  moveEnemiesTowardPlayer(game.enemies, game.player, obstaculos);
  checkPlayerCollisions(game.enemies, game.player, now);
  updateLoot(game.loot, game.player);

  if (game.gameState.pendingLevelUps > 0 && !levelUpActive) {
    beginLevelUp();
  }
}

function beginLevelUp() {
  levelUpChoices = getUpgradeChoices();
  if (levelUpChoices.length === 0) {
    game.gameState.pendingLevelUps = 0;
    levelUpActive = false;
    return;
  }
  levelUpActive = true;
}

function chooseAbility(index) {
  const choice = levelUpChoices[index];
  if (!choice) return;
  if (choice.kind === 'ability') {
    addOrUpgradeAbility(game.abilities, choice.id);
  } else if (choice.kind === 'item') {
    choice.apply(game.player);
  }
  game.gameState.pendingLevelUps = Math.max(0, game.gameState.pendingLevelUps - 1);
  if (game.gameState.pendingLevelUps > 0) {
    beginLevelUp();
  } else {
    levelUpActive = false;
  }
}

window.addEventListener('keydown', e => {
  if (!levelUpActive) return;
  if (e.key === '1') chooseAbility(0);
  if (e.key === '2') chooseAbility(1);
  if (e.key === '3') chooseAbility(2);
});

canvas.addEventListener('pointerdown', e => {
  if (gameOverActive && gameOverButton) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    if (
      x >= gameOverButton.x &&
      x <= gameOverButton.x + gameOverButton.w &&
      y >= gameOverButton.y &&
      y <= gameOverButton.y + gameOverButton.h
    ) {
      returnToMenu();
      return;
    }
  }
  if (!levelUpActive) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;
  for (let i = 0; i < levelUpRects.length; i++) {
    const r = levelUpRects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      chooseAbility(i);
      break;
    }
  }
});

function drawUI() {
  const state = game.gameState;
  const timeMin = Math.floor(state.time / 60);
  const timeSec = Math.floor(state.time % 60).toString().padStart(2, '0');

  const pad = Math.max(10, canvas.width * 0.015);
  const baseFont = Math.max(12, Math.min(18, canvas.width * 0.02));
  const smallFont = Math.max(10, baseFont - 2);

  ctx.fillStyle = 'white';
  ctx.font = `${baseFont}px Arial`;
  ctx.fillText(`Nivel: ${state.level}`, pad, pad + baseFont);
  ctx.fillText(`Tiempo: ${timeMin}:${timeSec}`, pad, pad + baseFont * 2.2);

  let row = pad + baseFont * 3.4;
  game.abilities.abilities.forEach((inst, id) => {
    const def = getAbilityDefinition(id);
    ctx.fillStyle = '#f8fafc';
    ctx.font = `${smallFont}px Arial`;
    ctx.fillText(`${def.name}: Nv ${inst.level}`, pad, row);
    row += smallFont * 1.4;
  });

  const barWidth = canvas.width - pad * 2;
  const xpRatio = Math.min(1, state.xp / state.xpToNext);
  const xpHeight = Math.max(8, canvas.height * 0.012);
  const hpHeight = Math.max(7, canvas.height * 0.01);
  ctx.fillStyle = '#1f2933';
  ctx.fillRect(pad, canvas.height - pad - xpHeight - hpHeight - 6, barWidth, xpHeight);
  ctx.fillStyle = '#60a5fa';
  ctx.fillRect(pad, canvas.height - pad - xpHeight - hpHeight - 6, barWidth * xpRatio, xpHeight);

  const hpRatio = Math.max(0, game.player.hp / game.player.maxHp);
  ctx.fillStyle = '#1f2933';
  ctx.fillRect(pad, canvas.height - pad - hpHeight, barWidth, hpHeight);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(pad, canvas.height - pad - hpHeight, barWidth * hpRatio, hpHeight);

  ctx.fillStyle = '#94a3b8';
  ctx.font = `${smallFont}px Arial`;
  ctx.fillText(`Armadura: ${game.player.armor}`, pad, canvas.height - pad - hpHeight - xpHeight - 12);
}

function drawLevelUp() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const panelWidth = Math.min(520, canvas.width - 60);
  const panelHeight = Math.min(320, canvas.height - 80);
  const panelX = (canvas.width - panelWidth) / 2;
  const panelY = (canvas.height - panelHeight) / 2;
  const titleSize = Math.max(20, Math.min(28, panelWidth * 0.06));
  const textSize = Math.max(14, Math.min(18, panelWidth * 0.04));

  ctx.fillStyle = 'rgba(15, 20, 30, 0.92)';
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.4)';
  ctx.lineWidth = 2;
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
  ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

  ctx.fillStyle = 'white';
  ctx.font = `bold ${titleSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('Nivel Subido', canvas.width / 2, panelY + 50);

  ctx.font = `${textSize}px Arial`;
  ctx.fillText('Elige una habilidad (1-3)', canvas.width / 2, panelY + 80);

  const startY = panelY + 120;
  const lineGap = Math.max(46, panelHeight * 0.18);

  levelUpRects = [];
  levelUpChoices.forEach((choice, i) => {
    let title = '';
    let desc = '';
    if (choice.kind === 'ability') {
      const def = getAbilityDefinition(choice.id);
      const current = game.abilities.abilities.get(choice.id);
      const nextLevel = current ? current.level + 1 : 1;
      title = `${def.name} (Nv ${nextLevel})`;
      desc = def.description;
    } else {
      title = `${choice.name}`;
      desc = choice.description;
    }

    const y = startY + i * lineGap;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`${i + 1}. ${title}`, panelX + 24, y);
    ctx.fillStyle = 'white';
    ctx.fillText(desc, panelX + 24, y + 20);

    levelUpRects.push({
      x: panelX + 16,
      y: y - 22,
      w: panelWidth - 32,
      h: 38
    });
  });

  ctx.textAlign = 'left';
}

function drawPause() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'yellow';
  ctx.font = '40px Arial';
  ctx.fillText('PAUSA', 320, 400);
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'red';
  ctx.font = '40px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40);

  const buttonWidth = Math.min(260, canvas.width * 0.6);
  const buttonHeight = Math.max(40, canvas.height * 0.06);
  const bx = (canvas.width - buttonWidth) / 2;
  const by = canvas.height / 2 + 10;
  gameOverButton = { x: bx, y: by, w: buttonWidth, h: buttonHeight };

  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(bx, by, buttonWidth, buttonHeight);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.strokeRect(bx, by, buttonWidth, buttonHeight);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '20px Arial';
  ctx.fillText('Volver al menu', canvas.width / 2, by + buttonHeight / 2 + 6);
  ctx.textAlign = 'left';
}

function draw(now) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();

  const obstaculos = getVisibleObstaculos();
  renderWithCamera(context => drawObstaculos(context, obstaculos));
  renderWithCamera(context => drawEnemies(context, game.enemies));
  renderWithCamera(context => drawProjectiles(context, game.projectiles));
  renderWithCamera(context => drawLoot(context, game.loot));
  renderWithCamera(context => drawAbilities(game.abilities, context));
  renderWithCamera(context => game.player.draw(context, now));

  drawUI();

  if (paused) drawPause();
  if (levelUpActive) drawLevelUp();
  if (game.player.hp <= 0) drawGameOver();
}

function loop(now) {
  if (!running) {
    loopActive = false;
    return;
  }

  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;

  if (game.player.hp > 0 && !paused && !levelUpActive) {
    update(dt, now);
  }

  draw(now);

  if (game.player.hp <= 0) {
    gameOverActive = true;
  }

  requestAnimationFrame(loop);
}
