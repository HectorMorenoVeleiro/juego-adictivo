// Variables de estado
let oro = 0;
let fase = "DIA";
let dañoPico = 1;
let dañoArma = 1;
let tieneEspada = false;
let isMining = false;
let playerHp = 5;
let maxPlayerHp = 5;

// Posición del jugador
let playerX = 100;
let playerY = 316;
let playerDir = "down";
const MOVE_SPEED = 2;
const MINE_RANGE = 80;
const BLOCK_SIZE = 32;
const BLOCK_HITBOX = 5;
const mundo = document.getElementById("mundo");
const WORLD_W = 1200;
const WORLD_H = 900;
const CAM_W = 500;
const CAM_H = 200;

// Bloques
let blocks = [];

// Elementos del DOM
const txtOro = document.getElementById("oro");
const txtFase = document.getElementById("fase-actual");
const pantalla = document.getElementById("pantalla-juego");
const jugador = document.getElementById("jugador");

// Elemento pico para la animación
const pickaxe = document.createElement("div");
pickaxe.classList.add("pickaxe");
mundo.appendChild(pickaxe);

// Inicializar jugador
jugador.style.left = playerX + "px";
jugador.style.top = playerY + "px";
jugador.style.backgroundImage = "url('sprites/char/char_down.png')";

// --- NUEVO: Inicializar sombra del jugador ---
const sombraJugador = document.createElement("div");
sombraJugador.classList.add("sombra");
// Ajustamos el tamaño de la sombra del jugador (ej: un óvalo de 32x12 píxeles)
sombraJugador.style.width = "32px";
sombraJugador.style.height = "12px";
mundo.appendChild(sombraJugador);

// Inicializar corazones
function actualizarCorazones() {
    const contenedor = document.getElementById("corazones");
    contenedor.innerHTML = "";
    for (let i = 0; i < maxPlayerHp; i++) {
        const span = document.createElement("span");
        span.className = "corazon" + (i < playerHp ? "" : " vacio");
        span.textContent = "♥";
        contenedor.appendChild(span);
    }
}
actualizarCorazones();

// --- GENERAR BLOQUES ---
function generarBloques() {
    const posiciones = [];
    const cantidad = (Math.random() * 2 ) + 10;

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
        const el = document.createElement("div");
        el.className = "block";
        el.style.left = pos.x + "px";
        el.style.top = pos.y + "px";

        const hpBar = document.createElement("div");
        hpBar.className = "block-hp";
        hpBar.style.display = "none";
        const hpFill = document.createElement("div");
        hpFill.className = "block-hp-fill";
        hpBar.appendChild(hpFill);
        el.appendChild(hpBar);

        el.onclick = () => {
            const b = blocks.find(bl => bl.element === el);
            if (b) golpearBloque(b);
        };

        mundo.appendChild(el);
        blocks.push({
            x: pos.x,
            y: pos.y,
            hp: 3,
            maxHp: 3,
            hit: false,
            element: el,
            hpBar: hpBar,
            hpFill: hpFill
        });
    });
}

generarBloques();

// --- MOVIMIENTO WASD Y COLISIONES CORREGIDAS ---
const keys = {};

document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    keys[key] = true;
    if (["w", "a", "s", "d"].includes(key)) {
        e.preventDefault();
    }
});

document.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
});

function colisionaConBloques(x, y, size) {
    // Si es de noche, no hay bloques físicos estorbando
    if (fase === "NOCHE") return false;

    const margin = 4; 
    const hbX = x + margin;
    const hbY = y + margin;
    const hbSize = size - (margin * 2);

    return blocks.some(b =>
        hbX < b.x + BLOCK_SIZE &&
        hbX + hbSize > b.x &&
        hbY < b.y + BLOCK_SIZE && 
        hbY + hbSize > b.y
    );
}

function update() {
    if (!isMining) {
        let dx = 0, dy = 0;
        let dir = playerDir;

        if (keys["w"]) { dy = -MOVE_SPEED; dir = "up"; }
        if (keys["s"]) { dy = MOVE_SPEED; dir = "down"; }
        if (keys["a"]) { dx = -MOVE_SPEED; dir = "left"; }
        if (keys["d"]) { dx = MOVE_SPEED; dir = "right"; }

        if (dx !== 0 || dy !== 0) {
            // Cambiado a 32 (el tamaño real del sprite del jugador)
            let newX = Math.max(0, Math.min(WORLD_W - 32, playerX + dx));
            let newY = Math.max(0, Math.min(WORLD_H - 32, playerY + dy));

            // Comprobamos la colisión usando el tamaño correcto de 32x32
            if (!colisionaConBloques(newX, newY, 32)) {
                playerX = newX;
                playerY = newY;
                playerDir = dir;

                jugador.style.left = playerX + "px";
                jugador.style.top = playerY + "px";
                jugador.style.backgroundImage = "url('sprites/char/char_" + dir + ".png')";

                // --- NUEVO: Mover la sombra a los pies del jugador ---
                // Tu jugador mide 64x64, sumamos 16 a la X para centrar una sombra de 32px.
                // Sumamos 54 a la Y para colocarla justo en la base del sprite.
                sombraJugador.style.left = (playerX + 16) + "px";
                sombraJugador.style.top = (playerY + 54) + "px";
            }
        }
    }

    // Actualizar la cámara en cada frame para que el scroll sea suave
    actualizarCamara();

    requestAnimationFrame(update);
}

update();

function actualizarCamara() {
    // Centro de la cámara sobre el jugador
    let camX = playerX + 32 - CAM_W / 2;
    let camY = playerY + 32 - CAM_H / 2;

    // Limitar para no salirse del mundo
    camX = Math.max(0, Math.min(WORLD_W - CAM_W, camX));
    camY = Math.max(0, Math.min(WORLD_H - CAM_H, camY));

    // Mover el mundo en dirección contraria
    mundo.style.transform = `translate(${-camX}px, ${-camY}px)`;
}

// --- GOLPEAR BLOQUE ---
function golpearBloque(block) {
    if (isMining) return; 
    if (fase !== "DIA") return;
    if (block.hp <= 0) return;

    // Comprobar proximidad
    const pcx = playerX + 32;
    const pcy = playerY + 32;
    const bcx = block.x + BLOCK_SIZE / 2;
    const bcy = block.y + BLOCK_SIZE / 2;
    const dist = Math.sqrt((pcx - bcx) ** 2 + (pcy - bcy) ** 2);

    if (dist > MINE_RANGE) return;

    // Mostrar barra de vida al primer golpe
    if (!block.hit) {
        block.hit = true;
        block.hpBar.style.display = "block";
    }

    // Animación del pico
    isMining = true;
    let frame = 1;

    const offsets = {
        down: { x: 2, y: 23 },
        up: { x:0, y: -20 },
        left: { x: -15, y: 5 },
        right: { x: 15, y: 0 }
    };

    const rotations = {
        down: 90,
        up: 270,
        left: 180,
        right: 0
    };

    const off = offsets[playerDir] || { x: 0, y: 0 };
    pickaxe.style.left = (playerX + off.x) + "px";
    pickaxe.style.top = (playerY + off.y) + "px";
    pickaxe.style.display = "block";
    pickaxe.style.backgroundImage = "url('sprites/pickaxe/pickaxe1.png')";
    pickaxe.style.transform = "rotate(" + rotations[playerDir] + "deg)";

    const anim = setInterval(() => {
        frame++;
        if (frame > 4) {
            clearInterval(anim);
            pickaxe.style.display = "none";
            isMining = false;
        } else {
            pickaxe.style.backgroundImage = "url('sprites/pickaxe/pickaxe" + frame + ".png')";
        }
    }, 100);

    // Dañar bloque usando el poder del pico actual
    block.hp -= dañoPico;
    const pct = (block.hp / block.maxHp) * 100;
    block.hpFill.style.width = pct + "%";

    if (block.hp <= 1) {
        block.hpFill.style.background = "#f33";
    } else if (block.hp <= 2) {
        block.hpFill.style.background = "#fc3";
    }

    if (block.hp <= 0) {
        block.element.remove();
        blocks = blocks.filter(b => b !== block);
        oro += dañoPico;
        txtOro.innerText = oro;

        if (oro >= 10 && !tieneEspada) {
            alert("¡Se hace de noche! Compra un arma rápido antes de que aparezcan los monstruos.");
        }
    }
}


function cambiarFase(nuevaFase) {
    fase = nuevaFase;
    txtFase.innerText = fase;

    if (fase === "NOCHE") {
        // Eliminamos los bloques del mapa y limpiamos el array para que no estorben
        blocks.forEach(b => b.element.remove());
        blocks = [];
        aparecerEnemigo();
    }
}

function aparecerEnemigo() {
    const enemigo = document.createElement("div");
    enemigo.classList.add("sprite", "enemigo");

    // Spawnear al enemigo un poco alejado del jugador (ej. 150px a la derecha)
    enemigo.style.left = (playerX + 150) + "px";
    enemigo.style.top = playerY + "px";
    enemigo.style.position = "absolute"; // Asegúrate de que tu CSS use absolute

    let vidaEnemigo = 5;
    enemigo.onclick = function() {
        vidaEnemigo -= dañoArma;
        if (vidaEnemigo <= 0) {
            enemigo.remove();
            alert("¡Monstruo derrotado! Vuelve el amanecer.");
            // Al volver el día, regeneramos bloques para que el bucle continúe
            cambiarFase("DIA");
            generarBloques(); 
        }
    };

    mundo.appendChild(enemigo);
}
// --- MERCADO ---
const mercadoSprite = document.getElementById("mercado");
const menuMercado = document.getElementById("menu-mercado");

mercadoSprite.addEventListener("click", () => {
    menuMercado.style.display = "flex";
});

function cerrarMercado() {
    menuMercado.style.display = "none";
}

function comprarEspada() {
    if (tieneEspada) { alert("¡Ya tienes espada!"); return; }
    if (oro < 10) { alert("Necesitas 10 de oro."); return; }
    
    oro -= 10;
    txtOro.innerText = oro;
    dañoArma = 3;
    tieneEspada = true;
    
    alert("⚔️ ¡Espada comprada! Los ruidos se intensifican...");
    cerrarMercado();
    
    // Forzamos el cambio de fase aquí para que empiece la acción
    cambiarFase("NOCHE"); 
}

function comprarCorazon() {
    if (oro < 5) { alert("Necesitas 5 de oro."); return; }
    oro -= 5;
    txtOro.innerText = oro;
    maxPlayerHp++;
    playerHp = Math.min(playerHp + 1, maxPlayerHp);
    actualizarCorazones();
    cerrarMercado();
}

function comprarPico() {
    if (oro < 8) { alert("Necesitas 8 de oro."); return; }
    oro -= 8;
    txtOro.innerText = oro;
    dañoPico++;
    alert("⛏️ ¡Pico mejorado! Daño: " + dañoPico);
    cerrarMercado();
}
