import { GameState, Point } from './GameEngine';
import { Player } from '../entities/Player';
import { Enemy, ENEMY_TYPES } from '../entities/Enemy';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { ParticleSystem } from '../systems/ParticleSystem';
import { AbilitySystem, BasicShot, WhipAbility } from '../systems/AbilitySystem';
import { AssetLoader } from './AssetLoader';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lastTime: number = 0;
  private running: boolean = false;
  
  private player!: Player;
  private enemies: Enemy[] = [];
  private projectiles = new ProjectileSystem();
  private particles = new ParticleSystem();
  private abilities = new AbilitySystem();
  
  private gameState: GameState = {
    level: 1,
    xp: 0,
    xpToNext: 10,
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
      'grass': './Assets/grass.png'
    });
  }

  public reset(characterType: 'archer' | 'soldier' = 'archer') {
    this.characterType = characterType;
    this.gameState = {
      level: 1,
      xp: 0,
      xpToNext: 10,
      time: 0,
      pendingLevelUps: 0,
      isPaused: false,
      isGameOver: false
    };
    
    this.enemies = [];
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
    
    document.getElementById('game-over-screen')!.style.display = 'none';
    document.getElementById('level-up-modal')!.style.display = 'none';
    document.getElementById('pause-modal')!.style.display = 'none';
    document.getElementById('hud')!.style.display = 'block';
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
    
    this.player.update(this.keys, dt);
    this.projectiles.update(dt);
    this.particles.update(dt);
    
    this.abilities.update({
      player: this.player,
      enemies: this.enemies,
      projectiles: this.projectiles,
      particles: this.particles,
      dt,
      now
    });

    if (this.enemies.length < 20 + this.gameState.level * 5) {
      this.spawnEnemy();
    }

    this.enemies.forEach(e => e.update(this.player, dt));

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

  private spawnEnemy() {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.max(this.canvas.width, this.canvas.height) * 0.7;
    const x = this.player.x + Math.cos(angle) * dist;
    const y = this.player.y + Math.sin(angle) * dist;
    const type = Math.random() > 0.3 ? ENEMY_TYPES.runner : ENEMY_TYPES.skeleton;
    this.enemies.push(new Enemy(x, y, type));
  }

  private onEnemyKilled(enemy: Enemy) {
    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) {
      this.enemies.splice(idx, 1);
      this.gameState.xp += enemy.xpValue;
      this.particles.emit(enemy.x + enemy.width/2, enemy.y + enemy.height/2, '#ffd700', 15);
      
      if (this.gameState.xp >= this.gameState.xpToNext) {
        this.levelUp();
      }
    }
  }

  private levelUp() {
    this.gameState.level++;
    this.gameState.xp = 0;
    this.gameState.xpToNext = Math.floor(this.gameState.xpToNext * 1.4);
    this.gameState.isPaused = true;
    
    const modal = document.getElementById('level-up-modal')!;
    const choicesContainer = document.getElementById('ability-choices')!;
    choicesContainer.innerHTML = '';
    
    const choices = this.abilities.getAvailableAbilities();
    choices.forEach(choice => {
      const card = document.createElement('div');
      card.className = 'choice-card';
      const existing = this.abilities.activeAbilities.find(a => a.id === choice.id);
      const levelText = existing ? `Nivel ${existing.level} -> ${existing.level + 1}` : 'Nueva Habilidad';
      
      card.innerHTML = `
        <div class="choice-info">
          <h3>${choice.name} <span style="font-size: 0.7rem; opacity: 0.7;">(${levelText})</span></h3>
          <p>${choice.description}</p>
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

  private gameOver() {
    this.gameState.isGameOver = true;
    const screen = document.getElementById('game-over-screen')!;
    document.getElementById('stat-time')!.innerText = document.getElementById('timer')!.innerText;
    document.getElementById('stat-level')!.innerText = this.gameState.level.toString();
    screen.style.display = 'flex';
  }

  private updateHUD() {
    const xpFill = document.getElementById('xp-fill');
    if (xpFill) xpFill.style.width = `${(this.gameState.xp / this.gameState.xpToNext) * 100}%`;
    
    const hpFill = document.getElementById('hp-fill');
    if (hpFill) hpFill.style.width = `${(this.player.hp / this.player.maxHp) * 100}%`;

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

    this.enemies.forEach(e => e.draw(this.ctx));
    this.projectiles.draw(this.ctx);
    this.particles.draw(this.ctx);
    
    const abilityCtx = {
        player: this.player,
        enemies: this.enemies,
        projectiles: this.projectiles,
        particles: this.particles,
        dt: 0,
        now
    };
    this.abilities.draw(this.ctx, abilityCtx);
    this.player.draw(this.ctx, now);
    
    this.ctx.restore();
  }
}
