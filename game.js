// ============================================================
//  CONSTANTS
// ============================================================
const MOVE_SPEED = 2;
const MINE_RANGE = 80;
const BLOCK_SIZE = 32;
const BLOCK_HITBOX = 5;
const WORLD_W = 1200;
const WORLD_H = 900;
const CAM_W = 500;
const CAM_H = 250;

const MERCADO_X = 10;
const MERCADO_Y = 10;
const MERCADO_W = 64;
const MERCADO_H = 64;
const MERCADO_OFFSET_X = 0;
const MERCADO_OFFSET_Y = 0;
const MERCADO_OFFSET_W = 0;
const MERCADO_OFFSET_H = 0;

const PLAYER_START_X = 100;
const PLAYER_START_Y = 316;
const PLAYER_SIZE = 32;
const PLAYER_VISUAL_H = 64;
const PLAYER_HP = 5;

const PICKAXE_TIERS = ["brz", "stn", "irn", "emrl", "rbi"];
const PICKAXE_NAMES = ["Bronce", "Piedra", "Hierro", "Esmeralda", "Rubí"];
const PICKAXE_COSTS = [0, 3, 5, 8, 12];
const PICKAXE_DMG = [1, 1, 2, 2, 3];

const PICKAXE_ANGLES = {
  down: 135,
  up: -45,
  left: 45,
  right: 45,
};

const SWORD_NAMES = ["Espada", "Espada+", "Espada++"];
const SWORD_COSTS = [10, 15, 20];
const SWORD_DMG = [3, 4, 5];

const SWORD_THRUST = {
  down: { x: 0, y: 12 },
  up: { x: 0, y: -12 },
  left: { x: -12, y: 0 },
  right: { x: 12, y: 0 },
};

const SWORD_ANGLES = {
  down: 180,
  up: 0,
  left: -90,
  right: 90,
};

// ============================================================
//  INPUT
// ============================================================
class Input {
  constructor() {
    this._keys = {};
    document.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();
      this._keys[key] = true;
      if (["w", "a", "s", "d"].includes(key)) e.preventDefault();
    });
    document.addEventListener("keyup", (e) => {
      this._keys[e.key.toLowerCase()] = false;
    });
  }

  isDown(key) {
    return !!this._keys[key.toLowerCase()];
  }
}

// ============================================================
//  CAMERA
// ============================================================
class Camera {
  constructor(worldEl) {
    this.worldEl = worldEl;
  }

  follow(px, py, targetSize) {
    let camX = px + targetSize / 2 - CAM_W / 2;
    let camY = py + targetSize / 2 - CAM_H / 2;
    camX = Math.max(0, Math.min(WORLD_W - CAM_W, camX));
    camY = Math.max(0, Math.min(WORLD_H - CAM_H, camY));
    this.worldEl.style.transform = `translate(${-camX}px, ${-camY}px)`;
  }
}

// ============================================================
//  HUD
// ============================================================
class HUD {
  constructor() {
    this.oroEl = document.getElementById("oro");
    this.faseEl = document.getElementById("fase-actual");
    this.corazonesEl = document.getElementById("corazones");
  }

  actualizarOro(cantidad) {
    this.oroEl.innerText = cantidad;
  }

  actualizarFase(fase) {
    this.faseEl.innerText = fase;
  }

  actualizarCorazones(vidaActual, vidaMax) {
    this.corazonesEl.innerHTML = "";
    for (let i = 0; i < vidaMax; i++) {
      const div = document.createElement("div");
      div.className = "sprite-corazon" + (i < vidaActual ? " lleno" : " vacio");
      this.corazonesEl.appendChild(div);
    }
  }
}

// ============================================================
//  PLAYER
// ============================================================
class Player {
  constructor(worldEl, pickaxeLevel, swordLevel) {
    this.x = PLAYER_START_X;
    this.y = PLAYER_START_Y;
    this.dir = "down";
    this.hp = PLAYER_HP;
    this.maxHp = PLAYER_HP;
    this.isMining = false;
    this.isAttacking = false;
    this.size = PLAYER_SIZE;
    this.pickaxeLevel = pickaxeLevel !== undefined ? pickaxeLevel : -1;
    this.swordLevel = swordLevel !== undefined ? swordLevel : -1;
    this.activeTool = "pickaxe";

    this.el = document.getElementById("jugador");
    this.sombra = this._crearSombra(worldEl);
    this.pickaxe = this._crearPico(worldEl);
    this.sword = this._crearEspada(worldEl);
    this._render();
  }

  get bottom() {
    return this.el.offsetTop + this.el.offsetHeight;
  }
  get centerX() {
    return this.x + this.size / 2;
  }
  get centerY() {
    return this.y + this.size / 2;
  }

  _crearSombra(worldEl) {
    const s = document.createElement("div");
    s.classList.add("sombra");
    s.style.width = "220px";
    s.style.height = "80px";
    s.style.opacity = "0.7";
    worldEl.appendChild(s);
    return s;
  }

  _crearPico(worldEl) {
    const p = document.createElement("div");
    p.classList.add("pickaxe");
    worldEl.appendChild(p);
    return p;
  }

  _render() {
    this.el.style.left = this.x + "px";
    this.el.style.top = this.y + "px";
    this.el.style.backgroundImage = `url('sprites/char/char_${this.dir}.png')`;
    this.sombra.style.left = this.x - 7.9 + "px";
    this.sombra.style.top = this.y + "px";
    this._posicionarPico();
    this._posicionarEspada();
  }

  moveTo(newX, newY) {
    this.x = newX;
    this.y = newY;
    this._render();
  }

  setDir(dir) {
    this.dir = dir;
    this.el.style.backgroundImage = `url('sprites/char/char_${dir}.png')`;
    this._posicionarPico();
    this._posicionarEspada();
  }

  getMoveX(dx) {
    return Math.max(0, Math.min(WORLD_W - this.size, this.x + dx));
  }
  getMoveY(dy) {
    return Math.max(0, Math.min(WORLD_H - this.size, this.y + dy));
  }

  animarMinería(dir, blockX, blockY, onDone) {
    if (this.pickaxeLevel < 0) {
      if (onDone) onDone();
      return;
    }
    this.dir = dir;
    this.isMining = true;
    this.el.style.backgroundImage = `url('sprites/char/char_${dir}.png')`;
    this._posicionarEspada();

    const restX = this.x + 24;
    const restY = this.y + 4;
    const mineX = blockX + BLOCK_SIZE / 2 - 20;
    const mineY = blockY - 24;

    this.pickaxe.style.animation = "none";

    this.pickaxe.style.transition = "none";
    this.pickaxe.style.display = "block";
    this.pickaxe.style.left = restX + "px";
    this.pickaxe.style.top = restY + "px";
    this.pickaxe.style.transform = "rotate(0deg)";

    void this.pickaxe.offsetHeight;

    this.pickaxe.style.transition = "left 0.15s ease-out, top 0.15s ease-out";
    this.pickaxe.style.left = mineX + "px";
    this.pickaxe.style.top = mineY + "px";

    let strikes = 0;
    const swing = () => {
      if (strikes >= 2) {
        this.pickaxe.style.transition =
          "left 0.12s ease-in, top 0.12s ease-in, transform 0.12s ease-in";
        this.pickaxe.style.left = restX + "px";
        this.pickaxe.style.top = restY + "px";
        this.pickaxe.style.transform = "rotate(0deg)";
        setTimeout(() => {
          this.isMining = false;
          this.pickaxe.style.animation = "";
          this._posicionarPico();
          if (onDone) onDone();
        }, 120);
        return;
      }
      this.pickaxe.style.transition = "transform 0.1s ease-out";
      this.pickaxe.style.transform = "rotate(150deg)";
      setTimeout(() => {
        this.pickaxe.style.transition = "transform 0.08s ease-in";
        this.pickaxe.style.transform = "rotate(60deg)";
        strikes++;
        setTimeout(swing, 90);
      }, 100);
    };

    setTimeout(swing, 160);
  }

  setPickaxeLevel(level) {
    this.pickaxeLevel = level;
    this._posicionarPico();
  }

  _posicionarPico() {
    if (
      this.pickaxeLevel < 0 ||
      this.pickaxeLevel >= PICKAXE_TIERS.length ||
      this.activeTool !== "pickaxe"
    ) {
      this.pickaxe.style.display = "none";
      return;
    }
    this.pickaxe.style.display = "block";
    const tier = PICKAXE_TIERS[this.pickaxeLevel];
    this.pickaxe.style.backgroundImage = `url('sprites/pickaxe/${tier}_pickaxe.png')`;
    this.pickaxe.style.left = this.x + 24 + "px";
    this.pickaxe.style.top = this.y + 10 + "px";
    this.pickaxe.style.transform = "rotate(0deg)";
    this.pickaxe.style.transition = "none";
  }

  _crearEspada(worldEl) {
    const s = document.createElement("div");
    s.classList.add("sword");
    worldEl.appendChild(s);
    return s;
  }

  setSwordLevel(level) {
    this.swordLevel = level;
  }

  setActiveTool(tool) {
    this.activeTool = tool;
    this._posicionarPico();
    this._posicionarEspada();
  }

  _posicionarEspada() {
    if (this.swordLevel < 0 || this.activeTool !== "sword") {
      this.sword.style.display = "none";
      return;
    }
    this.sword.style.display = "block";
    this.sword.style.left = this.x + 24 + "px";
    this.sword.style.top = this.y + 8 + "px";
    this.sword.style.transform = "rotate(0deg)";
    this.sword.style.transition = "none";
  }

  animarEspada(dir, onDone) {
    if (this.swordLevel < 0) {
      if (onDone) onDone();
      return;
    }
    this.dir = dir;
    this.isAttacking = true;
    this.setDir(dir);

    const thrust = SWORD_THRUST[dir] || { x: 0, y: 0 };
    const angle = SWORD_ANGLES[dir] || 0;

    const restX = this.x + 24;
    const restY = this.y + 8;
    const thrustX = this.x + 24 + thrust.x;
    const thrustY = this.y + 8 + thrust.y;

    this.sword.style.transform = `rotate(${angle}deg)`;
    this.sword.style.transition = "none";
    this.sword.style.left = restX + "px";
    this.sword.style.top = restY + "px";
    this.sword.style.display = "block";

    void this.sword.offsetHeight;

    this.sword.style.transition = "left 0.08s ease-out, top 0.08s ease-out";
    this.sword.style.left = thrustX + "px";
    this.sword.style.top = thrustY + "px";

    setTimeout(() => {
      this.sword.style.transition = "left 0.08s ease-in, top 0.08s ease-in";
      this.sword.style.left = restX + "px";
      this.sword.style.top = restY + "px";
      setTimeout(() => {
        this.isAttacking = false;
        if (this.activeTool === "sword") {
          this._posicionarEspada();
        } else {
          this.sword.style.display = "none";
        }
        if (onDone) onDone();
      }, 80);
    }, 80);
  }

  curar(cantidad) {
    this.hp = Math.min(this.maxHp, this.hp + cantidad);
  }
  aumentarVidaMax() {
    this.maxHp++;
    this.curar(1);
  }
}

// ============================================================
//  BLOCK
// ============================================================
class Block {
  constructor(x, y, mundo) {
    this.x = x;
    this.y = y;
    this.hp = 3;
    this.maxHp = 3;
    this.hit = false;

    this.el = document.createElement("div");
    this.el.className = "block";
    this.el.style.left = x + "px";
    this.el.style.top = y + "px";

    this.hpBar = document.createElement("div");
    this.hpBar.className = "block-hp";
    this.hpBar.style.display = "none";

    this.hpFill = document.createElement("div");
    this.hpFill.className = "block-hp-fill";
    this.hpBar.appendChild(this.hpFill);
    this.el.appendChild(this.hpBar);

    mundo.appendChild(this.el);
  }

  get bottom() {
    return this.el.offsetTop + this.el.offsetHeight;
  }
  get centerX() {
    return this.x + BLOCK_SIZE / 2;
  }
  get centerY() {
    return this.y + BLOCK_SIZE / 2;
  }

  eliminar() {
    this.el.remove();
  }
}

class BlockManager {
  constructor(mundo) {
    this.blocks = [];
    this.mundo = mundo;
  }

  generar(playerX, playerY) {
    const posiciones = [];
    const cantidad = Math.random() * 2 + 10;

    for (let i = 0; i < cantidad; i++) {
      let x,
        y,
        intentos = 0;
      do {
        x = 4 + Math.random() * (WORLD_W - BLOCK_SIZE - 8);
        y = 4 + Math.random() * (WORLD_H - BLOCK_SIZE - 8);
        intentos++;
      } while (
        intentos < 100 &&
        (posiciones.some(
          (p) =>
            x < p.x + BLOCK_SIZE + 4 &&
            x + BLOCK_SIZE + 4 > p.x &&
            y < p.y + BLOCK_SIZE + 4 &&
            y + BLOCK_SIZE + 4 > p.y,
        ) ||
          (Math.abs(x + BLOCK_SIZE / 2 - (playerX + 32)) < 80 &&
            Math.abs(y + BLOCK_SIZE / 2 - (playerY + 32)) < 80))
      );
      posiciones.push({ x, y });
    }

    posiciones.forEach((pos) => {
      const block = new Block(pos.x, pos.y, this.mundo);
      block.el.onclick = () => {
        if (this.onBlockClick) this.onBlockClick(block);
      };
      this.blocks.push(block);
    });
  }

  getBlockByEl(el) {
    return this.blocks.find((b) => b.el === el);
  }

  colisiona(x, y, size) {
    const margin = 4;
    const hbX = x + margin;
    const hbY = y + margin;
    const hbSize = size - margin * 2;
    const OFFSET_X = -10,
      OFFSET_Y = -10,
      HB_W = 20.5,
      HB_H = 30;

    return this.blocks.some(
      (b) =>
        hbX < b.x + OFFSET_X + HB_W &&
        hbX + hbSize > b.x + OFFSET_X &&
        hbY < b.y + OFFSET_Y + HB_H &&
        hbY + hbSize > b.y + OFFSET_Y,
    );
  }

  golpear(block, playerCenterX, playerCenterY, daño, onMined) {
    const dist = Math.sqrt(
      (playerCenterX - block.centerX) ** 2 +
        (playerCenterY - block.centerY) ** 2,
    );
    if (dist > MINE_RANGE) return false;

    if (!block.hit) {
      block.hit = true;
      block.hpBar.style.display = "block";
    }

    block.hp -= daño;
    const pct = (block.hp / block.maxHp) * 100;
    block.hpFill.style.width = pct + "%";

    if (block.hp <= 1) block.hpFill.style.background = "#f33";
    else if (block.hp <= 2) block.hpFill.style.background = "#fc3";

    if (block.hp <= 0) {
      block.eliminar();
      this.blocks = this.blocks.filter((b) => b !== block);
      if (onMined) onMined(daño);
    }
    return true;
  }

  eliminarTodos() {
    this.blocks.forEach((b) => b.eliminar());
    this.blocks = [];
  }
}

// ============================================================
//  ENEMY
// ============================================================
class Enemy {
  constructor(x, y, mundo, type) {
    this.x = x;
    this.y = y;
    this.size = 64;
    this.type = type || "body";
    this.hit = false;

    if (this.type === "body") {
      this.hp = 8;
      this.maxHp = 8;
      this.speed = 0.4 + Math.random() * 0.3;
    } else {
      this.hp = 4;
      this.maxHp = 4;
      this.speed = 0.6 + Math.random() * 0.4;
    }

    this.bodyFrame = 1;
    this.wobble = Math.random() * Math.PI * 2;
    this.wobbleSpeed = 0.02 + Math.random() * 0.03;
    this.wobbleAmp = 0.3 + Math.random() * 0.4;

    this.stunTimer = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.hitFlashTimer = 0;

    this.wanderTargetX = x;
    this.wanderTargetY = y;
    this.wanderTimer = 0;
    this.aggroRange = 200 + Math.random() * 150;

    this.el = document.createElement("div");
    this.el.classList.add("enemigo-container");
    this.el.style.position = "absolute";
    this.el.style.width = "64px";
    this.el.style.height = "64px";
    this.el.style.transform = `translate(${x}px, ${y}px)`;

    this.spriteEl = document.createElement("div");
    this.spriteEl.className =
      this.type === "body" ? "enemigo-body" : "enemigo-eye";
    this._actualizarSprite();
    this.el.appendChild(this.spriteEl);

    this.hpBar = document.createElement("div");
    this.hpBar.className = "enemigo-hit";
    this.hpBar.style.display = "none";

    this.hpFill = document.createElement("div");
    this.hpFill.className = "enemigo-hit-fill";
    this.hpBar.appendChild(this.hpFill);

    this.el.appendChild(this.hpBar);
    mundo.appendChild(this.el);

    if (this.type === "body") {
      this._animInterval = setInterval(() => {
        this.bodyFrame = (this.bodyFrame % 9) + 1;
        this._actualizarSprite();
      }, 200);
    } else {
      this._eyeInterval = setInterval(() => {
        this._actualizarSprite();
      }, 300);
    }
  }

  _actualizarSprite() {
    if (this.type === "body") {
      this.spriteEl.style.backgroundImage = `url('sprites/enemy/enemy_body/enemy_body${this.bodyFrame}.png')`;
    } else {
      const frame = Math.floor(Math.random() * 5) + 1;
      this.spriteEl.style.backgroundImage = `url('sprites/enemy/enemy_eye/enemy_eye${frame}.png')`;
    }
  }

  get bottom() {
    return this.y + this.size;
  }
  get centerX() {
    return this.x + this.size / 2;
  }
  get centerY() {
    return this.y + this.size / 2;
  }

  _nuevoWander() {
    this.wanderTargetX = Math.random() * (WORLD_W - this.size);
    this.wanderTargetY = Math.random() * (WORLD_H - this.size);
    this.wanderTimer = 80 + Math.floor(Math.random() * 160);
  }

  moverHacia(px, py) {
    this.wobble += this.wobbleSpeed;

    const knockback =
      Math.abs(this.knockbackVx) > 0.1 ||
      Math.abs(this.knockbackVy) > 0.1;

    if (knockback) {
      this.x += this.knockbackVx;
      this.y += this.knockbackVy;
      this.knockbackVx *= 0.88;
      this.knockbackVy *= 0.88;
    }

    if (this.stunTimer > 0) {
      this.stunTimer--;
    } else if (!knockback) {
      this.wanderTimer--;

      const distToPlayer = Math.sqrt(
        (px - this.centerX) ** 2 + (py - this.centerY) ** 2,
      );

      if (distToPlayer < this.aggroRange) {
        this.wanderTargetX = px;
        this.wanderTargetY = py;
        this.wanderTimer = 10;
      } else if (this.wanderTimer <= 0) {
        this._nuevoWander();
      }

      const tdx = this.wanderTargetX - this.centerX;
      const tdy = this.wanderTargetY - this.centerY;
      const tDist = Math.sqrt(tdx * tdx + tdy * tdy);

      if (tDist > 4) {
        const noiseX = Math.cos(this.wobble) * this.wobbleAmp;
        const noiseY = Math.sin(this.wobble * 0.7) * this.wobbleAmp;
        const dx = tdx / tDist + noiseX;
        const dy = tdy / tDist + noiseY;
        const d = Math.sqrt(dx * dx + dy * dy);
        this.x += (dx / d) * this.speed;
        this.y += (dy / d) * this.speed;
      } else if (distToPlayer >= this.aggroRange) {
        this._nuevoWander();
      }
    }

    this.x = Math.max(0, Math.min(WORLD_W - this.size, this.x));
    this.y = Math.max(0, Math.min(WORLD_H - this.size, this.y));

    const floatY = Math.sin(this.wobble * 2) * 2.5;
    this.el.style.transform = `translate(${this.x}px, ${this.y + floatY}px)`;

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer--;
      this.spriteEl.style.filter =
        this.hitFlashTimer > 4 ? "brightness(2.5)" : "brightness(1.3)";
      if (this.hitFlashTimer === 0) {
        this.spriteEl.style.filter = "";
      }
    }
  }

  mostrarDaño() {
    this.hpBar.style.display = "block";
    const pct = Math.max(0, (this.hp / this.maxHp) * 100);
    this.hpFill.style.width = pct + "%";
    if (pct > 50) this.hpFill.style.background = "#3f3";
    else if (pct > 25) this.hpFill.style.background = "#fc3";
    else this.hpFill.style.background = "#f33";
  }

  golpear(daño, playerCenterX, playerCenterY) {
    this.hp -= daño;
    this.hit = true;
    this.mostrarDaño();

    this.hitFlashTimer = 8;
    this.spriteEl.style.filter = "brightness(2.5)";

    const dx = this.centerX - playerCenterX;
    const dy = this.centerY - playerCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    this.knockbackVx = (dx / dist) * 7;
    this.knockbackVy = (dy / dist) * 7;
    this.stunTimer = 12;

    if (this.hp <= 0) {
      if (this._animInterval) clearInterval(this._animInterval);
      if (this._eyeInterval) clearInterval(this._eyeInterval);
      this.el.remove();
      return true;
    }
    return false;
  }

  eliminar() {
    if (this._animInterval) clearInterval(this._animInterval);
    if (this._eyeInterval) clearInterval(this._eyeInterval);
    this.el.remove();
  }
}

class EnemyManager {
  constructor(mundo) {
    this.enemies = [];
    this.mundo = mundo;
    this.onEnemyClick = null;
    this.getDaño = null;
    this.onDerrotado = null;
    this.playerX = 0;
    this.playerY = 0;
  }

  aparecer(cantidad, playerX, playerY, getDaño, onDerrotado) {
    this.getDaño = getDaño;
    this.onDerrotado = onDerrotado;
    for (let i = 0; i < cantidad; i++) {
      let x, y, intentos = 0;
      do {
        x = 20 + Math.random() * (WORLD_W - 84);
        y = 20 + Math.random() * (WORLD_H - 84);
        intentos++;
      } while (
        intentos < 30 &&
        (Math.abs(x - playerX) < 100 && Math.abs(y - playerY) < 100 ||
        this.enemies.some(
          (e) => Math.abs(e.x - x) < 70 && Math.abs(e.y - y) < 70,
        ))
      );
      const type = Math.random() < 0.55 ? "body" : "eye";
      const enemy = new Enemy(x, y, this.mundo, type);
      enemy.el.onclick = () => {
        if (this.onEnemyClick && !this.onEnemyClick(enemy)) return;
        if (enemy.golpear(getDaño(), this.playerX, this.playerY)) {
          this.enemies = this.enemies.filter((e) => e !== enemy);
          if (onDerrotado) onDerrotado();
        }
      };
      this.enemies.push(enemy);
    }
  }

  actualizar(playerX, playerY, playerSize, onPlayerHit) {
    this.playerX = playerX + playerSize / 2;
    this.playerY = playerY + playerSize / 2;
    this.enemies.forEach((enemy) => {
      enemy.moverHacia(this.playerX, this.playerY);
      const dx = enemy.centerX - this.playerX;
      const dy = enemy.centerY - this.playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 35 && onPlayerHit) {
        onPlayerHit(enemy);
      }
    });
  }

  eliminarTodos() {
    this.enemies.forEach((e) => e.eliminar());
    this.enemies = [];
  }
}

// ============================================================
//  MARKET
// ============================================================
class Market {
  constructor(acciones) {
    this.el = document.getElementById("mercado");
    this.menuEl = document.getElementById("menu-sprite");
    this.acciones = acciones;
    this._init();
  }

  get bottom() {
    return this.el.offsetTop + this.el.offsetHeight;
  }

  colisiona(x, y, size) {
    const margin = 4;
    const hbX = x + margin;
    const hbY = y + margin;
    const hbSize = size - margin * 2;
    const mX = MERCADO_X + MERCADO_OFFSET_X;
    const mY = MERCADO_Y + MERCADO_OFFSET_Y;
    const mW = MERCADO_W + MERCADO_OFFSET_W;
    const mH = MERCADO_H + MERCADO_OFFSET_H;

    return (
      hbX < mX + mW && hbX + hbSize > mX && hbY < mY + mH && hbY + hbSize > mY
    );
  }

  _init() {
    this.el.addEventListener("click", () => {
      this.menuEl.style.left = "140px";
      this.menuEl.style.top = "10px";
      this.menuEl.style.display = "block";
    });

    this.menuEl.addEventListener("click", (e) => {
      const y = e.offsetY;
      if (y >= 12 && y <= 30) this.acciones.mejorarArma();
      else if (y >= 34 && y <= 52) this.acciones.comprarCorazon();
      else if (y >= 56 && y <= 74) this.acciones.comprarPico();
      else if (y >= 78 && y <= 96) this.acciones.comprarEspada();
      else if (y >= 100 && y <= 110) this.acciones.cerrar();
    });

    document.addEventListener("click", (e) => {
      if (
        this.menuEl.style.display === "block" &&
        e.target !== this.menuEl &&
        e.target !== this.el
      ) {
        this.menuEl.style.display = "none";
      }
    });
  }
}

// ============================================================
//  MINIMAPA
// ============================================================
class Minimapa {
  constructor() {
    this.canvas = document.getElementById("minimapa-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.w = 100;
    this.h = 75;
    this.scale = WORLD_W / this.w;
    this.playerDot = 3;
    this.marketDot = 3;
  }

  dibujar(game) {
    const ctx = this.ctx;
    const s = this.scale;
    const w = this.w, h = this.h;

    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, w, h);

    const camX = Math.max(0, Math.min(WORLD_W - CAM_W, game.player.x + PLAYER_SIZE / 2 - CAM_W / 2));
    const camY = Math.max(0, Math.min(WORLD_H - CAM_H, game.player.y + PLAYER_SIZE / 2 - CAM_H / 2));

    // Camera viewport rectangle
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(camX / s, camY / s, CAM_W / s, CAM_H / s);

    // Blocks
    ctx.fillStyle = "rgba(200,180,80,0.5)";
    game.blockManager.blocks.forEach((b) => {
      ctx.fillRect(b.x / s, b.y / s, BLOCK_SIZE / s, BLOCK_SIZE / s);
    });

    // Market
    const mx = (MERCADO_X + 64) / s;
    const my = (MERCADO_Y + 64) / s;
    ctx.fillStyle = "#ff0";
    ctx.fillRect(mx - 1, my - 1, 3, 3);

    // Market indicator on minimap
    if (game.indicadorVisible) {
      ctx.strokeStyle = "#ffcc00";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(mx, my, Math.floor(Date.now() / 300) % 2 === 0 ? 5 : 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Enemies at night
    if (game.phase === "NOCHE") {
      game.enemyManager.enemies.forEach((enemy) => {
        ctx.fillStyle = "#f44";
        ctx.fillRect((enemy.x + 32) / s - 1, (enemy.y + 32) / s - 1, 2, 2);
      });
    }

    // Player
    const px = (game.player.x + 16) / s;
    const py = (game.player.y + 16) / s;
    ctx.fillStyle = "#4f4";
    ctx.fillRect(px - 1, py - 1, 3, 3);
  }
}

// ============================================================
//  GAME
// ============================================================
class Game {
  constructor() {
    this.started = false;
    this.mundo = document.getElementById("mundo");
    this.input = new Input();
    this.camera = new Camera(this.mundo);
    this.pickaxeLevel = -1;
    this.player = new Player(this.mundo, this.pickaxeLevel, -1);
    this.blockManager = new BlockManager(this.mundo);
    this.enemyManager = new EnemyManager(this.mundo);
    this.hud = new HUD();

    this.phase = "DIA";
    this.night = 0;
    this.gold = 0;
    this.activeTool = "pickaxe";
    this.invulnTimer = 0;
    this.mensajeEl = document.getElementById("mensaje");
    this.mensajeTexto = document.getElementById("mensaje-texto");
    this.indicadorMercado = document.getElementById("indicador-mercado");
    this.indicadorVisible = false;
    this.paused = false;
    this.messageActive = false;
    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && this.messageActive) {
        this._ocultarMensaje();
        return;
      }
      if (e.key === "1" && this.player.pickaxeLevel >= 0) {
        this.activeTool = "pickaxe";
        this._actualizarSlots();
      }
      if (e.key === "2" && this.player.swordLevel >= 0) {
        this.activeTool = "sword";
        this._actualizarSlots();
      }
    });

    document.getElementById("interfaz").style.display = "none";

    const mejor = localStorage.getItem("mejorNoche");
    if (mejor) {
      document.getElementById("mejor-noche").innerText = mejor;
    }

    document.getElementById("btn-jugar").addEventListener("click", () => {
      document.getElementById("menu-inicio").style.display = "none";
      document.getElementById("pantalla-juego").style.display = "";
      document.getElementById("interfaz").style.display = "";
      this.started = true;
      this._init();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const muerteVisible =
          document.getElementById("pantalla-muerte").style.display === "flex";
        if (muerteVisible) {
          location.reload();
        }
      }
    });

    this.minimapa = new Minimapa();
    this.market = new Market({
      mejorarArma: () => {},
      comprarCorazon: () => {
        if (this.gold < 5) {
          this.mostrarMensaje("Necesitas 5 de oro.");
          return;
        }
        this.gold -= 5;
        this.hud.actualizarOro(this.gold);
        this.player.aumentarVidaMax();
        this.hud.actualizarCorazones(this.player.hp, this.player.maxHp);
        this.market.menuEl.style.display = "none";
      },
      comprarPico: () => {
        const current = this.player.pickaxeLevel;
        if (current >= PICKAXE_TIERS.length - 1) {
          this.mostrarMensaje("¡Ya tienes el pico de Rubí, el máximo nivel!");
          return;
        }
        const nextLevel = current + 1;
        const cost = PICKAXE_COSTS[nextLevel];
        if (this.gold < cost) {
          this.mostrarMensaje(
            `Necesitas ${cost} de oro para el pico de ${PICKAXE_NAMES[nextLevel]}.`,
          );
          return;
        }
        this.gold -= cost;
        this.hud.actualizarOro(this.gold);
        this.player.setPickaxeLevel(nextLevel);
        this._actualizarSlots();
        this.indicadorMercado.style.display = "none";
        this.indicadorVisible = false;
        this.mostrarMensaje(`¡Pico mejorado a ${PICKAXE_NAMES[nextLevel]}!`);
        this.market.menuEl.style.display = "none";
      },
      comprarEspada: () => {
        const current = this.player.swordLevel;
        if (current >= SWORD_DMG.length - 1) {
          this.mostrarMensaje("¡Ya tienes la Espada++, máximo nivel!");
          return;
        }
        const nextLevel = current + 1;
        const cost = SWORD_COSTS[nextLevel];
        if (this.gold < cost) {
          this.mostrarMensaje(
            `Necesitas ${cost} de oro para ${SWORD_NAMES[nextLevel]}.`,
          );
          return;
        }
        this.gold -= cost;
        this.hud.actualizarOro(this.gold);
        this.player.setSwordLevel(nextLevel);
        this.mostrarMensaje(`¡Espada mejorada a ${SWORD_NAMES[nextLevel]}!`);
        this._actualizarSlots();
        this.market.menuEl.style.display = "none";
        if (nextLevel === 0) {
          this.activeTool = "sword";
          this._actualizarSlots();
        }
      },
      cerrar: () => {
        this.market.menuEl.style.display = "none";
      },
    });

    this.blockManager.onBlockClick = (block) => this._onBlockClick(block);
    this.enemyManager.onEnemyClick = () => {
      if (this.activeTool !== "sword") return false;
      this.player.animarEspada(this.player.dir);
      return true;
    };

    document.getElementById("slot-pico").addEventListener("click", () => {
      if (this.player.pickaxeLevel < 0) return;
      this.activeTool = "pickaxe";
      this._actualizarSlots();
    });
    document.getElementById("slot-espada").addEventListener("click", () => {
      if (this.player.swordLevel < 0) return;
      this.activeTool = "sword";
      this._actualizarSlots();
    });

    document.getElementById("btn-dormir").addEventListener("click", () => {
      if (this.phase === "DIA") this.cambiarFase("NOCHE");
    });

    document.getElementById("mercado").addEventListener("click", () => {
      this.indicadorMercado.style.display = "none";
      this.indicadorVisible = false;
    });

    document.getElementById("btn-reanudar").addEventListener("click", () => {
      document.getElementById("pantalla-pausa").style.display = "none";
      this.paused = false;
    });

    document.getElementById("btn-reiniciar").addEventListener("click", () => {
      location.reload();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.started) {
        const pausa = document.getElementById("pantalla-pausa");
        const showing = pausa.style.display === "flex";
        pausa.style.display = showing ? "none" : "flex";
        this.paused = !showing;
      }
    });

    this._actualizarSlots();
  }

  _init() {
    this.blockManager.generar(this.player.x, this.player.y);
    this.hud.actualizarCorazones(this.player.hp, this.player.maxHp);
    this.hud.actualizarFase(this.phase);
    this._bucle();
  }

  _bucle() {
    this._actualizar();
    requestAnimationFrame(() => this._bucle());
  }

  _actualizar() {
    if (!this.started || this.paused) return;
    if (!this.player.isMining && !this.player.isAttacking) {
      let dx = 0,
        dy = 0;
      let dir = this.player.dir;

      if (this.input.isDown("w")) {
        dy = -MOVE_SPEED;
        dir = "up";
      }
      if (this.input.isDown("s")) {
        dy = MOVE_SPEED;
        dir = "down";
      }
      if (this.input.isDown("a")) {
        dx = -MOVE_SPEED;
        dir = "left";
      }
      if (this.input.isDown("d")) {
        dx = MOVE_SPEED;
        dir = "right";
      }

      if (dx !== 0 || dy !== 0) {
        const newX = this.player.getMoveX(dx);
        const newY = this.player.getMoveY(dy);
        const phaseOk = this.phase !== "NOCHE";

        if (
          (!phaseOk || !this.blockManager.colisiona(newX, newY, PLAYER_SIZE)) &&
          !this.market.colisiona(newX, newY, PLAYER_SIZE)
        ) {
          this.player.moveTo(newX, newY);
          this.player.setDir(dir);
        }
      }
    }

    if (this.invulnTimer > 0) {
      this.invulnTimer--;
      const blink = Math.floor(this.invulnTimer / 3) % 2;
      this.player.el.style.opacity = blink ? "0.2" : "1";
      this.player.el.style.filter =
        this.invulnTimer > 24 ? "brightness(2) saturate(0)" : "";
    } else {
      this.player.el.style.opacity = "1";
      this.player.el.style.filter = "";
    }

    if (this.phase === "NOCHE") {
      this.enemyManager.actualizar(
        this.player.x,
        this.player.y,
        PLAYER_SIZE,
        (enemy) => {
          if (this.invulnTimer > 0) return;
          this.player.hp--;
          this.hud.actualizarCorazones(this.player.hp, this.player.maxHp);
          this.invulnTimer = 30;
          this.player.el.style.filter = "brightness(3) saturate(0)";
          if (this.player.hp <= 0) {
            this._morir();
          }
        },
      );
    }

    if (this.indicadorVisible) {
      const cCamX = Math.max(0, Math.min(WORLD_W - CAM_W, this.player.x + PLAYER_SIZE / 2 - CAM_W / 2));
      const cCamY = Math.max(0, Math.min(WORLD_H - CAM_H, this.player.y + PLAYER_SIZE / 2 - CAM_H / 2));
      const mx = MERCADO_X - cCamX;
      const my = MERCADO_Y - cCamY;
      if (mx > -24 && mx < CAM_W + 24 && my > -24 && my < CAM_H + 24) {
        this.indicadorMercado.style.display = "";
        this.indicadorMercado.style.left = (Math.max(0, mx) + 46) + "px";
        this.indicadorMercado.style.top = (Math.max(0, my) + 46) + "px";
      } else {
        this.indicadorMercado.style.display = "none";
      }
    }

    this.camera.follow(this.player.x, this.player.y, PLAYER_SIZE);
    this._ordenY();
    this.minimapa.dibujar(this);
  }

  _ordenY() {
    const items = [];
    items.push({ el: this.player.el, z: Math.floor(this.player.bottom) });
    items.push({ el: this.player.sombra, z: Math.floor(this.player.bottom) - 1 });
    items.push({ el: this.market.el, z: Math.floor(this.market.bottom) });
    this.blockManager.blocks.forEach((b) =>
      items.push({ el: b.el, z: Math.floor(b.bottom) }),
    );
    this.enemyManager.enemies.forEach((e) =>
      items.push({ el: e.el, z: Math.floor(e.bottom) }),
    );
    items.sort((a, b) => a.z - b.z);
    items.forEach((item, i) => (item.el.style.zIndex = i + 2));
  }

  _onBlockClick(block) {
    if (this.player.isMining) return;
    if (this.activeTool !== "pickaxe") return;
    if (this.phase !== "DIA") return;
    if (this.player.pickaxeLevel < 0) {
      this.mostrarMensaje("Necesitas un pico. ¡Compra uno en el mercado!");
      this.indicadorMercado.style.display = "flex";
      this.indicadorVisible = true;
      return;
    }
    if (block.hp <= 0) return;

    const damage = PICKAXE_DMG[this.player.pickaxeLevel];
    const golpeOk = this.blockManager.golpear(
      block,
      this.player.centerX,
      this.player.centerY,
      damage,
      (daño) => {
        this.gold += daño;
        this.hud.actualizarOro(this.gold);
        if (this.gold >= 10 && this.player.swordLevel < 0) {
          this.mostrarMensaje(
            "¡Ya tienes suficiente oro! Compra una espada antes de dormir.",
          );
        }
      },
    );

    if (golpeOk) {
      this.player.animarMinería(this.player.dir, block.x, block.y);
    }
  }

  mostrarMensaje(texto) {
    this.mensajeTexto.innerText = texto;
    this.mensajeEl.style.display = "flex";
    this.messageActive = true;
  }

  _ocultarMensaje() {
    this.mensajeEl.style.display = "none";
    this.messageActive = false;
  }

  _morir() {
    this.started = false;
    document.getElementById("pantalla-muerte").style.display = "flex";
    document.getElementById("muerte-noche").innerText = this.night;
    const mejor = localStorage.getItem("mejorNoche");
    if (!mejor || this.night > parseInt(mejor)) {
      localStorage.setItem("mejorNoche", this.night);
    }
  }

  _actualizarSlots() {
    const slotPico = document.getElementById("slot-pico");
    const slotEspada = document.getElementById("slot-espada");
    slotPico.style.display = this.player.pickaxeLevel >= 0 ? "block" : "none";
    slotEspada.style.display = this.player.swordLevel >= 0 ? "block" : "none";
    const tier = PICKAXE_TIERS[Math.max(0, this.player.pickaxeLevel)] || "brz";
    slotPico.style.backgroundImage = `url('sprites/pickaxe/${tier}_pickaxe.png')`;
    slotEspada.style.backgroundImage = "url('sprites/attack/sword.png')";
    slotEspada.style.backgroundSize = "32px 32px";
    slotPico.classList.toggle("slot-activo", this.activeTool === "pickaxe");
    slotEspada.classList.toggle("slot-activo", this.activeTool === "sword");
    this.player.setActiveTool(this.activeTool);
  }

  cambiarFase(nuevaFase) {
    this.phase = nuevaFase;
    this.hud.actualizarFase(nuevaFase);

    if (nuevaFase === "NOCHE") {
      this.night++;
      this.blockManager.eliminarTodos();
      this.enemyManager.eliminarTodos();
      const cantidad = 10 + this.night * 5;
      const totalEnemies = cantidad;
      let derrotados = 0;
      this.enemyManager.aparecer(
        cantidad,
        this.player.x,
        this.player.y,
        () => SWORD_DMG[Math.max(0, this.player.swordLevel)],
        () => {
          derrotados++;
          if (derrotados >= totalEnemies && this.phase === "NOCHE") {
            this.enemyManager.eliminarTodos();
            this.mostrarMensaje("¡Noche superada! Vuelve el amanecer.");
            this.cambiarFase("DIA");
            this.blockManager.generar(this.player.x, this.player.y);
          }
        },
      );
      this.mostrarMensaje(
        `¡Noche ${this.night}! Derrota a ${totalEnemies} enemigo${totalEnemies > 1 ? "s" : ""}.`,
      );
    }
  }
}
// Arrancar el juego cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => new Game());
