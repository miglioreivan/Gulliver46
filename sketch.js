// --- Impostazioni ---
let canvasW, canvasH;

const COLOR_ISLAND = '#1a1a1c'; // Asfalto quasi nero
const COLOR_BUS_HEAD = '#e74c3c';
const COLOR_BUS_BODY = '#c0392b';
const COLOR_STUDENT_SHIRT = '#a93226'; // Rosso spento per le magliette
const COLOR_STUDENT_PANTS = '#2980b9';
const COLOR_STUDENT_SKIN = '#f1c40f';

// Colori UI Globale
const UI_DARK_BG = '#922b21'; // Modificato dal blu a rosso spento per abbinarsi all'esterno
const UI_BUTTON_RED = '#e74c3c';

// Font (usato bold per visibilità)
let mainFont = 'Arial';

// --- Entità: Bus (Fisica) ---
let bus = {
    x: 0, y: 0,
    w: 36, h: 96,
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
let gameState = 'START'; // START, PLAYING, LOADING, GAMEOVER, EXPLODING_SHAKE, etc.

const routeStations = [
    "Piazza Cavour",
    "P.Le Libertà",
    "1^ Via Bocconi",
    "Cimitero Tavernelle",
    "1^ Via S. Giacomo Della Marca",
    "Via S. Giacomo D. Marca - Fioraia",
    "Liceo Galilei",
    "Universita Ingegneria"
];

const FINAL_CRASH_STATION_INDEX = 4;
let currentStationIndex = 0;

let stationZone;  // L'area gialla in basso (parcheggio bus)
let waitingArea;  // Il marciapiede coi pedoni (safe zone contigua)
let waitingPeds = [];
let loadingTimer = 0;
let runOverCount = 0; // Contatore pedoni investiti
let crashStationInitialPeds = 0; // Numero iniziale pedoni alla fermata del crash
let bloodSplats = []; // Macchie rosse a terra per pedoni investiti
let lastPedestrianCount = 0; // Storico pedoni generati

// Animazione Finale
let explosionTimer = 0;
let particles = [];
let fleeingStudents = [];
let textOpacity = 0;
let univpmBuilding = { x: 0, y: 0, w: 150, h: 100 };

// UX/UI Polishing Globals
let menuPeds = [];
const ironicMessages = [
    "Patente Sospesa!",
    "Questo non è un rally!",
    "Il Rettore non sarà felice...",
    "Hai scambiato il bus per un go-kart?",
    "Ripassa il codice della strada!",
    "Troppa fretta di andare a lezione?",
    "Ancona non è fatta per questa velocità!"
];
let currentIronicMessage = "";

// --- Setup ---
function setup() {
    // Garantisce dimensioni minime non nulle (evita crash Safari)
    // Se windowWidth o windowHeight non sono popolati correttamente da p5, usiamo i valori nativi del browser.
    let w = windowWidth || window.innerWidth || 320;
    let h = windowHeight || window.innerHeight || 480;
    
    canvasW = max(320, min(w * 0.95, 800));
    canvasH = max(480, min(h * 0.95, 1200));
    
    pixelDensity(1); // Importante chiamarlo prima di createCanvas per stabilità su alcuni Safari
    let cnv = createCanvas(canvasW, canvasH);
    
    // Sicurezza nel caso p5 non trovasse l'elemento automaticamente
    let container = document.getElementById('game-container');
    if (container) cnv.parent(container);

    textFont(mainFont);
    textStyle(BOLD);

    // Compatibilità massima listener eventi
    cnv.elt.addEventListener("touchstart", function(e) { e.preventDefault(); }, { passive: false });
    cnv.elt.addEventListener("touchmove", function(e) { e.preventDefault(); }, { passive: false });

    univpmBuilding = { x: 40, y: 70, w: 100, h: 80 };

    for (let i = 0; i < 15; i++) {
        menuPeds.push(new Person(random(width), random(height)));
    }

    initGame();
}

function windowResized() {
    let w = windowWidth || window.innerWidth || 320;
    let h = windowHeight || window.innerHeight || 480;
    canvasW = max(320, min(w * 0.95, 800));
    canvasH = max(480, min(h * 0.95, 1200));
    resizeCanvas(canvasW, canvasH);
}

function initGame() {
    bus.x = width / 2;
    bus.y = height * 0.8;
    bus.angle = PI;
    bus.speed = 0;
    passengers = 0;
    currentStationIndex = 0;
    runOverCount = 0;
    bus.acceleration = 0.1; // Ripristina accelerazione (poteva essere 0 dopo LOADING)
    vJoy.active = false;    // Reset joystick
    inputState = { up: false, down: false, left: false, right: false }; // Reset tasti
    lastPedestrianCount = 0; // Reset contatore pedoni per spawnStationGroup
    crashStationInitialPeds = 0;
    bloodSplats = [];
    explosionTimer = 0;
    particles = [];
    fleeingStudents = [];
    textOpacity = 0;

    spawnStationGroup();
    currentIronicMessage = random(ironicMessages);
    gameState = 'START';
}

// let lastPedestrianCount = 0; // RIMOSSA DA QUI E SPOSTATA IN ALTO
function spawnStationGroup() {
    waitingPeds = [];
    bloodSplats = [];

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
    let areaW = 150; // Larghezza totale zona fermata
    let areaH = 120;  // Altezza posteggio
    let sidewalkH = 90; // Altezza marciapiede
    let totalH = sidewalkH + areaH + 70; // Spazio extra per il nome fermata e il cartello

    let safetyCounter = 0;
    while (!validArea && safetyCounter < 50) {
        safetyCounter++;
        // Garantisce che sx e sy permettano alla fermata completa (nome compreso) di stare in gioco
        sx = random(30, width - areaW - 30);
        sy = random(80, height - totalH - 10);

        // Evita l'area del monitor informazioni in alto a destra
        let monAreaX = width - 200;
        let monAreaY = 320;
        if (sx + areaW > monAreaX && sy < monAreaY) continue;

        // Limita il loop se non trova spazio: dopo 50 tentativi accetta la posizione corrente
        if (dist(sx + areaW / 2, sy + sidewalkH + areaH / 2, bus.x, bus.y) > 200 || safetyCounter >= 50) {
            validArea = true;
        }
    }

    // Il marciapiede coi pedoni sta SOPRA
    waitingArea = { x: sx, y: sy, w: areaW, h: sidewalkH };
    // L'area di posteggio per il bus sta SOTTO il marciapiede
    stationZone = { x: sx, y: sy + sidewalkH, w: areaW, h: areaH };

    // Verifichiamo che la scritta della fermata non esca a destra/sinistra
    // Se fosse più larga del marciapiede (sx + areaW), lo spawn ne tiene già conto nel while.
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
    } else if (gameState === 'LOADING') {
        bus.speed = 0;
        processStationLoading();
        drawStationMarker();
        drawPedestrians();
        drawBus();
        drawHUD();
        drawRouteMonitor();
    } else if (gameState === 'PLAYING') {
        handleInput();
        updatePhysics();
        checkStationZone();
        drawStationMarker();
        drawPedestrians();
        drawBus();
        drawHUD();
        drawRouteMonitor();
        drawMobileControls();
    } else if (gameState === 'GAMEOVER') {
        drawStationMarker();
        drawPedestrians();
        drawBus();
        drawGameOverMenu();
    } else {
        handleEndingSequence();
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
            // Velocità massima touch: 100% della maxSpeed
            let touchMaxSpeed = bus.maxSpeed * 1.0;
            let targetSpeed = map(distPx, 10, vJoy.maxR, 0, touchMaxSpeed, true);

            // Fai accelerare in modo leggermente più fluido
            bus.speed = lerp(bus.speed, targetSpeed, 0.8);
        } else {
            // Se torna al centro, stop immediato su mobile
            bus.speed = 0;
        }
    } else {
        // Controlli tastiera stile veicolo
        if (inputState.up) bus.speed += bus.acceleration;
        else if (inputState.down) bus.speed -= bus.acceleration;
        else {
            // Se siamo su mobile (width < 500) lo fermiamo subito se nessun tasto è premuto
            if (width < 500) {
                bus.speed = 0;
            } else {
                if (bus.speed > 0) bus.speed -= bus.friction;
                if (bus.speed < 0) bus.speed += bus.friction;
                if (abs(bus.speed) < bus.friction) bus.speed = 0;
            }
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

    // Inizializza il contatore alla prima volta che si carica la fermata PRE-crash
    // (il loading avviene a index 3; quando finisce, currentStationIndex diventa 4 = FINAL_CRASH)
    if (currentStationIndex === FINAL_CRASH_STATION_INDEX - 1 && crashStationInitialPeds === 0) {
        crashStationInitialPeds = waitingPeds.length;
    }

    // Carica i pedoni uno ad uno ogni 4 frame (più veloce di prima)
    if (loadingTimer > 4) {
        // Cerca il primo pedone che non sta ancora "salendo"
        for (let p of waitingPeds) {
            if (!p.isBoarding) {
                p.isBoarding = true;
                loadingTimer = 0;
                break;
            }
        }
    }

    // --- FERMATA DEL CRASH: esplode quando sale il 50% dei passeggeri ---
    if (currentStationIndex === FINAL_CRASH_STATION_INDEX - 1 && crashStationInitialPeds > 0) {
        let boarded = crashStationInitialPeds - waitingPeds.length;
        if (boarded >= Math.ceil(crashStationInitialPeds * 0.5)) {
            gameState = 'EXPLODING_SHAKE';
            return;
        }
    }

    // Se tutti i pedoni sono saliti (l'array è vuoto perché vengono rimossi dopo l'animazione)
    if (waitingPeds.length === 0) {
        // Aspetta mezzo secondo (30 frame) dopo l'ultimo caricamento per dare feedback
        if (loadingTimer > 30) {
            bus.acceleration = 0.1;
            currentStationIndex++;
            if (currentStationIndex >= routeStations.length || currentStationIndex === FINAL_CRASH_STATION_INDEX) {
                gameState = 'EXPLODING_SHAKE';
            } else {
                spawnStationGroup();
                gameState = 'PLAYING';
            }
            loadingTimer = 0;
        }
    }
}

// ----------------------------------------
// GRAFICA AMBIENTE E MENU COERENTI
// ----------------------------------------

function drawIslandEnvironment() {
    background(COLOR_ISLAND);
}

function drawStationMarker() {
    push();
    // 1. Marciapiede (Sidewalk) - Texture a mattonelle
    push();
    fill('#bdc3c7'); // Grigio chiaro
    stroke('#34495e');
    strokeWeight(1);
    rect(waitingArea.x, waitingArea.y, waitingArea.w, waitingArea.h, 5);

    // Pattern a mattonelle
    stroke(0, 40);
    let tileSize = 15;
    for (let x = waitingArea.x + tileSize; x < waitingArea.x + waitingArea.w; x += tileSize) {
        line(x, waitingArea.y, x, waitingArea.y + waitingArea.h);
    }
    for (let y = waitingArea.y + tileSize; y < waitingArea.y + waitingArea.h; y += tileSize) {
        line(waitingArea.x, y, waitingArea.x + waitingArea.w, y);
    }

    // Bordo (Kerb)
    fill('#7f8c8d');
    noStroke();
    rect(waitingArea.x, waitingArea.y + waitingArea.h - 6, waitingArea.w, 6, 0, 0, 5, 5);
    pop();

    // 2. Cartello Fermata (Palo e targa)
    let signX = waitingArea.x + 15;
    let signY = waitingArea.y - 20;
    // Palo
    fill(60);
    rect(signX - 2, signY + 15, 4, 30);
    // Targa Bus
    fill(UI_BUTTON_RED); // Colore coerente col tema
    stroke(255);
    strokeWeight(1.5);
    rect(signX - 14, signY, 28, 18, 3);
    noStroke();
    fill(255);
    textSize(10); textAlign(CENTER, CENTER);
    text("BUS", signX, signY + 9);

    // 3. Posteggio (dove deve fermarsi il Bus) bianca tratteggiata
    stroke(255);
    strokeWeight(3);
    drawingContext.setLineDash([8, 8]);
    noFill();
    rect(stationZone.x, stationZone.y, stationZone.w, stationZone.h, 5);
    drawingContext.setLineDash([]);

    // Scritta a terra "BUS" in giallo
    noStroke();
    fill(255, 204, 0, 150); // Giallo stradale leggermente trasparente
    textSize(28);
    textAlign(CENTER, CENTER);
    text("BUS", stationZone.x + stationZone.w / 2, stationZone.y + stationZone.h / 2);

    // Testo Fermata (Design "pillola" moderno sotto la fermata)
    let stName = routeStations[currentStationIndex];
    textSize(14);
    let tw = textWidth(stName);
    let pillW = tw + 30; // padding laterale
    let pillH = 26;
    let pillX = stationZone.x + stationZone.w / 2 - pillW / 2;
    let pillY = stationZone.y + stationZone.h + 15; // Distanza dalla linea di parcheggio

    // Sfondo della pillola
    fill(UI_DARK_BG); // Stile scuro/rosso associato al tema 
    stroke(255, 100);
    strokeWeight(1.5);
    rect(pillX, pillY, pillW, pillH, 13); // Raggio 13 per forma super arrotondata

    // Testo
    noStroke();
    fill(255);
    textAlign(CENTER, CENTER);
    text(stName, stationZone.x + stationZone.w / 2, pillY + pillH / 2);
    pop();
}

function drawHUD() {
    push();
    fill(UI_DARK_BG);
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
    text(`Pros: ${routeStations[currentStationIndex]}`, width - 15, 27);

    if (gameState === 'LOADING') {
        fill(0, 150);
        rect(0, height / 2 - 30, width, 60);
        textAlign(CENTER, CENTER);
        fill(255, 204, 0); // Giallo evidenziatore
        textSize(28);
        text("FERMO E CARICA...", width / 2, height / 2);
    } else if (gameState === 'PLAYING') {
        fill(255);
        textAlign(CENTER, TOP);
        textSize(16);
        stroke(0);
        strokeWeight(3);
        // Riportato in basso come richiesto
        text("Sposta l'autobus all'interno della zona tratteggiata", width / 2, height - 30);
        noStroke();
    }
    pop();
}

function drawRouteMonitor() {
    push();
    let pad = 10;
    let monW = 180;
    let monH = routeStations.length * 25 + 40;
    let monX = width - monW - pad;
    let monY = 65;

    // Sfondo monitor stile Trenitalia
    fill(245, 245, 250, 220);
    stroke(200);
    strokeWeight(1);
    rect(monX, monY, monW, monH, 5);

    // Intestazione
    fill(0, 50, 150);
    noStroke();
    rect(monX, monY, monW, 25, 5, 5, 0, 0);
    fill(255);
    textSize(11);
    textAlign(CENTER, CENTER);
    text("INFORMAZIONI VIAGGIO", monX + monW / 2, monY + 12);

    // Linea verticale del percorso
    let lineX = monX + 20;
    let startY = monY + 45;
    let stepY = 25;

    // Se siamo in fase di esplosione finale o dopo l'esplosione
    let isExploded = (gameState === 'EXPLODING_SHAKE' || gameState === 'EXPLODING_BOOM' || gameState === 'WALKING_AWAY' || gameState === 'FINAL_SCREEN');

    for (let i = 0; i < routeStations.length; i++) {
        let sy = startY + i * stepY;

        // Colore della linea e dei punti
        let dotColor = color(100);
        let textColor = color(50);
        let isFuture = i > currentStationIndex;
        let isCurrent = i === currentStationIndex;

        if (isExploded && i >= FINAL_CRASH_STATION_INDEX) {
            dotColor = color(200, 0, 0);
            textColor = color(200, 0, 0);
        } else if (isCurrent) {
            dotColor = color(0, 50, 200);
            textColor = color(0, 50, 200);
        } else if (isFuture) {
            dotColor = color(150);
            textColor = color(100);
        } else {
            // Passate
            dotColor = color(180);
            textColor = color(180);
        }

        // Disegna la linea di collegamento (tranne l'ultimo)
        if (i < routeStations.length - 1) {
            // Linea grigia per segmenti futuri, blu chiaro per passati
            if (isExploded && i >= FINAL_CRASH_STATION_INDEX - 1) {
                stroke(200, 0, 0); // Rosso se esploso
            } else if (i < currentStationIndex) {
                stroke(0, 100, 255); // Blu per segmenti passati
            } else {
                stroke(180); // Grigio per futuri
            }
            strokeWeight(3);
            line(lineX, sy, lineX, sy + stepY);
        }

        // Punto fermata
        noStroke();
        fill(dotColor);
        ellipse(lineX, sy, 8, 8);

        // Testo fermata
        textAlign(LEFT, CENTER);
        textSize(isCurrent ? 10 : 9);
        if (isCurrent) {
            // Highlight blu per fermata corrente tipo Trenitalia
            fill(0, 50, 200, 40);
            rect(lineX + 10, sy - 10, monW - 40, 20, 2);
            fill(0, 50, 200);
            textStyle(BOLD);
        } else {
            fill(textColor);
            textStyle(NORMAL);
        }

        // Tronca il testo se troppo lungo
        let name = routeStations[i];
        if (name.length > 22) name = name.substring(0, 20) + "..";
        text(name, lineX + 15, sy);
    }
    pop();
}

// Menu Globale Standardizzato
function drawModalMessage(title, subtitle, buttons, showPeds = false) {
    push();

    if (showPeds) {
        for (let p of menuPeds) {
            p.x += cos(p.angle) * 0.5;
            p.y += sin(p.angle) * 0.5;
            if (p.x < 0) p.x = width; if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height; if (p.y > height) p.y = 0;
            p.draw();
        }
    }

    fill(0, 180);
    rect(0, 0, width, height);

    fill(UI_BUTTON_RED);
    textAlign(CENTER, CENTER);
    textSize(42);
    text(title, width / 2, height / 3 - 50);

    stroke(UI_BUTTON_RED);
    strokeWeight(3);
    line(width / 2 - 40, height / 3 - 10, width / 2 + 40, height / 3 - 10);
    noStroke();

    fill(255);
    textSize(18);
    text(subtitle, width / 2, height / 3 + 40);

    // Se passiamo un pulsante solo lo convertiamo in array per logica unica
    if (!Array.isArray(buttons)) buttons = [buttons];

    let btnW = 240;
    let btnH = 60;
    let spacing = 15;
    let pulse = sin(frameCount * 0.1) * 3;

    for (let i = 0; i < buttons.length; i++) {
        let btnY = height / 2 + 80 + i * (btnH + spacing);
        let btnX = width / 2 - (btnW + pulse) / 2;

        fill(UI_BUTTON_RED);
        rect(btnX, btnY, btnW + pulse, btnH, 12);

        fill(255);
        textSize(22);
        text(buttons[i], width / 2, btnY + btnH / 2);
    }

    pop();
}

function drawStartMenu() {
    drawModalMessage(
        "GULLIVER 46",
        "Riuscirai a portare tutti a lezione?",
        ["ACCENDI MOTORE"],
        true
    );
}

function drawGameOverMenu() {
    drawIslandEnvironment();
    drawUnivpmBuilding();
    drawRouteMonitor();

    let isMobile = width < 500;

    push();
    fill(0, 180);
    rect(0, 0, width, height);

    let modalW = isMobile ? width * 0.9 : 400;
    let modalH = isMobile ? 350 : 320;
    let mx = width / 2 - modalW / 2;
    let my = height / 2 - modalH / 2;

    // Pannello Modal
    fill(UI_DARK_BG);
    stroke(255, 30);
    strokeWeight(2);
    rect(mx, my, modalW, modalH, 15);

    // Titolo (con wrapping per evitare overflow)
    textAlign(CENTER, TOP);
    textStyle(BOLD);
    fill(UI_BUTTON_RED);
    textSize(isMobile ? 22 : 26);
    let titlePadding = 20;
    text(currentIronicMessage, width / 2 - modalW / 2 + titlePadding, my + 30, modalW - titlePadding * 2);

    // Corpo
    fill(255);
    textSize(isMobile ? 14 : 16);
    textLeading(20);
    textAlign(CENTER, CENTER);
    let statsText = `Passeggeri arrivati in ritardo: ${passengers}\nPedoni stirati: ${runOverCount}\n\nNon scoraggiarti,\nGulliver crede in te!`;
    text(statsText, width / 2, my + modalH / 2 + 25);

    // Bottone Riprova
    let btnW = isMobile ? modalW * 0.7 : 240;
    let btnH = 50;
    let bx = width / 2;
    let by = my + modalH - 70;

    fill(UI_BUTTON_RED);
    noStroke();
    rect(bx - btnW / 2, by, btnW, btnH, 10);
    fill(255);
    textSize(isMobile ? 18 : 20);
    text("RIPROVA", bx, by + btnH / 2);
    pop();
}

let btnBounds = { w: 240, h: 60 }; // Aumentata altezza per touch mobile (coerente con drawModalMessage)
function isButtonAt(mx, my, x, y, w = btnBounds.w, h = btnBounds.h) {
    return (mx > x - w / 2 && mx < x + w / 2 && my > y && my < y + h);
}

function isButtonTapped(mx, my, index = 0) {
    let btnY = height / 2 + 80 + index * (btnBounds.h + 15);
    return isButtonAt(mx, my, width / 2, btnY);
}

// ----------------------------------------
// ENTITÀ (PERSONE E BUS)
// ----------------------------------------

class Person {
    constructor(x, y) {
        this.x = x; this.y = y; this.angle = random(TWO_PI);
        this.offsetTimer = random(100); this.walkCycle = 0;
        this.shirtColor = [random(50, 255), random(50, 255), random(50, 255)];
        this.isBoarding = false;
    }
    draw() {
        push(); translate(this.x, this.y); rotate(this.angle);

        // 1. Ombra minuscola per distacco dal terreno
        noStroke();
        fill(0, 40);
        ellipse(0, 2, 12, 12);

        // 2. Stroke scuro per contrasto ("Border" intorno alla forma)
        stroke(0, 100);
        strokeWeight(1);

        let legOffset = sin(this.walkCycle) * 4;
        fill(COLOR_STUDENT_PANTS); // Jeans scuri
        rect(-5, -6 + legOffset, 4, 8, 2);
        rect(-5, 2 - legOffset, 4, 8, 2);

        fill(this.shirtColor[0], this.shirtColor[1], this.shirtColor[2]); rect(-6, -5, 12, 10, 3);
        let armOffset = sin(this.walkCycle + PI) * 4;
        fill(COLOR_STUDENT_SKIN);
        rect(0, -7 + armOffset, 4, 3, 1);
        rect(0, 4 - armOffset, 4, 3, 1);

        // Testa e Capelli
        ellipse(0, 0, 8, 8);
        noStroke(); // Non vogliamo lo stroke che taglia nel mezzo dell'arco dei capelli
        fill('#8e44ad'); arc(0, 0, 8, 10, -PI / 2, PI / 2);

        if (this.walkCycle === 0) rotate(sin(frameCount * 0.1 + this.offsetTimer) * 0.2);
        pop();
    }
}

function drawAngryBubble(x, y) {
    // Fumetto faccina arrabbiata sopra il pedone
    push();
    let bx = x;
    let by = y - 22;
    let wobble = sin(frameCount * 0.25 + x) * 2; // oscillazione
    by += wobble;

    // Sfondo fumetto
    fill(255, 60, 60, 220);
    noStroke();
    ellipse(bx, by, 18, 16);
    // Codina del fumetto
    triangle(bx - 3, by + 7, bx + 3, by + 7, bx, by + 13);

    // Faccina arrabbiata
    fill(255);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(10);
    noStroke();
    // Usa "!" ogni 2 frame alternato per effetto lampeggio
    text(frameCount % 40 < 20 ? "😠" : "!", bx, by);
    pop();
}

function drawBloodSplats() {
    noStroke();
    for (let s of bloodSplats) {
        // Blob irregolare: cerchi sovrapposti con seed casuale per forma organica
        randomSeed(s.seed);
        let n = floor(random(4, 7));
        for (let i = 0; i < n; i++) {
            let ox = random(-s.r * 0.6, s.r * 0.6);
            let oy = random(-s.r * 0.4, s.r * 0.4);
            let ew = random(s.r * 0.6, s.r * 1.2);
            let eh = random(s.r * 0.4, s.r * 0.8);
            fill(180, 0, 0, s.alpha);
            ellipse(s.x + ox, s.y + oy, ew, eh);
        }
    }
    randomSeed(); // reset seed
}

function drawPedestrians() {
    let isCrashStation = (currentStationIndex === FINAL_CRASH_STATION_INDEX - 1);
    let crashLoadingStarted = isCrashStation && crashStationInitialPeds > 0;

    // Disegna prima le macchie di sangue a terra
    drawBloodSplats();

    for (let i = waitingPeds.length - 1; i >= 0; i--) {
        let p = waitingPeds[i];

        // Gestione Animazione Salita (Boarding)
        if (p.isBoarding) {
            let dx = bus.x - p.x;
            let dy = bus.y - p.y;
            let d = sqrt(dx * dx + dy * dy);
            p.angle = atan2(dy, dx);

            if (d > 5) {
                p.x += (dx / d) * 2;
                p.y += (dy / d) * 2;
                p.walkCycle += 0.3;
            } else {
                // Arrivato al bus!
                passengers++;
                waitingPeds.splice(i, 1);
                continue;
            }
        }

        // Controlliamo se l'autobus investe un pedone (solo se NON sta salendo)
        if (!p.isBoarding && dist(bus.x, bus.y, p.x, p.y) < 50 && abs(bus.speed) > 0.1) {
            p.runOver = true;
            runOverCount++;
            // Lascia una macchia rossa a terra
            bloodSplats.push({ x: p.x, y: p.y, r: random(18, 28), alpha: random(160, 210), seed: floor(random(100000)) });
            waitingPeds.splice(i, 1);
            continue;
        }

        p.draw();

        // Alla fermata del crash, i pedoni in attesa si lamentano
        if (crashLoadingStarted && !p.isBoarding) {
            drawAngryBubble(p.x, p.y);
        }
    }
}

function drawBus() {
    push();
    translate(bus.x, bus.y);
    rotate(bus.angle);

    let bw = bus.w;
    let bh = bus.h;

    // 1. Ombra proiettata a terra (leggermente traslata)
    noStroke();
    fill(0, 40);
    rect(-bh / 2 + 4, -bw / 2 + 6, bh, bw, 6);

    // 2. Specchietti Retrovisori (nuovi)
    fill(COLOR_BUS_BODY);
    stroke(0, 100);
    strokeWeight(1);
    // Specchietto destro e sinistro (posizionati davanti verso le ruote)
    rect(bh / 2 - 10, -bw / 2 - 4, 6, 4, 1);
    rect(bh / 2 - 10, bw / 2, 6, 4, 1);

    // 3. Corpo Principale scocca
    noStroke();
    fill(COLOR_BUS_BODY);
    rect(-bh / 2, -bw / 2, bh, bw, 5);

    // 4. Dettaglio Tetto (Effetto 3D / Sfumatura)
    // Parte superiore più chiara per simulare la luce dall'alto
    fill(255, 30);
    rect(-bh / 2 + 2, -bw / 2 + 2, bh - 4, bw / 4, 2);
    // Parte centrale più scura
    fill(0, 20);
    rect(-bh / 2 + 2, bw / 4 - bw / 2, bh - 4, bw / 2, 0);

    // 5. Parabrezza e Lunotto
    // Parabrezza (davanti)
    fill(180, 230, 255);
    rect(bh / 2 - 14, -bw / 2 + 2, 10, bw - 4, 2);
    // Riflesso sul vetro
    fill(255, 150);
    rect(bh / 2 - 12, -bw / 2 + 4, 2, bw - 8, 1);

    // Lunotto (dietro)
    fill(100, 150, 200);
    rect(-bh / 2 + 2, -bw / 2 + 3, 5, bw - 6, 1);

    // 6. Finestrini laterali (migliorati)
    fill(40);
    let winCount = 5;
    let winSpace = (bh - 25) / winCount;
    for (let i = 0; i < winCount; i++) {
        let wx = -bh / 2 + 12 + (i * winSpace);
        rect(wx, -bw / 2 + 1, winSpace - 3, 2); // Sopra
        rect(wx, bw / 2 - 3, winSpace - 3, 2);   // Sotto
    }

    // 7. Luci e Segnaletica
    // Fari Anteriori (Bianchi/Gialli con leggero bagliore)
    drawingContext.shadowBlur = 10;
    drawingContext.shadowColor = 'white';
    fill(255, 255, 220);
    rect(bh / 2 - 4, -bw / 2 + 3, 4, 7, 1);
    rect(bh / 2 - 4, bw / 2 - 10, 4, 7, 1);
    drawingContext.shadowBlur = 0;

    // Luci Posteriori (Rosse / Stop)
    let isBraking = inputState.down && bus.speed > 0;
    fill(isBraking ? color(255, 0, 0) : color(150, 0, 0));
    if (isBraking) {
        drawingContext.shadowBlur = 15;
        drawingContext.shadowColor = 'red';
    }
    rect(-bh / 2 - 2, -bw / 2 + 3, 4, 8, 1);
    rect(-bh / 2 - 2, bw / 2 - 11, 4, 8, 1);
    drawingContext.shadowBlur = 0;

    // Indicatore Linea "46" sul retro
    fill('#a5281b');
    rect(bh / 2 - 16, -bw / 2 + 4, 2, bw - 8);

    // Numero 46 al centro del tetto
    fill(255);
    textAlign(CENTER, CENTER);
    push();
    rotate(PI / 2);
    textSize(18);
    text("46", 0, 0);
    pop();

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
    drawRouteMonitor();

    explosionTimer++;

    if (gameState === 'EXPLODING_SHAKE') {
        // Se esplode con 0 passeggeri a bordo, forza 60 per l'animazione finale
        if (passengers === 0) passengers = 60;

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
            let isMobile = width < 500;
            textOpacity = min(textOpacity + 2, 255);

            // Sfondo oscurato
            fill(0, textOpacity * 0.9); rect(0, 0, width, height);

            push();
            tint(255, textOpacity);
            textAlign(CENTER, CENTER);

            // Testo Principale
            fill(255, textOpacity);
            textStyle(BOLD);
            textSize(isMobile ? 26 : 32);
            let titleY = height * 0.15;
            text("Il 46 è PIENO !!!", width / 2, titleY);

            // Subtitle
            textStyle(NORMAL);
            textSize(isMobile ? 12 : 14);
            textLeading(isMobile ? 18 : 22);
            let subY = titleY + (isMobile ? 45 : 55);
            text("Farsela a piedi fino a Montedago\nnon è il massimo.", width / 2, subY);
            text("Gulliver lavora da anni per un trasporto migliore.", width / 2, subY + (isMobile ? 35 : 45));

            let btnW = isMobile ? min(width * 0.85, 280) : 320;
            let btnH = isMobile ? 45 : 50;
            let btnX = width / 2;
            let btnSpacing = isMobile ? 12 : 18;

            // Tasto 1: Vota Gulliver (Main)
            let btnVotaY = height * 0.40;
            let cVota = color(UI_BUTTON_RED); cVota.setAlpha(textOpacity);
            fill(cVota); rect(btnX - btnW / 2, btnVotaY, btnW, btnH, 10);
            fill(255, textOpacity); textStyle(BOLD); textSize(isMobile ? 18 : 22);
            text("VOTA GULLIVER", width / 2, btnVotaY + btnH / 2);

            // Tasto 2: Report Trasporti (Secondary)
            let btnReportY = btnVotaY + btnH + btnSpacing;
            let cReport = color('#2980b9'); cReport.setAlpha(textOpacity);
            fill(cReport); rect(btnX - btnW / 2, btnReportY, btnW, btnH, 10);
            fill(255, textOpacity); textStyle(BOLD); textSize(isMobile ? 13 : 15);
            text("LEGGI IL REPORT TRASPORTI", width / 2, btnReportY + btnH / 2);

            // Statistiche
            let cStats = color(200); cStats.setAlpha(textOpacity);
            fill(cStats); textStyle(NORMAL); textSize(isMobile ? 11 : 13);
            let statsY = btnReportY + btnH + (isMobile ? 40 : 50);
            text(`Statistiche:\nPasseggeri arrivati in ritardo: ${passengers}\nPedoni stirati: ${runOverCount}`, width / 2, statsY);

            // Pulsante Gioca Di Nuovo Finale
            let btnRipartiY = height - (isMobile ? 70 : 80);
            let cRipBtn = color(50); cRipBtn.setAlpha(textOpacity);
            fill(cRipBtn);
            stroke(255, textOpacity * 0.5); strokeWeight(2);
            rect(btnX - btnW / 2, btnRipartiY, btnW, btnH, 8);
            noStroke(); fill(255, textOpacity); textStyle(BOLD); textSize(18);
            text("GIOCA DI NUOVO", width / 2, btnRipartiY + btnH / 2);
            pop();
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
    // 1. Ombra proiettata
    fill(0, 40); noStroke();
    rect(ux + 4, uy + 4, uw, uh, 4);

    // 2. Struttura Principale (Vetro e Acciaio)
    fill('#2c3e50'); rect(ux, uy, uw, uh, 4); // Blu scuro cianotico

    // 3. Facciata Continua (Vetri verticali)
    fill('#34495e');
    let winW = (uw - 25) / 4;
    for (let i = 0; i < 4; i++) {
        let wx = ux + 5 + i * (winW + 5);
        rect(wx, uy + 10, winW, uh - 20, 1);
        // Riflesso
        fill(255, 20);
        rect(wx + 2, uy + 12, winW / 2, uh - 30);
        fill('#34495e');
    }

    // 4. Insegna Superiore Integrata
    fill('#1a1a1c'); rect(ux - 5, uy - 30, uw + 10, 40, 5);
    stroke('#e67e22'); strokeWeight(2); line(ux - 5, uy + 10, ux + uw + 5, uy + 10);
    noStroke();

    fill(255); textAlign(CENTER, CENTER); textStyle(BOLD);
    textSize(16); text("UNIVPM", ux + uw / 2, uy - 18);
    fill('#bdc3c7'); textSize(8); text("FACOLTÀ DI INGEGNERIA", ux + uw / 2, uy - 5);

    // 5. Ingresso Sottolineato
    fill('#2980b9'); rect(ux + uw / 2 - 25, uy + uh - 12, 50, 12, 2); // Base ingresso
    fill('#ecf0f1');
    rect(ux + uw / 2 - 20, uy + uh - 15, 18, 15, 1);
    rect(ux + uw / 2 + 2, uy + uh - 15, 18, 15, 1);
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

function touchStarted() {
    // Su mobile touchStarted è più reattivo di touchEnded/mouseClicked
    mouseClicked();
    return false;
}

function touchEnded() {
    // Manteniamo per sicurezza ma touchStarted dovrebbe gestire l'input UI
    return false;
}

function mouseClicked() {
    if (gameState === 'START') {
        if (isButtonTapped(mouseX, mouseY, 0)) {
            gameState = 'PLAYING';
        }
    } else if (gameState === 'GAMEOVER') {
        let isMobile = width < 500;
        let modalW = isMobile ? width * 0.9 : 400;
        let modalH = isMobile ? 350 : 320;
        let my = height / 2 - modalH / 2;
        let by = my + modalH - 70;
        let btnW = isMobile ? modalW * 0.7 : 240;
        let btnH = 50;

        if (isButtonAt(mouseX, mouseY, width / 2, by, btnW, btnH)) {
            initGame();
        }
    } else if (gameState === 'FINAL_SCREEN') {
        let isMobile = width < 500;
        let btnW = isMobile ? min(width * 0.85, 280) : 320;
        let btnH = isMobile ? 45 : 50;
        let btnX = width / 2;
        let btnSpacing = isMobile ? 12 : 18;

        let btnVotaY = height * 0.40;
        let btnReportY = btnVotaY + btnH + btnSpacing;
        let btnRipartiY = height - (isMobile ? 70 : 80);

        if (isButtonAt(mouseX, mouseY, btnX, btnRipartiY, btnW, btnH)) {
            initGame();
        } else if (isButtonAt(mouseX, mouseY, btnX, btnVotaY, btnW, btnH)) {
            window.open('https://www.gulliversinistrauniversitaria.it/', '_blank');
        } else if (isButtonAt(mouseX, mouseY, btnX, btnReportY, btnW, btnH)) {
            window.open('https://ugc.production.linktr.ee/818a15e8-6f08-441d-84f9-d8a20c7a6499_REPORT-QUESTIONARIO-TRASPORTI.pdf', '_blank');
        }
    }
}


