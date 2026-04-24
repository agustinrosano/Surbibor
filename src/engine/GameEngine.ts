import { GameState, Point } from './GameEngine';
import { Player } from '../entities/Player';
import { Enemy, ENEMY_TYPES, EnemyType } from '../entities/Enemy';
import { Obstacle, ObstacleType } from '../entities/Obstacle';
import { Item, ItemType } from '../entities/Item';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { ParticleSystem } from '../systems/ParticleSystem';
import { AbilitySystem, BasicShot, WhipAbility } from '../systems/AbilitySystem';
import { AssetLoader } from './AssetLoader';
import { NetworkManager } from './NetworkManager';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private minimapCanvas: HTMLCanvasElement;
  private minimapCtx: CanvasRenderingContext2D;
  public network = new NetworkManager();
  private otherPlayers: Map<string, Player> = new Map();
  private lastTime: number = 0;
  private running: boolean = false;
  
  private player!: Player;
  private enemies: Enemy[] = [];
  private obstacles: Obstacle[] = [];
  private items: Item[] = [];
  private projectiles = new ProjectileSystem();
  private particles = new ParticleSystem();
  private abilities = new AbilitySystem();
  
  private gameState: GameState = {
    level: 1,
    xp: 0,
    xpToNext: 15, // Increased initial XP requirement
    time: 0,
    pendingLevelUps: 0,
    isPaused: false,
    isGameOver: false
  };

  private keys: { [key: string]: boolean } = {};
  private camera: Point = { x: 0, y: 0 };
  private shake: number = 0;
  private characterType: 'archer' | 'soldier' = 'archer';

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.minimapCanvas = document.getElementById('minimap') as HTMLCanvasElement;
    this.minimapCtx = this.minimapCanvas.getContext('2d')!;
    this.setupResize();
    this.setupInputs();
  }

  private setupResize() {
    const resize = () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();
  }

  private setupInputs() {
    window.addEventListener('keydown', e => {
      this.keys[e.key] = true;
      if (e.key.toLowerCase() === 'p') {
        this.togglePause();
      }
    });
    window.addEventListener('keyup', e => this.keys[e.key] = false);
  }

  public togglePause() {
    if (this.gameState.isGameOver || this.gameState.pendingLevelUps > 0) return;
    this.gameState.isPaused = !this.gameState.isPaused;
    
    const pauseModal = document.getElementById('pause-modal')!;
    pauseModal.style.display = this.gameState.isPaused ? 'flex' : 'none';
  }

  public async init() {
    await AssetLoader.loadImages({
      'soldier': './Assets/Soldier.png',
      'orc': './Assets/Orc.png',
      'skeleton': './Assets/Skeleton.png',
      'grass': './Assets/grass.png',
      'rock': './Assets/rock.png',
      'stump': './Assets/stump.png',
      'bat': './Assets/bat.png',
      'zombie': './Assets/zombie.png',
      'food': './Assets/food.png'
    });
  }

  public reset(characterType: 'archer' | 'soldier' = 'archer') {
    this.characterType = characterType;
    this.gameState = {
      level: 1,
      xp: 0,
      xpToNext: 15,
      time: 0,
      pendingLevelUps: 0,
      isPaused: false,
      isGameOver: false
    };
    
    this.enemies = [];
    this.obstacles = [];
    this.items = [];
    this.projectiles = new ProjectileSystem();
    this.particles = new ParticleSystem();
    this.abilities = new AbilitySystem();
    
    this.player = new Player(this.canvas.width / 2, this.canvas.height / 2, {
      speed: characterType === 'soldier' ? 1.7 : 1.5,
      maxHp: characterType === 'soldier' ? 25 : 18,
      armor: 0
    });
    
    this.camera = { x: this.player.x - this.canvas.width / 2, y: this.player.y - this.canvas.height / 2 };
    
    if (characterType === 'archer') {
      this.abilities.addAbility(new BasicShot());
    } else {
      this.abilities.addAbility(new WhipAbility());
    }

    for (let i = 0; i < 30; i++) {
      this.spawnObstacle();
    }
    
    document.getElementById('game-over-screen')!.style.display = 'none';
    document.getElementById('level-up-modal')!.style.display = 'none';
    document.getElementById('pause-modal')!.style.display = 'none';
    document.getElementById('hud')!.style.display = 'block';
  }

  private spawnObstacle() {
    const range = 2500;
    const x = this.player.x + (Math.random() - 0.5) * range;
    const y = this.player.y + (Math.random() - 0.5) * range;
    const type = Math.random() > 0.5 ? ObstacleType.ROCK : ObstacleType.STUMP;
    this.obstacles.push(new Obstacle(x, y, type));
  }

  public stop() {
    this.running = false;
    this.gameState.isPaused = false;
    document.getElementById('hud')!.style.display = 'none';
    document.getElementById('pause-modal')!.style.display = 'none';
    document.getElementById('game-over-screen')!.style.display = 'none';
    document.getElementById('level-up-modal')!.style.display = 'none';
    document.getElementById('character-selection')!.style.display = 'none';
  }

  public start() {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  private loop(now: number) {
    if (!this.running) return;

    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (!this.gameState.isPaused && !this.gameState.isGameOver) {
      this.update(dt, now);
    }
    this.draw(now);

    requestAnimationFrame(this.loop.bind(this));
  }

  private update(dt: number, now: number) {
    this.gameState.time += dt;
    
    const oldX = this.player.x;
    const oldY = this.player.y;
    this.player.update(this.keys, dt);

    this.obstacles.forEach(obs => {
      const dx = (this.player.x + this.player.width/2) - obs.centerX;
      const dy = (this.player.y + this.player.height/2) - obs.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 20 + obs.radius) {
        this.player.x = oldX;
        this.player.y = oldY;
      }
    });

    // Item Pickup & Expiration
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      if (item.update(dt)) {
        this.items.splice(i, 1);
        continue;
      }

      if (item.checkCollision(this.player.x, this.player.y, this.player.width, this.player.height)) {
        if (item.type === ItemType.FOOD) {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 5);
          this.particles.emit(this.player.x + this.player.width/2, this.player.y + this.player.height/2, '#00ff00', 10);
        }
        this.items.splice(i, 1);
      }
    }

    this.projectiles.update(dt);
    this.particles.update(dt);
    
    // Enemies logic
    const allPlayers = [this.player];
    this.network.players.forEach(p => {
        // Create a temporary player object for AI targeting
        const tempP = new Player(p.x, p.y, { speed: 0, maxHp: p.maxHp, armor: 0 });
        tempP.hp = p.hp;
        allPlayers.push(tempP);
    });

    this.enemies.forEach(e => {
      e.update(allPlayers, dt, this.obstacles);
    });

    // Multiplayer sync
    if (this.network.roomId) {
        this.network.sendMovement({
            x: this.player.x,
            y: this.player.y,
            hp: this.player.hp,
            abilities: this.abilities.activeAbilities.map(a => ({ id: a.id, level: a.level }))
        });
    }

    // Restore Enemy Spawning & Difficulty
    const difficultyMultiplier = 1.0 + Math.floor(this.gameState.time / 30) * 0.2;
    const playerCount = 1 + this.network.players.size;
    const enemyLimit = (40 + Math.floor(this.gameState.time / 20) * 5) * playerCount;
    if (this.enemies.length < enemyLimit) {
      this.spawnEnemy(difficultyMultiplier);
    }
    
    // Update local abilities
    this.abilities.update({
        player: this.player,
        enemies: this.enemies,
        projectiles: this.projectiles,
        particles: this.particles,
        dt,
        now,
        targetsTaken: []
    });

    this.projectiles.checkCollisions(this.enemies as any, (enemy, p) => {
      enemy.hp -= p.damage;
      this.particles.emit(p.x, p.y, p.color, 8);
      if (enemy.hp <= 0) {
        this.onEnemyKilled(enemy);
      }
    });

    this.enemies.forEach(e => {
      const dx = (e.x + e.width/2) - (this.player.x + this.player.width/2);
      const dy = (e.y + e.height/2) - (this.player.y + this.player.height/2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 25) {
        this.player.takeDamage(1, now);
        this.shake = 10;
        if (this.player.hp <= 0) {
          this.gameOver();
        }
      }
    });

    this.camera.x = this.player.x - this.canvas.width / 2;
    this.camera.y = this.player.y - this.canvas.height / 2;
    
    if (this.shake > 0) {
      this.shake *= 0.9;
      if (this.shake < 0.1) this.shake = 0;
    }

    this.updateHUD();
  }

  private spawnEnemy(difficultyMultiplier: number = 1.0) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.max(this.canvas.width, this.canvas.height) * 0.7;
    const x = this.player.x + Math.cos(angle) * dist;
    const y = this.player.y + Math.sin(angle) * dist;
    
    const r = Math.random();
    let type = EnemyType.RUNNER;
    if (r < 0.1) type = EnemyType.ZOMBIE;
    else if (r < 0.3) type = EnemyType.SKELETON;
    else if (r < 0.5) type = EnemyType.BAT;
    
    this.enemies.push(new Enemy(x, y, type, difficultyMultiplier));
  }

  private onEnemyKilled(enemy: Enemy) {
    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) {
      this.enemies.splice(idx, 1);
      this.gameState.xp += enemy.xpValue;
      this.particles.emit(enemy.x + enemy.width/2, enemy.y + enemy.height/2, '#ffd700', 15);
      
      // Reduced drop rate (3%)
      if (Math.random() < 0.03) {
        this.items.push(new Item(enemy.x, enemy.y, ItemType.FOOD));
      }

      if (this.gameState.xp >= this.gameState.xpToNext) {
        this.levelUp();
      }
    }
  }

  private levelUp() {
    this.gameState.level++;
    this.gameState.xp = 0;
    this.gameState.xpToNext = Math.floor(this.gameState.xpToNext * 1.6);
    this.gameState.isPaused = true;
    
    const modal = document.getElementById('level-up-modal')!;
    const choicesContainer = document.getElementById('ability-choices')!;
    choicesContainer.innerHTML = '';
    
    const choices = this.abilities.getAvailableAbilities();
    choices.forEach(choice => {
      const card = document.createElement('div');
      const rarity = this.getRandomRarity();
      card.className = `choice-card rarity-${rarity}`;
      
      const existing = this.abilities.activeAbilities.find(a => a.id === choice.id);
      const levelText = existing ? `NV ${existing.level} → ${existing.level + 1}` : 'NUEVA';
      
      card.innerHTML = `
        <div class="rarity-badge">${rarity.toUpperCase()}</div>
        <div class="choice-info">
          <h3>${choice.name}</h3>
          <p class="ability-level">${levelText}</p>
          <p class="ability-desc">${choice.description}</p>
        </div>
      `;
      card.onclick = () => {
        this.abilities.addAbility(choice);
        modal.style.display = 'none';
        this.gameState.isPaused = false;
      };
      choicesContainer.appendChild(card);
    });
    
    modal.style.display = 'flex';
  }

  private getRandomRarity(): string {
    const r = Math.random();
    if (r < 0.1) return 'legendary';
    if (r < 0.3) return 'rare';
    return 'common';
  }

  private gameOver() {
    this.gameState.isGameOver = true;
    const screen = document.getElementById('game-over-screen')!;
    document.getElementById('stat-time')!.innerText = document.getElementById('timer')!.innerText;
    document.getElementById('stat-level')!.innerText = this.gameState.level.toString();
    screen.style.display = 'flex';
  }

  private updateAbilitiesHUD() {
    const hud = document.getElementById('abilities-hud');
    if (!hud) return;

    const abilityIcons: Record<string, string> = {
      'basic_shot': '🏹',
      'magic_shot': '🔮',
      'whip': '⚔️',
      'aura': '✨',
      'lightning': '⚡',
      'armor_up': '🛡️',
      'speed_up': '👟'
    };

    const currentHtml = this.abilities.activeAbilities.map(a => `
      <div class="ability-slot">
        <span>${abilityIcons[a.id] || '?'}</span>
        <div class="lvl-badge">${a.level}</div>
      </div>
    `).join('');

    if (hud.innerHTML !== currentHtml) {
      hud.innerHTML = currentHtml;
    }
  }

  private updateHUD() {
    this.updateAbilitiesHUD();
    
    const xpFill = document.getElementById('xp-fill');
    if (xpFill) {
        const xpRatio = (this.gameState.xp / this.gameState.xpToNext) * 100;
        xpFill.style.width = `${xpRatio}%`;
    }
    
    const hpFill = document.getElementById('hp-fill');
    if (hpFill) {
        const hpRatio = (this.player.hp / this.player.maxHp) * 100;
        hpFill.style.width = `${hpRatio}%`;
    }

    const timer = document.getElementById('timer');
    if (timer) {
      const mins = Math.floor(this.gameState.time / 60);
      const secs = Math.floor(this.gameState.time % 60);
      timer.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    const levelDisplay = document.getElementById('level-display');
    if (levelDisplay) levelDisplay.innerText = `NIVEL ${this.gameState.level}`;
  }

  private draw(now: number) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.save();
    
    let tx = -this.camera.x;
    let ty = -this.camera.y;
    if (this.shake > 0) {
      tx += (Math.random() - 0.5) * this.shake;
      ty += (Math.random() - 0.5) * this.shake;
    }
    this.ctx.translate(tx, ty);

    const grass = AssetLoader.getImage('grass');
    const startX = Math.floor(this.camera.x / grass.width) * grass.width;
    const startY = Math.floor(this.camera.y / grass.height) * grass.height;
    
    for (let x = startX; x < startX + this.canvas.width + grass.width; x += grass.width) {
      for (let y = startY; y < startY + this.canvas.height + grass.height; y += grass.height) {
        this.ctx.drawImage(grass, x, y);
      }
    }

    this.obstacles.forEach(o => o.draw(this.ctx));
    this.items.forEach(i => i.draw(this.ctx, now));
    this.enemies.forEach(e => e.draw(this.ctx));
    this.projectiles.draw(this.ctx);
    this.particles.draw(this.ctx);
    
    const abilityCtx = {
        player: this.player,
        enemies: this.enemies,
        projectiles: this.projectiles,
        particles: this.particles,
        dt: 0,
        now,
        targetsTaken: []
    };
    this.abilities.draw(this.ctx, abilityCtx);
    this.player.draw(this.ctx, now);

    // Draw Other Players
    this.network.players.forEach((p) => {
        const sprite = AssetLoader.getImage(p.charType === 'soldier' ? 'soldier' : 'soldier');
        if (sprite) {
            this.ctx.globalAlpha = 0.8;
            this.ctx.drawImage(sprite, 0, 0, 32, 64, p.x, p.y, 32, 64);
            this.ctx.globalAlpha = 1.0;
            
            // Health Bar
            this.ctx.fillStyle = '#b22222';
            this.ctx.fillRect(p.x, p.y + 70, (p.hp / p.maxHp) * 32, 5);

            // Draw Their Abilities (Visuals)
            p.abilities?.forEach(abData => {
                const ab = this.abilities.getAvailableAbilities().find(a => a.id === abData.id);
                if (ab) {
                    ab.level = abData.level;
                    // Create temp context for drawing
                    const tempP = new Player(p.x, p.y, { speed: 0, maxHp: p.maxHp, armor: 0 });
                    tempP.lastDirection = { x: 1, y: 0 }; // Default
                    ab.draw(this.ctx, {
                        player: tempP,
                        enemies: this.enemies,
                        projectiles: this.projectiles,
                        particles: this.particles,
                        dt: 0,
                        now: now,
                        targetsTaken: []
                    });
                }
            });
        }
    });
    
    this.ctx.restore();

    this.drawMinimap();
  }

  private drawMinimap() {
    const mCtx = this.minimapCtx;
    const mCanvas = this.minimapCanvas;
    const centerX = mCanvas.width / 2;
    const centerY = mCanvas.height / 2;
    const range = 1500; // Total world units shown on minimap
    const scale = mCanvas.width / range;

    mCtx.clearRect(0, 0, mCanvas.width, mCanvas.height);

    // Draw background/border
    mCtx.fillStyle = 'rgba(26, 20, 15, 0.5)';
    mCtx.beginPath();
    mCtx.arc(centerX, centerY, mCanvas.width/2, 0, Math.PI * 2);
    mCtx.fill();

    // Player 1 (Orange Dot)
    mCtx.fillStyle = '#ff9800';
    mCtx.beginPath();
    mCtx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    mCtx.fill();

    // Other Players (Blue Dot)
    this.network.players.forEach(p => {
        const dx = p.x - this.player.x;
        const dy = p.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < range / 2) {
            mCtx.fillStyle = '#2196f3'; // Blue
            mCtx.beginPath();
            mCtx.arc(centerX + dx * scale, centerY + dy * scale, 4, 0, Math.PI * 2);
            mCtx.fill();
        } else if (dist < range * 2) {
            this.drawMinimapArrow(mCtx, centerX, centerY, dx, dy, '#2196f3');
        }
    });

    // Items (Food - Brown Dot)
    this.items.forEach(item => {
      const dx = item.x - this.player.x;
      const dy = item.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < range / 2) {
        // Within map
        mCtx.fillStyle = '#795548'; // Brown
        mCtx.beginPath();
        mCtx.arc(centerX + dx * scale, centerY + dy * scale, 3, 0, Math.PI * 2);
        mCtx.fill();
      } else if (dist < range * 2) {
        // Out of range - draw arrow
        this.drawMinimapArrow(mCtx, centerX, centerY, dx, dy, '#795548');
      }
    });

    // In a future multiplayer update, we would draw Player 2 here in Blue
  }

  private drawMinimapArrow(ctx: CanvasRenderingContext2D, cx: number, cy: number, dx: number, dy: number, color: string) {
    const angle = Math.atan2(dy, dx);
    const radius = this.minimapCanvas.width / 2 - 8;
    const arrowX = cx + Math.cos(angle) * radius;
    const arrowY = cy + Math.sin(angle) * radius;

    ctx.save();
    ctx.translate(arrowX, arrowY);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-8, -5);
    ctx.lineTo(-8, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
