const soldierSprite = new Image();
soldierSprite.src = '/Assets/Soldier.png';

let spriteReady = false;
soldierSprite.onload = () => {
  spriteReady = true;
  console.log('Sprite cargado correctamente');
};

const frameWidth = 15;
const frameHeight = 36;
const numFrames = 43;
const frameSpeed = 6;

export class Player {
  constructor(x, y, stats = {}) {
    this.x = x;
    this.y = y;
    this.size = 15;
    this.width = frameWidth * 2;
    this.height = frameHeight * 2;
    this.speed = stats.speed ?? 2;
    this.maxHp = stats.maxHp ?? 5;
    this.hp = this.maxHp;
    this.armor = 0;
    this.invulnerableUntil = 0;

    this.currentFrame = 0;
    this.frameCounter = 0;
  }

  update(keys, obstaculos = []) {
    let nextX = this.x;
    let nextY = this.y;
    let moving = false;
    const speed = this.speed;

    if (keys['ArrowUp']) {
      nextY -= speed;
      moving = true;
    }
    if (keys['ArrowDown']) {
      nextY += speed;
      moving = true;
    }
    if (keys['ArrowLeft']) {
      nextX -= speed;
      moving = true;
    }
    if (keys['ArrowRight']) {
      nextX += speed;
      moving = true;
    }

    let oldX = this.x;
    this.x = nextX;
    let colisionX = obstaculos.some(o =>
      this.x < o.x + o.width &&
      this.x + this.width > o.x &&
      this.y < o.y + o.height &&
      this.y + this.height > o.y
    );
    if (colisionX) this.x = oldX;

    let oldY = this.y;
    this.y = nextY;
    let colisionY = obstaculos.some(o =>
      this.x < o.x + o.width &&
      this.x + this.width > o.x &&
      this.y < o.y + o.height &&
      this.y + this.height > o.y
    );
    if (colisionY) this.y = oldY;

    if (moving) {
      this.frameCounter++;
      if (this.frameCounter >= frameSpeed) {
        this.currentFrame = (this.currentFrame + 1) % numFrames;
        this.frameCounter = 0;
      }
    } else {
      this.currentFrame = 1;
    }
  }

  takeHit(now, damage = 1) {
    if (now < this.invulnerableUntil) return;
    const reduced = Math.max(1, damage - this.armor);
    this.hp = Math.max(0, this.hp - reduced);
    this.invulnerableUntil = now + 650;
  }

  draw(ctx, now = 0) {
    if (!spriteReady) return;

    const frameW = soldierSprite.width / numFrames;
    const frameH = soldierSprite.height;

    const invulnerable = now < this.invulnerableUntil;
    if (invulnerable) ctx.globalAlpha = 0.6;

    ctx.drawImage(
      soldierSprite,
      this.currentFrame * frameW,
      0,
      frameW,
      frameH,
      this.x,
      this.y,
      frameW * 2,
      frameH * 2
    );

    if (invulnerable) ctx.globalAlpha = 1;
  }
}
