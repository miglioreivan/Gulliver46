// --- Impostazioni ---
let canvasW, canvasH;

const COLOR_ISLAND = '#ecf0f1';
const COLOR_ROAD = '#bdc3c7'; // Strada più scura su cui il bus si muove preferibilmente
const COLOR_BUS_HEAD = '#e74c3c';
const COLOR_BUS_BODY = '#c0392b';
const COLOR_STUDENT_SHIRT = '#3498db';
const COLOR_STUDENT_PANTS = '#2980b9';
const COLOR_STUDENT_SKIN = '#f1c40f';

// --- Entità: Bus (Fisica) ---
let bus = {
    x: 0,
    y: 0,
    w: 24, // Larghezza (circa 1 "isola" street)
    h: 64, // Lunghezza (circa 2.5 "isole")
    angle: 0, // Rotazione attuale
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
// 'START', 'PLAYING', 'LOADING', 'GAMEOVER', 'EXPLODING_SHAKE', 'EXPLODING_BOOM', 'WALKING_AWAY', 'FINAL_SCREEN'

const routeStations = [
    "Piazza Cavour - Capolinea",
    "Via Frediani",
    "Via Giannelli",
    "Via Bocconi (Semaforo)",
    "Cimitero Tavernelle",
    "Parcheggio Cimitero",
    "Via San Giacomo Della Marca",
    "Parcheggio Via Ranieri",
    "Liceo Galilei",
    "Universita' Ingegneria"
];
let currentStationIndex = 0;
let stationZone; // {x, y, w, h}
let waitingPeds = []; // Persone non ancora salite all'esterno (oggetti Person)
let loadingTimer = 0; // Timer per far salire le persone una ad una

// Variabili Animazione Finale
let explosionTimer = 0;
let particles = [];
let fleeingStudents = [];
let textOpacity = 0;

// --- Setup ---
function setup() {
    canvasW = min(windowWidth * 0.9, 800);
    canvasH = min(windowHeight * 0.95, 1200);
    createCanvas(canvasW, canvasH);

    // Per mobile: evita che il touch default muova la pagina
    let cnv = document.querySelector("canvas");
    cnv.addEventListener("touchstart", function (e) { e.preventDefault() });

    initGame();
}

function initGame() {
    bus.x = width / 2;
    bus.y = height * 0.8;
    bus.angle = PI; // Guarda verso l'alto (Nord)
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
    // Molte più persone rispetto allo snake, scalate per livello
    let numStudents = 5 + (currentStationIndex * 3);

    // Posiziona l'area fermata casualmente ma abbastanza lontana dal bus
    let validArea = false;
    let sx, sy;
    while (!validArea) {
        sx = random(50, width - 100);
        sy = random(100, height - 150);
        // Non troppo vicino al bus
        if (dist(sx, sy, bus.x, bus.y) > 150) {
            validArea = true;
        }
    }

    // Zona di carico visivamente delineata a terra
    stationZone = { x: sx, y: sy, w: 80, h: 80 };

    for (let i = 0; i < numStudents; i++) {
        // Spargi fisicamente gli omini attorno alla fermata
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
        // Bus fermo che carica
        updatePhysics(); // Continua a calcolare attrito
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
    inputState.up = keyIsDown(UP_ARROW) || keyIsDown(87); // W
    inputState.down = keyIsDown(DOWN_ARROW) || keyIsDown(83); // S
    inputState.left = keyIsDown(LEFT_ARROW) || keyIsDown(65); // A
    inputState.right = keyIsDown(RIGHT_ARROW) || keyIsDown(68); // D

    // Gestione Input Touch per Mobile (A zone)
    if (touches.length > 0) {
        let tLeft = false, tRight = false, tUp = false, tDown = false;
        for (let i = 0; i < touches.length; i++) {
            let tx = touches[i].x;
            let ty = touches[i].y;

            // Sterzo (Metà destra dello schermo)
            if (tx > width / 2) {
                if (ty > height / 2 && ty < height - 100) tLeft = true; // Sterzo sx
                if (ty >= height - 100) tRight = true; // Sterzo dx
            }

            // Pedali (Metà sinistra dello schermo)
            if (tx <= width / 2) {
                if (ty > height / 2 && ty < height - 100) tUp = true; // Acceleratore
                if (ty >= height - 100) tDown = true; // Freno/Retromarcia
            }
        }
        inputState.up = inputState.up || tUp;
        inputState.down = inputState.down || tDown;
        inputState.left = inputState.left || tLeft;
        inputState.right = inputState.right || tRight;
    }
}

function updatePhysics() {
    // Accelerazione in avanti e indietro
    if (inputState.up) {
        bus.speed += bus.acceleration;
    } else if (inputState.down) {
        bus.speed -= bus.acceleration;
    } else {
        // Attrito se non accelero
        if (bus.speed > 0) bus.speed -= bus.friction;
        if (bus.speed < 0) bus.speed += bus.friction;
        if (abs(bus.speed) < bus.friction) bus.speed = 0;
    }

    // Limiti di velocità (più lento in retromarcia)
    bus.speed = constrain(bus.speed, -bus.maxSpeed / 2, bus.maxSpeed);

    // Sterzo dipendente dalla velocità (non si gira da fermi)
    if (abs(bus.speed) > 0.5) {
        let turnDir = (bus.speed > 0) ? 1 : -1; // Sterzo invertito in retromarcia (realistico)
        if (inputState.left) bus.angle -= bus.turnSpeed * turnDir;
        if (inputState.right) bus.angle += bus.turnSpeed * turnDir;
    }

    // Calcolo spostamento basato sull'angolo
    bus.x += cos(bus.angle) * bus.speed;
    bus.y += sin(bus.angle) * bus.speed;

    // Bordi mappa
    if (bus.x < 0 || bus.y < 0 || bus.x > width || bus.y > height) {
        gameState = 'GAMEOVER';
    }
}

function checkStationZone() {
    // Se il centro del bus è dentro l'area fermata E siamo (quasi) fermi
    if (bus.x > stationZone.x && bus.x < stationZone.x + stationZone.w &&
        bus.y > stationZone.y && bus.y < stationZone.y + stationZone.h) {

        if (abs(bus.speed) < 0.5 && waitingPeds.length > 0) {
            gameState = 'LOADING';
            loadingTimer = 0;
        }
    }
}

function processStationLoading() {
    // Mantiene il bus inchiodato o quasi mente carica
    bus.speed *= 0.5;

    loadingTimer++;
    // Ogni 10 frame, una persona sale (sproporzionato per game feel rapido)
    if (loadingTimer > 5 && waitingPeds.length > 0) {
        loadingTimer = 0;
        // Rimuovi pedone (sale)
        waitingPeds.pop();
        passengers++;
    }

    // Se son saliti tutti, sblocca e vai alla prossima stazione
    if (waitingPeds.length === 0) {
        currentStationIndex++;

        if (currentStationIndex >= routeStations.length - 1) {
            // Arrivati a Ingegneria/Tavernelle! Finale
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
    // Un po' di estetica "minimale/urban" procedurale
    noStroke();
    fill('#dcdde1');
    for (let i = 0; i < 5; i++) {
        rect(i * 200, 0, 100, height); // Linee larghe di "strada" o lotti a caso
    }
}

function drawStationMarker() {
    // Area gialla tratteggiata per il carico
    push();
    stroke(255, 204, 0); // Giallo bus stop
    strokeWeight(3);
    drawingContext.setLineDash([5, 5]);
    noFill();
    rect(stationZone.x, stationZone.y, stationZone.w, stationZone.h, 5);

    // Testo Fermata
    drawingContext.setLineDash([]);
    fill(0);
    noStroke();
    textAlign(CENTER, BOTTOM);
    textSize(14);
    text(routeStations[currentStationIndex], stationZone.x + stationZone.w / 2, stationZone.y - 10);

    pop();
}

// Omini molto carini in vista top-down (2D base ma strutturati con testa e corpo)
class Person {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.angle = random(TWO_PI);
        this.offsetTimer = random(100); // Per lieve animazione di attesa
    }
    draw() {
        push();
        translate(this.x, this.y);
        // Un po' di animazione (ondeggiano mentre aspettano)
        rotate(this.angle + sin(frameCount * 0.1 + this.offsetTimer) * 0.2);

        noStroke();
        // Spalle/Corpo
        fill(COLOR_STUDENT_SHIRT);
        rect(-6, -4, 12, 8, 3);
        // Braccia
        fill(COLOR_STUDENT_SKIN);
        rect(-8, -2, 3, 4, 1);
        rect(5, -2, 3, 4, 1);
        // Testa
        fill(COLOR_STUDENT_SKIN);
        ellipse(0, 0, 8, 8);
        // Capelli (opzionale)
        fill('#8e44ad');
        arc(0, 0, 8, 8, PI, TWO_PI);

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
    rotate(bus.angle); // Applica la fisica dell'angolo in modo reale

    // Il centro matematico è il centro del bus, per cui disegniamo da -w/2 e -h/2
    let bw = bus.w;
    let bh = bus.h;

    // Ombra del bus per profondità
    noStroke();
    fill(0, 50); // Nero 50 alpha
    rect(-bh / 2 + 2, -bw / 2 + 4, bh, bw, 4);

    // Corpo Principale Rosso
    fill(COLOR_BUS_BODY);
    rect(-bh / 2, -bw / 2, bh, bw, 3);

    // Dettagli Tettonici (La vista è "top-down", quindi vediamo il tetto)
    fill(COLOR_BUS_HEAD); // Centro tetto più chiaro
    rect(-bh / 2 + 5, -bw / 2 + 3, bh - 10, bw - 6, 2);

    // Parabrezza (A destra del modulo locale siccome angle=0 vuol dire andiamo a destra.
    // Ma se ci muoviamo col coseno, la "faccia" è verso X positivo locale
    // L'angolo PI iniziale punta il muso su verso Nord per noi se ruotiamo la vista? 
    // Con cos() angle=0 -> Nord-Est se non mappato diverso.
    // Standard Math: angle 0 = X+ = Destra.
    // Quindi FRONT = X+. REAR = X-.
    fill(200, 240, 255); // Vetro azzurrino
    rect(bh / 2 - 8, -bw / 2 + 2, 6, bw - 4); // Vetro avanti
    rect(-bh / 2 + 2, -bw / 2 + 2, 4, bw - 4); // Lunotto posteriore

    // Finestrini Laterali
    fill(50); // Vetri laterali scuri come la morte universitaria
    let windowSpace = (bh - 20) / 4;
    for (let i = 0; i < 4; i++) {
        // lato sx
        rect(-bh / 2 + 10 + (i * windowSpace), -bw / 2 + 1, windowSpace - 2, 2);
        // lato dx
        rect(-bh / 2 + 10 + (i * windowSpace), bw / 2 - 3, windowSpace - 2, 2);
    }

    // Indicatori Fari (Si accendono da fermi ai semafori o se freni)
    if (inputState.down && bus.speed > 0) {
        fill(255, 0, 0); // Fari posteriori accesi = frenata forte
        rect(-bh / 2 - 1, -bw / 2 + 2, 2, 4);
        rect(-bh / 2 - 1, bw / 2 - 6, 2, 4);
    }

    // Piccola "M" o "46" sul tetto stilizzato
    fill(255);
    textAlign(CENTER, CENTER);
    translate(0, 0);
    rotate(PI / 2); // Ruoto il testo rispetto all'asse del bus per leggerlo diritto sui fianchi o no? Meglio tetto piano.
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
    text("Dest:\nLiceo Scienze", width - 10, 35);

    // Messaggio se sta caricando
    if (gameState === 'LOADING') {
        textAlign(CENTER, CENTER);
        fill(255, 200, 0);
        textSize(24);
        text("FERMO E CARICA...", width / 2, height / 2 + 60);
    }
}

function drawMobileControls() {
    // Opzionale: mostra a schermo i quadranti di tap per mobile su dispositivi touch
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        push();
        fill(255, 20);
        stroke(255, 50);
        strokeWeight(1);

        // Joystick o zone (Sterzo Sx/Dx in basso a destra, Accel/Break a sinistra)
        // Accel
        rect(20, height - 120, 80, 50, 10);
        // Break
        rect(20, height - 60, 80, 50, 10);
        // Sterzo Sx
        rect(width - 180, height - 80, 70, 60, 10);
        // Sterzo Dx
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
    // Mantieni l'ambiente fermo
    drawIslandEnvironment();
    drawStationMarker();

    explosionTimer++;

    if (gameState === 'EXPLODING_SHAKE') {
        // 1. Il bus vibra violentemente e fa fumo
        let shakeX = random(-4, 4);
        let shakeY = random(-4, 4);

        push();
        translate(shakeX, shakeY);
        drawBus(); // Usa il disegno completo del nuovo bus fisso!
        pop();

        // Genera fumo nero/grigio
        if (explosionTimer % 2 === 0) {
            particles.push(new SmokeParticle(bus.x, bus.y));
        }

        if (explosionTimer > 90) { // Dopo 1.5s
            gameState = 'EXPLODING_BOOM';
            explosionTimer = 0;

            // Spawno i fuggiaschi ovunque dal punto dell'esplosione!
            for (let i = 0; i < passengers; i++) {
                fleeingStudents.push(new FleeingStudent(bus.x + random(-20, 20), bus.y + random(-20, 20)));
            }
        }
    } else if (gameState === 'EXPLODING_BOOM') {
        // 2. Esplosione arancione gigante
        let r = explosionTimer * 20;
        fill(255, 100, 0, 255 - explosionTimer * 5);
        noStroke();
        ellipse(bus.x, bus.y, r, r);

        // Nuvola bianca al centro ("fumetto scoppiato")
        fill(255, 255, 255, 200 - explosionTimer * 2);
        ellipse(bus.x, bus.y, r / 2, r / 2);

        if (explosionTimer > 60) {
            gameState = 'WALKING_AWAY';
            explosionTimer = 0;
        }
    } else if (gameState === 'WALKING_AWAY' || gameState === 'FINAL_SCREEN') {
        // 3. Passeggeri incamminano Nord-Est usando la classe Person modificata per muoversi
        for (let fs of fleeingStudents) {
            fs.update();
            fs.draw();
        }

        if (explosionTimer > 60) {
            gameState = 'FINAL_SCREEN';
        }

        // 4. Testo finale
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

            if (mouseIsPressed && frameCount % 30 == 0) { // Limit click noise
                window.open('https://gulliver.univpm.it/', '_blank');
            }
        }
    }

    // Fumo 
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].show();
        if (particles[i].alpha <= 0) {
            particles.splice(i, 1);
        }
    }
}

class SmokeParticle {
    constructor(x, y) {
        this.x = x + random(-30, 30);
        this.y = y + random(-30, 30);
        this.vx = random(-1, 1);
        this.vy = random(-3, -1); // Sale leggermente nel vento
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
        fill(50, 50, 50, this.alpha); // Fumo più nero/denso dal motore in fiamme
        ellipse(this.x, this.y, this.d);
    }
}

// Estendo logicamente Person in una struct per i Fleeing che camminano "via" animati
class FleeingStudent extends Person {
    constructor(x, y) {
        super(x, y);
        // Vanno in alto-destra generalmente, con un po' di variazione
        this.vx = random(0.5, 2);
        this.vy = random(-2, -0.5);
        this.angle = atan2(this.vy, this.vx); // Girano il corpo verso dove camminano
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
    }
    // Uso lo stesso draw ma si aggiornano xy
}


// --- Schermate Base ---
function drawStartScreen() {
    fill(0, 200); rect(0, 0, width, height);
    fill(255); textAlign(CENTER, CENTER);
    textSize(32); text("SIMULATORE 46", width / 2, height / 3 - 20);
    textSize(16); text("Fermati col bus (freno S/Giù) sui quadrati gialli\nFai salire la folla finché non sono pieni.\nArriva in Facoltà.", width / 2, height / 3 + 30);
    fill(COLOR_BUS_HEAD); rect(width / 2 - 75, height / 2, 150, 50, 10);
    fill(255); textSize(20); text("ACCENDI MOTORE", width / 2, height / 2 + 25);
}

function drawGameOverScreen() {
    fill(0, 200); rect(0, 0, width, height);
    fill(COLOR_BUS_HEAD); textAlign(CENTER, CENTER);
    textSize(32); text("INCIDENTE", width / 2, height / 3 - 20);
    fill(255); textSize(16); text(`Hai schiacciato le teste a ${passengers} passeggeri.\nEvita i bordi del mondo!`, width / 2, height / 3 + 30);
    fill(100); rect(width / 2 - 75, height / 2 + 100, 150, 40, 5);
    fill(255); textSize(16); text("RICOMINCIA", width / 2, height / 2 + 120);

    if (mouseIsPressed && (mouseY > height / 2 + 100 && mouseY < height / 2 + 140)) {
        initGame();
    }
}

function mousePressed() {
    // Mobile/Start logic fallback robusta (touch copre quasi tutto)
    if (gameState === 'START') {
        let btnY = height / 2;
        if (mouseY > btnY && mouseY < btnY + 50) {
            gameState = 'PLAYING';
        }
    }
}
