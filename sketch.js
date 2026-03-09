// --- Impostazioni ---
let canvasW, canvasH;

const COLOR_ISLAND = '#ecf0f1';
const COLOR_BUS_HEAD = '#e74c3c';
const COLOR_BUS_BODY = '#c0392b';
const COLOR_STUDENT_SHIRT = '#3498db';
const COLOR_STUDENT_PANTS = '#2980b9';
const COLOR_STUDENT_SKIN = '#f1c40f';

// Colori UI Globale
const UI_DARK_BG = '#2c3e50';
const UI_BUTTON_RED = '#e74c3c';

// Font (usato bold per visibilità)
let mainFont = 'Arial';

// --- Entità: Bus (Fisica) ---
let bus = {
    x: 0, y: 0,
    w: 24, h: 64,
    angle: 0, speed: 0,
    maxSpeed: 5, acceleration: 0.1,
    friction: 0.05, turnSpeed: 0.05
};

let inputState = { up: false, down: false, left: false, right: false };

let vJoy = {
    active: false,
    baseX: 0, baseY: 0,
    stickX: 0, stickY: 0,
    maxR: 40,
    touchId: null
};

// --- Meccanica Fermate ---
let passengers = 0;
let gameState = 'START';

const routeStations = [
    "Piazza Cavour - Capol.",
    "Via Frediani",
    "Via Giannelli",
    "Via Bocconi (Sem.)",
    "Cimitero Tavernelle",
    "Parcheggio Cimitero",
    "S. Giacomo D. Marca",
    "Parcheggio V. Ranieri",
    "Liceo Galilei",
    "Univ. Ingegneria"
];

const FINAL_CRASH_STATION_INDEX = 5;
let currentStationIndex = 0;

let stationZone;  // L'area gialla in basso (parcheggio bus)
let waitingArea;  // Il marciapiede coi pedoni (safe zone contigua)
let waitingPeds = [];
let loadingTimer = 0;
let runOverCount = 0; // Contatore pedoni investiti

// Animazione Finale
let explosionTimer = 0;
let particles = [];
let fleeingStudents = [];
let textOpacity = 0;
let univpmBuilding = { x: 0, y: 0, w: 150, h: 100 };

// --- Setup ---
function setup() {
    canvasW = min(windowWidth * 0.95, 800);
    canvasH = min(windowHeight * 0.95, 1200);
    createCanvas(canvasW, canvasH);
    textFont(mainFont);
    textStyle(BOLD); // Font massicci per contrasto

    let cnv = document.querySelector("canvas");
    cnv.addEventListener("touchstart", function (e) { e.preventDefault() });

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
    runOverCount = 0;
    explosionTimer = 0;
    particles = [];
    fleeingStudents = [];
    textOpacity = 0;

    spawnStationGroup();
    gameState = 'START';
}

let lastPedestrianCount = 0; // Nuova variabile globale introdotta per contare lo storico pedoni generati
function spawnStationGroup() {
    waitingPeds = [];

    // Logica incrementale stretta: parte da minimo 7, poi sale TASSATIVAMENTE ad ogni fermata successiva
    let numStudents = 0;
    if (currentStationIndex === 0) {
        numStudents = floor(random(7, 10));
    } else {
        let increase = floor(random(2, 6)); // Aggiunge da 2 a 5 pedoni ogni volta in più rispetto alla tappa prima
        numStudents = lastPedestrianCount + increase;
    }
    lastPedestrianCount = numStudents;
    let sx, sy;
    let validArea = false;
    // Cerchiamo un'area che possa contenere sia il marciapiede (sopra) che il posteggio (sotto)
    let areaW = 100; // Larghezza totale zona fermata
    let areaH = 80;  // Altezza posteggio
    let sidewalkH = 60; // Altezza marciapiede

    while (!validArea) {
        sx = random(50, width - 150);
        sy = random(150, height - 200);
        if (dist(sx + areaW / 2, sy + sidewalkH + areaH / 2, bus.x, bus.y) > 200) {
            validArea = true;
        }
    }

    // Il marciapiede coi pedoni sta SOPRA
    waitingArea = { x: sx, y: sy, w: areaW, h: sidewalkH };
    // L'area di posteggio per il bus sta SOTTO il marciapiede
    stationZone = { x: sx, y: sy + sidewalkH, w: areaW, h: areaH };

    // Spargi i pedoni SOLO sul marciapiede, così il bus parcheggia "davanti" a loro
    for (let i = 0; i < numStudents; i++) {
        let px = waitingArea.x + random(10, waitingArea.w - 10);
        let py = waitingArea.y + random(10, waitingArea.h - 10);
        waitingPeds.push(new Person(px, py));
    }
}

// --- Loop Principale ---
function draw() {
    drawIslandEnvironment();

    if (gameState === 'START') {
        drawStartMenu();
    } else if (gameState === 'PLAYING') {
        handleInput();
        updatePhysics();
        checkStationZone();

        drawStationMarker();
        drawPedestrians();
        drawBus();
        drawHUD();
        drawMobileControls();
    } else if (gameState === 'LOADING') {
        bus.speed = 0; // Blocca istantaneamente l'inerzia indotta in updatePhysics
        processStationLoading();

        drawStationMarker();
        drawPedestrians();
        drawBus();
        drawHUD();
    } else if (gameState === 'GAMEOVER') {
        drawStationMarker();
        drawPedestrians();
        drawBus();
        drawGameOverMenu(); // Refactored ui
    } else {
        handleEndingSequence(); // Il finale usa internamente le draw pulite
    }
}

// ----------------------------------------
// FISICA E MOVIMENTO
// ----------------------------------------

function handleInput() {
    inputState.up = keyIsDown(UP_ARROW) || keyIsDown(87);
    inputState.down = keyIsDown(DOWN_ARROW) || keyIsDown(83);
    inputState.left = keyIsDown(LEFT_ARROW) || keyIsDown(65);
    inputState.right = keyIsDown(RIGHT_ARROW) || keyIsDown(68);

    if (touches.length > 0) {
        if (!vJoy.active) {
            vJoy.active = true;
            vJoy.touchId = touches[0].id; // Assign first touch as stick
            vJoy.baseX = touches[0].x;
            vJoy.baseY = touches[0].y;
            vJoy.stickX = touches[0].x;
            vJoy.stickY = touches[0].y;
        } else {
            let found = false;
            for (let i = 0; i < touches.length; i++) {
                if (touches[i].id === vJoy.touchId || touches.length === 1) {
                    found = true;
                    let dx = touches[i].x - vJoy.baseX;
                    let dy = touches[i].y - vJoy.baseY;
                    let distPx = sqrt(dx * dx + dy * dy);
                    if (distPx > vJoy.maxR) {
                        dx = (dx / distPx) * vJoy.maxR;
                        dy = (dy / distPx) * vJoy.maxR;
                    }
                    vJoy.stickX = vJoy.baseX + dx;
                    vJoy.stickY = vJoy.baseY + dy;
                    break;
                }
            }
            if (!found) vJoy.active = false;
        }
    } else {
        vJoy.active = false;
    }
}

function updatePhysics() {
    if (vJoy.active) {
        // Controllo direzionale assoluto joystick su smartphone
        let dx = vJoy.stickX - vJoy.baseX;
        let dy = vJoy.stickY - vJoy.baseY;
        let distPx = sqrt(dx * dx + dy * dy);

        if (distPx > 10) {
            // Allinea ISTANTANEAMENTE il bus alla traiettoria del joypad (nessun raggio di sterzata)
            let targetAngle = atan2(dy, dx);
            bus.angle = targetAngle;

            // Accelera proporzionalmente alla spinta del dito
            // Ridotta drasticamente la velocità massima al 25% (su telefono era ingiocabile)
            let touchMaxSpeed = bus.maxSpeed * 0.25;
            let targetSpeed = map(distPx, 10, vJoy.maxR, 0, touchMaxSpeed, true);

            // Fai accelerare in modo leggermente più fluido
            bus.speed = lerp(bus.speed, targetSpeed, 0.15);
        } else {
            // Se torna al centro, frena da fermo piuttosto rapidamente
            if (bus.speed > 0) bus.speed -= bus.friction * 2;
            if (bus.speed < 0) bus.speed += bus.friction * 2;
            if (abs(bus.speed) < bus.friction * 2) bus.speed = 0;
        }
    } else {
        // Controlli tastiera stile veicolo
        if (inputState.up) bus.speed += bus.acceleration;
        else if (inputState.down) bus.speed -= bus.acceleration;
        else {
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

        // Entra in fase di caricamento se l'autobus si ferma, 
        // ANCHE se hai stirato tutti i pedoni (waitingPeds.length === 0) 
        // così il gioco non si blocca irreparabilmente.
        if (abs(bus.speed) < 0.5) {
            gameState = 'LOADING';
            loadingTimer = 0;
        }
    }
}

function processStationLoading() {
    bus.speed = 0;
    bus.acceleration = 0;
    loadingTimer++;
    if (loadingTimer > 5 && waitingPeds.length > 0) {
        loadingTimer = 0;
        waitingPeds.pop();
        passengers++;
    }

    if (waitingPeds.length === 0) {
        bus.acceleration = 0.1;
        currentStationIndex++;
        if (currentStationIndex >= FINAL_CRASH_STATION_INDEX) {
            gameState = 'EXPLODING_SHAKE';
        } else {
            spawnStationGroup();
            gameState = 'PLAYING';
        }
    }
}

// ----------------------------------------
// GRAFICA AMBIENTE E MENU COERENTI
// ----------------------------------------

function drawIslandEnvironment() {
    background(COLOR_ISLAND);
    noStroke();
    fill('#dcdde1');
    for (let i = 0; i < width / 150; i++) {
        rect(i * 150 + 20, 0, 100, height);
    }
}

function drawStationMarker() {
    push();
    // 1. Marciapiede (dove stanno i pedoni) - Rettangolo grigio solido
    fill('#bdc3c7'); // Grigio chiaro
    noStroke();
    rect(waitingArea.x, waitingArea.y, waitingArea.w, waitingArea.h, 5);

    // 2. Cartello Fermata (Palo e targa)
    let signX = waitingArea.x + 10;
    let signY = waitingArea.y - 15;
    // Palo
    fill(50);
    rect(signX + 2, signY + 15, 3, 20);
    // Targa Bus
    fill('#f39c12'); // Arancione TPL
    rect(signX - 5, signY, 16, 16, 2);
    fill(255);
    textSize(10); textAlign(CENTER, CENTER);
    text("BUS", signX + 3, signY + 8);

    // 3. Posteggio (dove deve fermarsi il Bus) gialla tratteggiata
    stroke(255, 204, 0);
    strokeWeight(3);
    drawingContext.setLineDash([8, 8]);
    noFill();
    rect(stationZone.x, stationZone.y, stationZone.w, stationZone.h, 5);
    drawingContext.setLineDash([]);

    // Testo Fermata bello grosso sotto tutto il piazzale per evitare sovrapposizioni col bus/cartello
    let stName = routeStations[currentStationIndex];
    textSize(14);
    let tw = textWidth(stName);
    fill(255, 230); // Sfondo bianco
    noStroke();
    rect(stationZone.x + stationZone.w / 2 - tw / 2 - 10, stationZone.y + stationZone.h + 8, tw + 20, 20, 5);

    fill(UI_DARK_BG);
    textAlign(CENTER, TOP);
    text(stName, stationZone.x + stationZone.w / 2, stationZone.y + stationZone.h + 10);
    pop();
}

function drawHUD() {
    push();
    fill(UI_DARK_BG); // Niente più 150 alpha slavato, grigio/blu solido
    noStroke();
    rect(0, 0, width, 55);

    // Effetto ombra per distacco
    fill(0, 50);
    rect(0, 55, width, 4);

    fill(255);
    textAlign(LEFT, CENTER);
    textSize(18);
    text(`Sardine a bordo: ${passengers}`, 15, 27);

    textAlign(RIGHT, CENTER);
    textSize(14);
    text(`Pros: ${routeStations[currentStationIndex]}`, width - 15, 18);
    text(`Ultima: ${routeStations[FINAL_CRASH_STATION_INDEX - 1]}`, width - 15, 38);

    if (gameState === 'LOADING') {
        fill(0, 150);
        rect(0, height / 2 - 30, width, 60);
        textAlign(CENTER, CENTER);
        fill(255, 204, 0); // Giallo evidenziatore
        textSize(28);
        text("FERMO E CARICA...", width / 2, height / 2);
    }
    pop();
}

// Menu Globale Standardizzato
function drawModalMessage(title, subtitle, buttonText) {
    push();
    // Overlay Scuro
    fill(0, 200);
    rect(0, 0, width, height);

    // Titolo
    fill(UI_BUTTON_RED);
    textAlign(CENTER, CENTER);
    textSize(36);
    text(title, width / 2, height / 3 - 10);

    // Sottotitolo Bianco
    fill(255);
    textSize(18);
    text(subtitle, width / 2, height / 3 + 40);

    // Bottone CTA Centrale
    let btnW = 200;
    let btnH = 50;
    let btnX = width / 2 - btnW / 2;
    let btnY = height / 2 + 20;

    fill(UI_BUTTON_RED);
    rect(btnX, btnY, btnW, btnH, 8); // Angoli arrotondati
    fill(255);
    textSize(20);
    text(buttonText, width / 2, btnY + btnH / 2);

    pop();
}

function drawStartMenu() {
    drawModalMessage("GULLIVER 46", "Fermati nel rettangolo giallo della\nfermata per far salire la folla.\nEvita i bordi dello schermo!", "ACCENDI MOTORE");
}

function drawGameOverMenu() {
    drawModalMessage("INCIDENTE STRADALE", `Hai guidato in modo spericolato!\nPasseggeri raccolti: ${passengers}\nPedoni investiti: ${runOverCount}`, "GIOCA DI NUOVO");
}

let btnBounds = { w: 200, h: 50 }; // Shared button logic size
function isButtonTapped(mx, my) {
    let btnX = width / 2 - btnBounds.w / 2;
    let btnY = height / 2 + 20;
    return (mx > btnX && mx < btnX + btnBounds.w && my > btnY && my < btnY + btnBounds.h);
}

// ----------------------------------------
// ENTITÀ (PERSONE E BUS)
// ----------------------------------------

class Person {
    constructor(x, y) {
        this.x = x; this.y = y; this.angle = random(TWO_PI);
        this.offsetTimer = random(100); this.walkCycle = 0;
    }
    draw() {
        push(); translate(this.x, this.y); rotate(this.angle);
        noStroke();
        let legOffset = sin(this.walkCycle) * 4;
        fill(COLOR_STUDENT_PANTS); // Jeans scuri
        rect(-5, -6 + legOffset, 4, 8, 2);
        rect(-5, 2 - legOffset, 4, 8, 2);

        fill(COLOR_STUDENT_SHIRT); rect(-6, -5, 12, 10, 3);
        let armOffset = sin(this.walkCycle + PI) * 4;
        fill(COLOR_STUDENT_SKIN);
        rect(0, -7 + armOffset, 4, 3, 1);
        rect(0, 4 - armOffset, 4, 3, 1);
        ellipse(0, 0, 8, 8);
        fill('#8e44ad'); arc(0, 0, 8, 8, -PI / 2, PI / 2);
        if (this.walkCycle === 0) rotate(sin(frameCount * 0.1 + this.offsetTimer) * 0.2);
        pop();
    }
}

function drawPedestrians() {
    for (let i = waitingPeds.length - 1; i >= 0; i--) {
        let p = waitingPeds[i];

        // Controlliamo se l'autobus investe un pedone (con margine di tolleranza)
        // Hitbox aumentata a 35 per coprire l'intera lunghezza del bus
        if (dist(bus.x, bus.y, p.x, p.y) < 35 && abs(bus.speed) > 0.1) {
            waitingPeds.splice(i, 1);
            runOverCount++;
            continue;
        }

        p.draw();
    }
}

function drawBus() {
    push();
    translate(bus.x, bus.y);
    rotate(bus.angle);

    let bw = bus.w; let bh = bus.h;
    noStroke(); fill(0, 50); rect(-bh / 2 + 2, -bw / 2 + 4, bh, bw, 4);
    fill(COLOR_BUS_BODY); rect(-bh / 2, -bw / 2, bh, bw, 4);
    fill(255); rect(bh / 2 - 12, -bw / 2 + 1, 6, bw - 2);
    fill(COLOR_BUS_HEAD); rect(-bh / 2 + 8, -bw / 2 + 3, bh - 24, bw - 6, 2);
    fill(200, 240, 255); rect(bh / 2 - 6, -bw / 2 + 2, 4, bw - 4);
    fill(100, 150, 200); rect(-bh / 2 + 2, -bw / 2 + 2, 3, bw - 4);

    fill(50);
    let windowSpace = (bh - 24) / 4;
    for (let i = 0; i < 4; i++) {
        rect(-bh / 2 + 8 + (i * windowSpace), -bw / 2 + 1, windowSpace - 2, 2);
        rect(-bh / 2 + 8 + (i * windowSpace), bw / 2 - 3, windowSpace - 2, 2);
    }

    fill(150, 0, 0);
    if (inputState.down && bus.speed > 0) fill(255, 0, 0);
    rect(-bh / 2 - 1, -bw / 2 + 2, 3, 5); rect(-bh / 2 - 1, bw / 2 - 7, 3, 5);

    fill(255, 255, 200);
    rect(bh / 2 - 2, -bw / 2 + 2, 3, 5); rect(bh / 2 - 2, bw / 2 - 7, 3, 5);
    fill('#a5281b'); rect(bh / 2 - 16, -bw / 2 + 4, 3, bw - 8);

    fill(255); textAlign(CENTER, CENTER); translate(0, 0); rotate(PI / 2);
    textSize(12); text("46", 0, 0);
    pop();
}

function drawMobileControls() {
    if (vJoy.active) {
        push();
        // Base outer circle
        fill(255, 30);
        stroke(255, 80);
        strokeWeight(2);
        ellipse(vJoy.baseX, vJoy.baseY, vJoy.maxR * 2 + 20);

        // Inner thumb stick circle
        fill(255, 100);
        noStroke();
        ellipse(vJoy.stickX, vJoy.stickY, vJoy.maxR);
        pop();
    }
}


// ----------------------------------------
// SEQUENZA FINALE (INVARIATA NELLA FISICA, MIGLIORATO EDIFICIO)
// ----------------------------------------

function handleEndingSequence() {
    drawIslandEnvironment();
    drawUnivpmBuilding();

    explosionTimer++;

    if (gameState === 'EXPLODING_SHAKE') {
        // Se esplode assicura che scarichi comunque 60 persone minimall'esplosione
        if (passengers < 60) passengers = 60;

        push(); translate(random(-4, 4), random(-4, 4)); drawBus(); pop();
        if (explosionTimer % 2 === 0) particles.push(new SmokeParticle(bus.x, bus.y));
        if (explosionTimer > 90) {
            gameState = 'EXPLODING_BOOM'; explosionTimer = 0;
            for (let i = 0; i < passengers; i++) fleeingStudents.push(new FleeingStudent(bus.x + random(-20, 20), bus.y + random(-20, 20)));
        }
    } else if (gameState === 'EXPLODING_BOOM') {
        let r = explosionTimer * 20;
        fill(255, 100, 0, 255 - explosionTimer * 5); noStroke(); ellipse(bus.x, bus.y, r, r);
        fill(255, 255, 255, 200 - explosionTimer * 2); ellipse(bus.x, bus.y, r / 2, r / 2);
        if (explosionTimer > 60) { gameState = 'WALKING_AWAY'; explosionTimer = 0; }
    } else if (gameState === 'WALKING_AWAY' || gameState === 'FINAL_SCREEN') {
        for (let fs of fleeingStudents) { fs.update(); fs.draw(); }
        if (explosionTimer > 120) gameState = 'FINAL_SCREEN';
        if (gameState === 'FINAL_SCREEN') {
            textOpacity = min(textOpacity + 2, 255);
            fill(0, textOpacity * 0.85); rect(0, 0, width, height);
            fill(255, textOpacity); textAlign(CENTER, CENTER);

            textSize(24); text("Il 46 è PIENO !!!.", width / 2, height / 2 - 90);
            textSize(16); text("Fartela a piedi fino ad Ingegneria non è il massimo.", width / 2, height / 2 - 60);

            fill(UI_BUTTON_RED); textSize(36); text("VOTA GULLIVER", width / 2, height / 2 - 10);

            // Statistiche
            fill(200); textSize(14);
            text(`Statistiche Autista:\nPasseggeri Abbandonati: ${passengers}\nPedoni Stirati: ${runOverCount}`, width / 2, height / 2 + 50);

            // Pulsante Gioca Di Nuovo Finale
            let btnW = 200; let btnH = 50;
            let btnX = width / 2 - btnW / 2;
            let btnY = height - 100;

            fill(UI_BUTTON_RED); rect(btnX, btnY, btnW, btnH, 8);
            fill(255); textSize(20); text("GIOCA DI NUOVO", width / 2, btnY + btnH / 2);
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update(); particles[i].show();
        if (particles[i].alpha <= 0) particles.splice(i, 1);
    }
}

function drawUnivpmBuilding() {
    let ux = univpmBuilding.x;
    let uy = univpmBuilding.y;
    let uw = univpmBuilding.w;
    let uh = univpmBuilding.h;

    push();
    fill(0, 50); noStroke(); rect(ux + 8, uy + 12, uw, uh, 5);
    fill('#95a5a6'); rect(ux, uy, uw, uh, 3);
    fill('#7f8c8d'); rect(ux - 20, uy + 20, 20, uh - 20, 2);
    fill('#34495e'); for (let y = uy + 30; y < uy + uh - 10; y += 20) { rect(ux + 10, y, uw - 20, 10, 1); }
    fill('#2c3e50'); rect(ux - 5, uy - 20, uw + 10, 35, 4);
    fill('#e67e22'); rect(ux - 5, uy + 15, uw + 10, 4);
    fill(255); textAlign(CENTER, CENTER); textSize(18); text("UNIVPM", ux + uw / 2, uy - 10);
    textSize(10); fill('#bdc3c7'); text("INGEGNERIA", ux + uw / 2, uy + 5);
    fill('#2980b9'); rect(ux + uw / 2 - 15, uy + uh - 20, 30, 20, 2);
    fill(255, 200); rect(ux + uw / 2 - 13, uy + uh - 18, 12, 18); rect(ux + uw / 2 + 1, uy + uh - 18, 12, 18);
    pop();
}

class SmokeParticle {
    constructor(x, y) {
        this.x = x + random(-30, 30); this.y = y + random(-30, 30);
        this.vx = random(-1, 1); this.vy = random(-3, -1);
        this.alpha = 255; this.d = random(10, 40);
    }
    update() { this.x += this.vx; this.y += this.vy; this.alpha -= 5; }
    show() { noStroke(); fill(50, 50, 50, this.alpha); ellipse(this.x, this.y, this.d); }
}

class FleeingStudent extends Person {
    constructor(x, y) {
        super(x, y);
        this.targetX = univpmBuilding.x + univpmBuilding.w / 2 + random(-40, 40);
        this.targetY = univpmBuilding.y + univpmBuilding.h / 2 + random(20, 50);
        this.speed = random(0.5, 2);
    }
    update() {
        let dx = this.targetX - this.x; let dy = this.targetY - this.y;
        this.angle = atan2(dy, dx);
        if (dist(this.x, this.y, this.targetX, this.targetY) > 10) {
            this.x += cos(this.angle) * this.speed; this.y += sin(this.angle) * this.speed;
            this.walkCycle += this.speed * 0.2;
        } else { this.walkCycle = 0; }
    }
}

// ----------------------------------------
// INPUT TRIGGER UNIVERSALI
// ----------------------------------------

function mousePressed() {
    if (gameState === 'START') {
        if (isButtonTapped(mouseX, mouseY)) gameState = 'PLAYING';
    } else if (gameState === 'GAMEOVER') {
        if (isButtonTapped(mouseX, mouseY)) initGame();
    } else if (gameState === 'FINAL_SCREEN') {
        // Controlla il click sul pulsante "GIOCA DI NUOVO" a fine partita
        let btnW = 200; let btnH = 50;
        let btnX = width / 2 - btnW / 2;
        let btnY = height - 100;

        // Area per il tasto VOTA GULLIVER
        let votaY = height / 2 - 10;
        let votaX = width / 2;

        if (mouseX > btnX && mouseX < btnX + btnW && mouseY > btnY && mouseY < btnY + btnH) {
            initGame();
        } else if (abs(mouseX - votaX) < 150 && abs(mouseY - votaY) < 30) {
            // Altrimenti clicca il link Gulliver solo se tocca la scritta
            window.open('https://gulliver.univpm.it/', '_blank');
        }
    }
}

function touchStarted() {
    // Return false impedisce comportamenti di default come doppio click/scroll
    mousePressed();
    return false;
}
