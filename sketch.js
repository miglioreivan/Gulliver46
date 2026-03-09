// --- Impostazioni ---
let canvasW, canvasH;

const COLOR_ISLAND = '#ecf0f1';
const COLOR_ROAD = '#bdc3c7';
const COLOR_BUS_HEAD = '#e74c3c';
const COLOR_BUS_BODY = '#c0392b';
const COLOR_STUDENT_SHIRT = '#3498db';
const COLOR_STUDENT_PANTS = '#2980b9';
const COLOR_STUDENT_SKIN = '#f1c40f';

// --- Entità: Bus (Fisica) ---
let bus = {
    x: 0,
    y: 0,
    w: 24,
    h: 64,
    angle: 0,
    speed: 0,
    maxSpeed: 5,
    acceleration: 0.1,
    friction: 0.05,
    turnSpeed: 0.05
};

let inputState = {
    up: false,
    down: false,
    left: false,
    right: false
};

// --- Meccanica Fermate ---
let passengers = 0;
let gameState = 'START';

const routeStations = [
    "Piazza Cavour - Capolinea",     // 0
    "Via Frediani",                  // 1
    "Via Giannelli",                 // 2
    "Via Bocconi (Semaforo)",        // 3
    "Cimitero Tavernelle",           // 4 (L'esplosione avverrà all'arrivo qua)
    "Parcheggio Cimitero",           // 5
    "Via San Giacomo Della Marca",   // 6
    "Parcheggio Via Ranieri",        // 7
    "Liceo Galilei",                 // 8
    "Universita' Ingegneria"         // 9
];

// Correzione: L'indice 4 è Cimitero Tavernelle. Il trigger succede AL COMPLETAMENTO della fermata.
// L'esplosione dovrebbe scattare PRIMA o APPENA DOPO aver finito "Cimitero Tavernelle"
// La logica attuale dice: if (currentStationIndex >= FINAL_CRASH_STATION_INDEX).
// Se voglio che esploda non appena carica i passeggeri della fermata 4 (Cimitero), allora FINAL deve essere 4.
const FINAL_CRASH_STATION_INDEX = 4;
let currentStationIndex = 0;
let stationZone;
let waitingPeds = [];
let loadingTimer = 0;

// Variabili Animazione Finale
let explosionTimer = 0;
let particles = [];
let fleeingStudents = [];
let textOpacity = 0;
let univpmBuilding = { x: 0, y: 0, w: 150, h: 100 }; // Coordinate decise in setup

// --- Setup ---
function setup() {
    canvasW = min(windowWidth * 0.9, 800);
    canvasH = min(windowHeight * 0.95, 1200);
    createCanvas(canvasW, canvasH);

    let cnv = document.querySelector("canvas");
    cnv.addEventListener("touchstart", function (e) { e.preventDefault() });

    // L'edificio si trova in alto a destra
    univpmBuilding.x = width - 180;
    univpmBuilding.y = 50;

    initGame();
}

function initGame() {
    bus.x = width / 2;
    bus.y = height * 0.8;
    bus.angle = PI;
    bus.speed = 0;

    passengers = 0;
    currentStationIndex = 0;
    explosionTimer = 0;
    particles = [];
    fleeingStudents = [];
    textOpacity = 0;

    spawnStationGroup();
    gameState = 'START';
}

function spawnStationGroup() {
    waitingPeds = [];
    let numStudents = 5 + (currentStationIndex * 5); // Aumentano drasticamente!

    let validArea = false;
    let sx, sy;
    while (!validArea) {
        sx = random(50, width - 100);
        sy = random(200, height - 150); // Meno in alto per non scontrarsi col palazzo alla fine
        if (dist(sx, sy, bus.x, bus.y) > 200) {
            validArea = true;
        }
    }

    stationZone = { x: sx, y: sy, w: 80, h: 80 };

    for (let i = 0; i < numStudents; i++) {
        let px = sx + random(10, 70);
        let py = sy + random(10, 70);
        waitingPeds.push(new Person(px, py));
    }
}

// --- Loop Principale ---
function draw() {
    drawIslandEnvironment();

    if (gameState === 'START') {
        drawStartScreen();
    } else if (gameState === 'PLAYING') {
        handleInput();
        updatePhysics();
        checkStationZone();

        drawStationMarker();
        drawPedestrians();
        drawBus();
        drawUI();
        drawMobileControls();
    } else if (gameState === 'LOADING') {
        updatePhysics();
        processStationLoading();

        drawStationMarker();
        drawPedestrians();
        drawBus();
        drawUI();
    } else if (gameState === 'GAMEOVER') {
        drawStationMarker();
        drawPedestrians();
        drawBus();
        drawGameOverScreen();
    } else {
        handleEndingSequence();
    }
}

// ----------------------------------------
// FISICA E MOVIMENTO (UPDATE)
// ----------------------------------------

function handleInput() {
    inputState.up = keyIsDown(UP_ARROW) || keyIsDown(87);
    inputState.down = keyIsDown(DOWN_ARROW) || keyIsDown(83);
    inputState.left = keyIsDown(LEFT_ARROW) || keyIsDown(65);
    inputState.right = keyIsDown(RIGHT_ARROW) || keyIsDown(68);

    if (touches.length > 0) {
        let tLeft = false, tRight = false, tUp = false, tDown = false;
        for (let i = 0; i < touches.length; i++) {
            let tx = touches[i].x;
            let ty = touches[i].y;

            if (tx > width / 2) {
                if (ty > height / 2 && ty < height - 100) tLeft = true;
                if (ty >= height - 100) tRight = true;
            }
            if (tx <= width / 2) {
                if (ty > height / 2 && ty < height - 100) tUp = true;
                if (ty >= height - 100) tDown = true;
            }
        }
        inputState.up = inputState.up || tUp;
        inputState.down = inputState.down || tDown;
        inputState.left = inputState.left || tLeft;
        inputState.right = inputState.right || tRight;
    }
}

function updatePhysics() {
    if (inputState.up) {
        bus.speed += bus.acceleration;
    } else if (inputState.down) {
        bus.speed -= bus.acceleration;
    } else {
        if (bus.speed > 0) bus.speed -= bus.friction;
        if (bus.speed < 0) bus.speed += bus.friction;
        if (abs(bus.speed) < bus.friction) bus.speed = 0;
    }

    bus.speed = constrain(bus.speed, -bus.maxSpeed / 2, bus.maxSpeed);

    if (abs(bus.speed) > 0.5) {
        let turnDir = (bus.speed > 0) ? 1 : -1;
        if (inputState.left) bus.angle -= bus.turnSpeed * turnDir;
        if (inputState.right) bus.angle += bus.turnSpeed * turnDir;
    }

    bus.x += cos(bus.angle) * bus.speed;
    bus.y += sin(bus.angle) * bus.speed;

    if (bus.x < 0 || bus.y < 0 || bus.x > width || bus.y > height) {
        gameState = 'GAMEOVER';
    }
}

function checkStationZone() {
    if (bus.x > stationZone.x && bus.x < stationZone.x + stationZone.w &&
        bus.y > stationZone.y && bus.y < stationZone.y + stationZone.h) {

        if (abs(bus.speed) < 0.5 && waitingPeds.length > 0) {
            gameState = 'LOADING';
            loadingTimer = 0;
        }
    }
}

function processStationLoading() {
    // Congela istantaneamente l'autobus per evitare che scivoli via caricando
    bus.speed = 0;
    bus.acceleration = 0;

    loadingTimer++;
    if (loadingTimer > 5 && waitingPeds.length > 0) {
        loadingTimer = 0;
        waitingPeds.pop();
        passengers++;
    }

    if (waitingPeds.length === 0) {
        currentStationIndex++;
        if (currentStationIndex >= FINAL_CRASH_STATION_INDEX) {
            // Arrivati al Cimitero Tavernelle! Innesca esplosione.
            gameState = 'EXPLODING_SHAKE';
        } else {
            spawnStationGroup();
            gameState = 'PLAYING';
        }
    }
}

// ----------------------------------------
// GRAFICA BASE (DRAW)
// ----------------------------------------

function drawIslandEnvironment() {
    background(COLOR_ISLAND);
    noStroke();
    fill('#dcdde1');
    for (let i = 0; i < 5; i++) {
        rect(i * 200, 0, 100, height);
    }
}

function drawStationMarker() {
    push();
    stroke(255, 204, 0);
    strokeWeight(3);
    drawingContext.setLineDash([5, 5]);
    noFill();
    rect(stationZone.x, stationZone.y, stationZone.w, stationZone.h, 5);

    drawingContext.setLineDash([]);
    fill(0);
    noStroke();
    textAlign(CENTER, BOTTOM);
    textSize(14);
    text(routeStations[currentStationIndex], stationZone.x + stationZone.w / 2, stationZone.y - 10);
    pop();
}

// Omini molto carini in vista top-down con animazione gambe/braccia
class Person {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.angle = random(TWO_PI);
        this.offsetTimer = random(100);
        this.walkCycle = 0; // Usato per muovere le gambe
    }

    draw() {
        push();
        translate(this.x, this.y);
        rotate(this.angle);

        noStroke();

        // Gambe animate (che sfalsano avanti e indietro in base al walkCycle)
        // Se è fermo (Person normale ciondola poco), se è Fleeing cammina tanto
        let legOffset = sin(this.walkCycle) * 4;
        fill(COLOR_STUDENT_PANTS); // Jeans scuri
        rect(-5, -6 + legOffset, 4, 8, 2); // Gamba Sinistra (in alto locale Y-)
        rect(-5, 2 - legOffset, 4, 8, 2); // Gamba Destra (in basso locale Y+)

        // Spalle/Maglietta Torso (copre l'attacco delle gambe)
        fill(COLOR_STUDENT_SHIRT);
        rect(-6, -5, 12, 10, 3);

        // Braccia animate opposte alle gambe
        let armOffset = sin(this.walkCycle + PI) * 4;
        fill(COLOR_STUDENT_SKIN);
        rect(0, -7 + armOffset, 4, 3, 1); // Braccio Sinistro
        rect(0, 4 - armOffset, 4, 3, 1);  // Braccio Destro

        // Testa (poggiata sul torso)
        fill(COLOR_STUDENT_SKIN);
        ellipse(0, 0, 8, 8);

        // Capelli (opzionale colore random, qui viola fisso per semplicità)
        fill('#8e44ad');
        arc(0, 0, 8, 8, -PI / 2, PI / 2); // Capelli dietro la testa vista top-down muovendosi verso X+

        // Onde passive se stanno solo aspettando
        if (this.walkCycle === 0) {
            rotate(sin(frameCount * 0.1 + this.offsetTimer) * 0.2);
        }

        pop();
    }
}

function drawPedestrians() {
    for (let p of waitingPeds) {
        p.draw();
    }
}

function drawBus() {
    push();
    translate(bus.x, bus.y);
    rotate(bus.angle);

    let bw = bus.w; // Larghezza
    let bh = bus.h; // Lunghezza totale

    // Il "davanti" del bus è verso +X in coordinate locali grazie a cos(angle)

    noStroke();
    // Ombra a terra
    fill(0, 50);
    rect(-bh / 2 + 2, -bw / 2 + 4, bh, bw, 4);

    // Corpo Principale Rosso
    fill(COLOR_BUS_BODY);
    rect(-bh / 2, -bw / 2, bh, bw, 4);

    // Striscia Bianca Distintiva Frontale (per far capire dov'è il muso)
    fill(255);
    rect(bh / 2 - 12, -bw / 2 + 1, 6, bw - 2);

    // Tetto Centrale (Zaino Condizionatore)
    fill(COLOR_BUS_HEAD);
    rect(-bh / 2 + 8, -bw / 2 + 3, bh - 24, bw - 6, 2);

    // Parabrezza Frontale (Vetro grande azzurro sul lato destro/davanti locale)
    fill(200, 240, 255);
    rect(bh / 2 - 6, -bw / 2 + 2, 4, bw - 4);

    // Lunotto Posteriore (Vetro piccolo sul retro)
    fill(100, 150, 200);
    rect(-bh / 2 + 2, -bw / 2 + 2, 3, bw - 4);

    // Finestrini Laterali
    fill(50);
    let windowSpace = (bh - 24) / 4; // Spazio accorciato per via del muso
    for (let i = 0; i < 4; i++) {
        rect(-bh / 2 + 8 + (i * windowSpace), -bw / 2 + 1, windowSpace - 2, 2); // lato Sx
        rect(-bh / 2 + 8 + (i * windowSpace), bw / 2 - 3, windowSpace - 2, 2); // lato Dx
    }

    // Fari Posteriori (Rossi)
    fill(150, 0, 0); // Spenti
    if (inputState.down && bus.speed > 0) {
        fill(255, 0, 0); // Accesi (Frenata)
    }
    rect(-bh / 2 - 1, -bw / 2 + 2, 3, 5); // Faretto post Sx
    rect(-bh / 2 - 1, bw / 2 - 7, 3, 5);  // Faretto post Dx

    // Fari Anteriori (Gialli/Bianchi) per evidenziare il MUSO
    fill(255, 255, 200);
    rect(bh / 2 - 2, -bw / 2 + 2, 3, 5); // Faretto ant Sx
    rect(bh / 2 - 2, bw / 2 - 7, 3, 5);  // Faretto ant Dx

    // Dettaglio cofano
    fill('#a5281b'); // Rosso scuro
    rect(bh / 2 - 16, -bw / 2 + 4, 3, bw - 8);

    // "46" sul tetto
    fill(255);
    textAlign(CENTER, CENTER);
    translate(0, 0);
    rotate(PI / 2);
    textSize(12);
    text("46", 0, 0);

    pop();
}

function drawUI() {
    fill(0, 150);
    noStroke();
    rect(0, 0, width, 50);

    fill(255);
    textAlign(LEFT, CENTER);
    textSize(20);
    text(`Sardine a bordo: ${passengers}`, 10, 25);

    textAlign(RIGHT, CENTER);
    textSize(14);
    text(`Prss: ${routeStations[currentStationIndex]}`, width - 10, 15);
    text(`Dest/Fine: ${routeStations[FINAL_CRASH_STATION_INDEX]}`, width - 10, 35);

    if (gameState === 'LOADING') {
        textAlign(CENTER, CENTER);
        fill(255, 200, 0);
        textSize(24);
        text("FERMO E CARICA...", width / 2, height / 2 + 60);
    }
}

function drawMobileControls() {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        push();
        fill(255, 20);
        stroke(255, 50);
        strokeWeight(1);

        rect(20, height - 120, 80, 50, 10);
        rect(20, height - 60, 80, 50, 10);
        rect(width - 180, height - 80, 70, 60, 10);
        rect(width - 90, height - 80, 70, 60, 10);

        fill(255, 100);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(12);
        text("GAS", 60, height - 95);
        text("FRENO", 60, height - 35);
        text("SX", width - 145, height - 50);
        text("DX", width - 55, height - 50);

        pop();
    }
}

// ----------------------------------------
// SEQUENZA FINALE
// ----------------------------------------

function handleEndingSequence() {
    drawIslandEnvironment();

    // In questa fase finale, mostra l'edificio UNIVPM in modo epico
    drawUnivpmBuilding();

    // Ridisegna marker precedente per contesto, o omettilo
    explosionTimer++;

    if (gameState === 'EXPLODING_SHAKE') {
        let shakeX = random(-4, 4);
        let shakeY = random(-4, 4);

        push();
        translate(shakeX, shakeY);
        drawBus();
        pop();

        if (explosionTimer % 2 === 0) {
            particles.push(new SmokeParticle(bus.x, bus.y));
        }

        if (explosionTimer > 90) {
            gameState = 'EXPLODING_BOOM';
            explosionTimer = 0;

            for (let i = 0; i < passengers; i++) {
                fleeingStudents.push(new FleeingStudent(bus.x + random(-20, 20), bus.y + random(-20, 20)));
            }
        }
    } else if (gameState === 'EXPLODING_BOOM') {
        let r = explosionTimer * 20;
        fill(255, 100, 0, 255 - explosionTimer * 5);
        noStroke();
        ellipse(bus.x, bus.y, r, r);

        fill(255, 255, 255, 200 - explosionTimer * 2);
        ellipse(bus.x, bus.y, r / 2, r / 2);

        if (explosionTimer > 60) {
            gameState = 'WALKING_AWAY';
            explosionTimer = 0;
        }
    } else if (gameState === 'WALKING_AWAY' || gameState === 'FINAL_SCREEN') {
        for (let fs of fleeingStudents) {
            fs.update();
            fs.draw();
        }

        if (explosionTimer > 120) { // Tempo extra per farli camminare prima del testo
            gameState = 'FINAL_SCREEN';
        }

        if (gameState === 'FINAL_SCREEN') {
            textOpacity = min(textOpacity + 2, 255);
            fill(0, textOpacity * 0.8);
            rect(0, 0, width, height);

            fill(255, textOpacity);
            textAlign(CENTER, CENTER);
            textSize(24);
            text("Il 46 è pieno.", width / 2, height / 2 - 40);
            textSize(18);
            text("Fartela a piedi non è il massimo.", width / 2, height / 2 + 10);

            fill(COLOR_BUS_HEAD);
            textSize(36);
            text("VOTA GULLIVER", width / 2, height / 2 + 70);

            if (mouseIsPressed && frameCount % 30 == 0) {
                window.open('https://gulliver.univpm.it/', '_blank');
            }
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].show();
        if (particles[i].alpha <= 0) {
            particles.splice(i, 1);
        }
    }
}

// Disegna un grosso edificio per l'Università
function drawUnivpmBuilding() {
    let ux = univpmBuilding.x;
    let uy = univpmBuilding.y;
    let uw = univpmBuilding.w;
    let uh = univpmBuilding.h;

    push();
    // Ombra ampia
    fill(0, 50);
    noStroke();
    rect(ux + 8, uy + 12, uw, uh, 5);

    // Corpo Principale (Grigio Calcestruzzo stile Brutalista)
    fill('#95a5a6');
    rect(ux, uy, uw, uh, 3);

    // Ala laterale sinistra (Profondità)
    fill('#7f8c8d');
    rect(ux - 20, uy + 20, 20, uh - 20, 2);

    // Finestroni grandi orizzontali (Stile aule Ingegneria)
    fill('#34495e');
    for (let y = uy + 30; y < uy + uh - 10; y += 20) {
        rect(ux + 10, y, uw - 20, 10, 1);
    }

    // Tetto/Intestazione Spessa
    fill('#2c3e50'); // Blu scuro istituzionale
    rect(ux - 5, uy - 20, uw + 10, 35, 4);

    // Striscia Arancione/Rossa Decorativa (Stile Univpm)
    fill('#e67e22');
    rect(ux - 5, uy + 15, uw + 10, 4);

    // Scritta UNIVPM INGEGNERIA sul Tetto
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(18);
    text("UNIVPM", ux + uw / 2, uy - 10);
    textSize(10);
    fill('#bdc3c7');
    text("INGEGNERIA", ux + uw / 2, uy + 5);

    // Ingresso Principale (Porte a Vetri)
    fill('#2980b9');
    rect(ux + uw / 2 - 15, uy + uh - 20, 30, 20, 2);
    fill(255, 200);
    rect(ux + uw / 2 - 13, uy + uh - 18, 12, 18);
    rect(ux + uw / 2 + 1, uy + uh - 18, 12, 18);

    pop();
}

class SmokeParticle {
    constructor(x, y) {
        this.x = x + random(-30, 30);
        this.y = y + random(-30, 30);
        this.vx = random(-1, 1);
        this.vy = random(-3, -1);
        this.alpha = 255;
        this.d = random(10, 40);
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 5;
    }
    show() {
        noStroke();
        fill(50, 50, 50, this.alpha);
        ellipse(this.x, this.y, this.d);
    }
}

class FleeingStudent extends Person {
    constructor(x, y) {
        super(x, y);
        // Destinazione centro edificio UNIVPM
        this.targetX = univpmBuilding.x + univpmBuilding.w / 2 + random(-40, 40);
        this.targetY = univpmBuilding.y + univpmBuilding.h / 2 + random(20, 50);

        // Velocità base casuale
        this.speed = random(0.5, 2);
    }

    update() {
        // Calcola l'angolo per andare diretti verso l'Univpm!
        let dx = this.targetX - this.x;
        let dy = this.targetY - this.y;
        this.angle = atan2(dy, dx);

        // Muoviti solo se non è ancora arrivato al target
        if (dist(this.x, this.y, this.targetX, this.targetY) > 10) {
            this.x += cos(this.angle) * this.speed;
            this.y += sin(this.angle) * this.speed;

            // Anima le gambe e braccia velocemente in base al movimento (camminata)
            this.walkCycle += this.speed * 0.2;
        } else {
            // Fermo vicino all'edificio
            this.walkCycle = 0;
        }
    }
}

// --- Schermate Base ---
function drawStartScreen() {
    fill(0, 200); rect(0, 0, width, height);
    fill(255); textAlign(CENTER, CENTER);
    textSize(32); text("SIMULATORE 46", width / 2, height / 3 - 20);
    textSize(16); text("Fermati col bus (freno S/Giù) sui quadrati gialli\nFai salire la folla finché non sbomba\narrivando a Tavernelle.", width / 2, height / 3 + 30);
    fill(COLOR_BUS_HEAD); rect(width / 2 - 75, height / 2, 150, 50, 10);
    fill(255); textSize(20); text("ACCENDI MOTORE", width / 2, height / 2 + 25);
}

function drawGameOverScreen() {
    fill(0, 200); rect(0, 0, width, height);
    fill(COLOR_BUS_HEAD); textAlign(CENTER, CENTER);
    textSize(32); text("INCIDENTE", width / 2, height / 3 - 20);
    fill(255); textSize(16); text(`Hai raccattato ${passengers} passeggeri,\nma ti sei distratto. Occhio ai bordi!`, width / 2, height / 3 + 30);
    fill(100); rect(width / 2 - 75, height / 2 + 100, 150, 40, 5);
    fill(255); textSize(16); text("RICOMINCIA", width / 2, height / 2 + 120);

    if (mouseIsPressed && (mouseY > height / 2 + 100 && mouseY < height / 2 + 140)) {
        initGame();
    }
}

function mousePressed() {
    if (gameState === 'START') {
        let btnY = height / 2;
        if (mouseY > btnY && mouseY < btnY + 50) {
            gameState = 'PLAYING';
        }
    }
}
