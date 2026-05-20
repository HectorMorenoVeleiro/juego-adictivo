// ============================================================
//  CONSTANTS
// ============================================================
const MOVE_SPEED     = 2;
const MINE_RANGE     = 80;
const BLOCK_SIZE     = 32;
const BLOCK_HITBOX   = 5;
const WORLD_W        = 1200;
const WORLD_H        = 900;
const CAM_W          = 500;
const CAM_H          = 200;

const MERCADO_X        = 10;
const MERCADO_Y        = 10;
const MERCADO_W        = 64;
const MERCADO_H        = 64;
const MERCADO_OFFSET_X = 0;
const MERCADO_OFFSET_Y = 0;
const MERCADO_OFFSET_W = 0;
const MERCADO_OFFSET_H = 0;

const PLAYER_START_X  = 100;
const PLAYER_START_Y  = 316;
const PLAYER_SIZE     = 32;
const PLAYER_VISUAL_H = 64;
const PLAYER_HP       = 5;


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
        this.oroEl       = document.getElementById("oro");
        this.faseEl      = document.getElementById("fase-actual");
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
    constructor(worldEl) {
        this.x        = PLAYER_START_X;
        this.y        = PLAYER_START_Y;
        this.dir      = "down";
        this.hp       = PLAYER_HP;
        this.maxHp    = PLAYER_HP;
        this.isMining = false;
        this.size     = PLAYER_SIZE;

        this.el      = document.getElementById("jugador");
        this.sombra  = this._crearSombra(worldEl);
        this.pickaxe = this._crearPico(worldEl);
        this._render();
    }

    get bottom()  { return this.el.offsetTop + this.el.offsetHeight; }
    get centerX() { return this.x + this.size / 2; }
    get centerY() { return this.y + this.size / 2; }

    _crearSombra(worldEl) {
        const s = document.createElement("div");
        s.classList.add("sombra");
        s.style.width   = "220px";
        s.style.height  = "80px";
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
        this.el.style.left            = this.x + "px";
        this.el.style.top             = this.y + "px";
        this.el.style.backgroundImage = `url('sprites/char/char_${this.dir}.png')`;
        this.sombra.style.left        = (this.x - 7.9) + "px";
        this.sombra.style.top         = this.y + "px";
    }

    moveTo(newX, newY) {
        this.x = newX;
        this.y = newY;
        this._render();
    }

    setDir(dir) {
        this.dir = dir;
        this.el.style.backgroundImage = `url('sprites/char/char_${dir}.png')`;
    }

    getMoveX(dx) { return Math.max(0, Math.min(WORLD_W - this.size, this.x + dx)); }
    getMoveY(dy) { return Math.max(0, Math.min(WORLD_H - this.size, this.y + dy)); }

    animarMinería(dir, onDone) {
        this.dir      = dir;
        this.isMining = true;
        let frame     = 1;

        const offsets   = { down: { x: 2, y: 23 }, up: { x: 0, y: -20 }, left: { x: -15, y: 5 }, right: { x: 15, y: 0 } };
        const rotations = { down: 90, up: 270, left: 180, right: 0 };
        const off       = offsets[dir] || { x: 0, y: 0 };

        this.pickaxe.style.left            = (this.x + off.x) + "px";
        this.pickaxe.style.top             = (this.y + off.y) + "px";
        this.pickaxe.style.display         = "block";
        this.pickaxe.style.backgroundImage = "url('sprites/pickaxe/pickaxe1.png')";
        this.pickaxe.style.transform       = `rotate(${rotations[dir]}deg)`;

        const anim = setInterval(() => {
            frame++;
            if (frame > 4) {
                clearInterval(anim);
                this.pickaxe.style.display = "none";
                this.isMining = false;
                if (onDone) onDone();
            } else {
                this.pickaxe.style.backgroundImage = `url('sprites/pickaxe/pickaxe${frame}.png')`;
            }
        }, 100);
    }

    curar(cantidad)      { this.hp = Math.min(this.maxHp, this.hp + cantidad); }
    aumentarVidaMax()    { this.maxHp++; this.curar(1); }
}


// ============================================================
//  BLOCK
// ============================================================
class Block {
    constructor(x, y, mundo) {
        this.x     = x;
        this.y     = y;
        this.hp    = 3;
        this.maxHp = 3;
        this.hit   = false;

        this.el           = document.createElement("div");
        this.el.className = "block";
        this.el.style.left = x + "px";
        this.el.style.top  = y + "px";

        this.hpBar           = document.createElement("div");
        this.hpBar.className = "block-hp";
        this.hpBar.style.display = "none";

        this.hpFill           = document.createElement("div");
        this.hpFill.className = "block-hp-fill";
        this.hpBar.appendChild(this.hpFill);
        this.el.appendChild(this.hpBar);

        mundo.appendChild(this.el);
    }

    get bottom()  { return this.el.offsetTop + this.el.offsetHeight; }
    get centerX() { return this.x + BLOCK_SIZE / 2; }
    get centerY() { return this.y + BLOCK_SIZE / 2; }

    eliminar() { this.el.remove(); }
}

class BlockManager {
    constructor(mundo) {
        this.blocks = [];
        this.mundo  = mundo;
    }

    generar(playerX, playerY) {
        const posiciones = [];
        const cantidad   = (Math.random() * 2) + 10;

        for (let i = 0; i < cantidad; i++) {
            let x, y, intentos = 0;
            do {
                x = 4 + Math.random() * (WORLD_W - BLOCK_SIZE - 8);
                y = 4 + Math.random() * (WORLD_H - BLOCK_SIZE - 8);
                intentos++;
            } while (
                intentos < 100 &&
                (posiciones.some(p =>
                    x < p.x + BLOCK_SIZE + 4 &&
                    x + BLOCK_SIZE + 4 > p.x &&
                    y < p.y + BLOCK_SIZE + 4 &&
                    y + BLOCK_SIZE + 4 > p.y
                ) ||
                Math.abs(x + BLOCK_SIZE / 2 - (playerX + 32)) < 80 &&
                Math.abs(y + BLOCK_SIZE / 2 - (playerY + 32)) < 80)
            );
            posiciones.push({ x, y });
        }

        posiciones.forEach(pos => {
            const block = new Block(pos.x, pos.y, this.mundo);
            block.el.onclick = () => {
                if (this.onBlockClick) this.onBlockClick(block);
            };
            this.blocks.push(block);
        });
    }

    getBlockByEl(el) { return this.blocks.find(b => b.el === el); }

    colisiona(x, y, size) {
        const margin  = 4;
        const hbX     = x + margin;
        const hbY     = y + margin;
        const hbSize  = size - (margin * 2);
        const OFFSET_X = -10, OFFSET_Y = -10, HB_W = 20.5, HB_H = 30;

        return this.blocks.some(b =>
            hbX          < b.x + OFFSET_X + HB_W &&
            hbX + hbSize > b.x + OFFSET_X         &&
            hbY          < b.y + OFFSET_Y + HB_H  &&
            hbY + hbSize > b.y + OFFSET_Y
        );
    }

    golpear(block, playerCenterX, playerCenterY, daño, onMined) {
        const dist = Math.sqrt(
            (playerCenterX - block.centerX) ** 2 +
            (playerCenterY - block.centerY) ** 2
        );
        if (dist > MINE_RANGE) return false;

        if (!block.hit) {
            block.hit = true;
            block.hpBar.style.display = "block";
        }

        block.hp -= daño;
        const pct = (block.hp / block.maxHp) * 100;
        block.hpFill.style.width = pct + "%";

        if      (block.hp <= 1) block.hpFill.style.background = "#f33";
        else if (block.hp <= 2) block.hpFill.style.background = "#fc3";

        if (block.hp <= 0) {
            block.eliminar();
            this.blocks = this.blocks.filter(b => b !== block);
            if (onMined) onMined(daño);
        }
        return true;
    }

    eliminarTodos() {
        this.blocks.forEach(b => b.eliminar());
        this.blocks = [];
    }
}


// ============================================================
//  ENEMY
// ============================================================
class Enemy {
    constructor(x, y, mundo) {
        this.el = document.createElement("div");
        this.el.classList.add("sprite", "enemigo");
        this.el.style.left     = x + "px";
        this.el.style.top      = y + "px";
        this.el.style.position = "absolute";
        mundo.appendChild(this.el);
        this.hp = 5;
    }

    get bottom() { return this.el.offsetTop + this.el.offsetHeight; }

    recibirDaño(cantidad) {
        this.hp -= cantidad;
        if (this.hp <= 0) { this.el.remove(); return true; }
        return false;
    }
}

class EnemyManager {
    constructor(mundo) {
        this.enemies = [];
        this.mundo   = mundo;
    }

    aparecer(x, y, getDaño, onDerrotado) {
        const enemy = new Enemy(x, y, this.mundo);
        enemy.el.onclick = () => {
            if (enemy.recibirDaño(getDaño())) {
                this.enemies = this.enemies.filter(e => e !== enemy);
                if (onDerrotado) onDerrotado();
            }
        };
        this.enemies.push(enemy);
        return enemy;
    }
}


// ============================================================
//  MARKET
// ============================================================
class Market {
    constructor(acciones) {
        this.el       = document.getElementById("mercado");
        this.menuEl   = document.getElementById("menu-sprite");
        this.acciones = acciones;
        this._init();
    }

    get bottom() { return this.el.offsetTop + this.el.offsetHeight; }

    colisiona(x, y, size) {
        const margin = 4;
        const hbX    = x + margin;
        const hbY    = y + margin;
        const hbSize = size - (margin * 2);
        const mX     = MERCADO_X + MERCADO_OFFSET_X;
        const mY     = MERCADO_Y + MERCADO_OFFSET_Y;
        const mW     = MERCADO_W + MERCADO_OFFSET_W;
        const mH     = MERCADO_H + MERCADO_OFFSET_H;

        return hbX          < mX + mW &&
               hbX + hbSize > mX      &&
               hbY          < mY + mH &&
               hbY + hbSize > mY;
    }

    _init() {
        this.el.addEventListener("click", () => {
            this.menuEl.style.left    = "140px";
            this.menuEl.style.top     = "10px";
            this.menuEl.style.display = "block";
        });

        this.menuEl.addEventListener("click", (e) => {
            const y = e.offsetY;
            if      (y >= 12  && y <= 30)  this.acciones.mejorarArma();
            else if (y >= 34  && y <= 52)  this.acciones.comprarCorazon();
            else if (y >= 56  && y <= 74)  this.acciones.comprarPico();
            else if (y >= 78  && y <= 96)  this.acciones.comprarEspada();
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
//  GAME
// ============================================================
class Game {
    constructor() {
        this.mundo        = document.getElementById("mundo");
        this.input        = new Input();
        this.camera       = new Camera(this.mundo);
        this.player       = new Player(this.mundo);
        this.blockManager = new BlockManager(this.mundo);
        this.enemyManager = new EnemyManager(this.mundo);
        this.hud          = new HUD();

        this.phase        = "DIA";
        this.gold         = 0;
        this.weaponDamage = 1;
        this.hasSword     = false;
        this.hasPickaxe   = false;

        this.market = new Market({
            mejorarArma: () => {
                this.weaponDamage++;
                alert(`⚔️ ¡Daño de espada aumentado a ${this.weaponDamage}!`);
                this.market.menuEl.style.display = "none";
            },
            comprarCorazon: () => {
                if (this.gold < 5) { alert("Necesitas 5 de oro."); return; }
                this.gold -= 5;
                this.hud.actualizarOro(this.gold);
                this.player.aumentarVidaMax();
                this.hud.actualizarCorazones(this.player.hp, this.player.maxHp);
                this.market.menuEl.style.display = "none";
            },
            comprarPico: () => {
                if (this.hasPickaxe) { alert("¡Ya tienes un pico!"); return; }
                this.hasPickaxe = true;
                alert("⛏️ ¡Pico recogido! Ahora puedes picar bloques.");
                this.market.menuEl.style.display = "none";
            },
            comprarEspada: () => {
                if (this.hasSword) { alert("¡Ya tienes espada!"); return; }
                if (this.gold < 10) { alert("Necesitas 10 de oro."); return; }
                this.gold -= 10;
                this.hud.actualizarOro(this.gold);
                this.weaponDamage = 3;
                this.hasSword     = true;
                alert("⚔️ ¡Espada comprada! Los ruidos se intensifican...");
                this.market.menuEl.style.display = "none";
                this.cambiarFase("NOCHE");
            },
            cerrar: () => {
                this.market.menuEl.style.display = "none";
            }
        });

        this.blockManager.onBlockClick = (block) => this._onBlockClick(block);

        document.getElementById("btn-dormir").addEventListener("click", () => {
            if (this.phase === "DIA") this.cambiarFase("NOCHE");
        });

        this._init();
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
        if (!this.player.isMining) {
            let dx = 0, dy = 0;
            let dir = this.player.dir;

            if (this.input.isDown("w")) { dy = -MOVE_SPEED; dir = "up"; }
            if (this.input.isDown("s")) { dy =  MOVE_SPEED; dir = "down"; }
            if (this.input.isDown("a")) { dx = -MOVE_SPEED; dir = "left"; }
            if (this.input.isDown("d")) { dx =  MOVE_SPEED; dir = "right"; }

            if (dx !== 0 || dy !== 0) {
                const newX    = this.player.getMoveX(dx);
                const newY    = this.player.getMoveY(dy);
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

        this.camera.follow(this.player.x, this.player.y, PLAYER_SIZE);
        this._ordenY();
    }

    _ordenY() {
        const items = [];
        items.push({ el: this.player.el,    z: this.player.bottom });
        items.push({ el: this.player.sombra, z: this.player.bottom - 1 });
        items.push({ el: this.market.el,    z: this.market.bottom });
        this.blockManager.blocks.forEach(b  => items.push({ el: b.el, z: b.bottom }));
        this.enemyManager.enemies.forEach(e => items.push({ el: e.el, z: e.bottom }));
        items.sort((a, b) => a.z - b.z);
        items.forEach((item, i) => item.el.style.zIndex = i + 2);
    }

    _onBlockClick(block) {
        if (this.player.isMining)  return;
        if (this.phase !== "DIA")  return;
        if (!this.hasPickaxe) { alert("Necesitas un pico. ¡Compra uno en el mercado!"); return; }
        if (block.hp <= 0)         return;

        const golpeOk = this.blockManager.golpear(
            block,
            this.player.centerX, this.player.centerY,
            1,
            (daño) => {
                this.gold += daño;
                this.hud.actualizarOro(this.gold);
                if (this.gold >= 10 && !this.hasSword) {
                    alert("¡Se hace de noche! Compra un arma rápido antes de que aparezcan los monstruos.");
                }
            }
        );

        if (golpeOk) {
            this.player.animarMinería(this.player.dir);
        }
    }

    cambiarFase(nuevaFase) {
        this.phase = nuevaFase;
        this.hud.actualizarFase(nuevaFase);

        if (nuevaFase === "NOCHE") {
            this.blockManager.eliminarTodos();
            this.enemyManager.aparecer(
                this.player.x + 150,
                this.player.y,
                () => this.weaponDamage,
                () => {
                    alert("¡Monstruo derrotado! Vuelve el amanecer.");
                    this.cambiarFase("DIA");
                    this.blockManager.generar(this.player.x, this.player.y);
                }
            );
        }
    }
}
-e 
// Arrancar el juego cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => new Game());