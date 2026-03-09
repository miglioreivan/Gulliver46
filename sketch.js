// Costanti di Gioco
const GRID_SIZE = 20; // Dimensione in pixel di una cella della griglia
let cols, rows;

// Colori Tema Gulliver
const COLOR_BG_OCEAN = '#2c3e50'; // Sfondo esterno al canvas gestito nel CSS
const COLOR_ISLAND = '#ecf0f1'; // Colore base dell'isola (strada chiara)
const COLOR_BUS_HEAD = '#e74c3c'; // Rosso Gulliver intenso per la testa
const COLOR_BUS_BODY = '#c0392b'; // Rosso Gulliver scuro per il corpo
const COLOR_STUDENT = '#3498db'; // Azzurro per contrastare e identificare i passeggeri
const COLOR_TEXT = '#2c3e50';

// Entità
let bus;
let student;
let passengers = 0;
const MAX_PASSENGERS = 46; // Il limite fatidico del 46
const GAME_SPEED = 10; // Frame per secondo (determina la velocità dello snake)

// Stati di Gioco
let gameState = 'START'; // 'START', 'PLAYING', 'GAMEOVER', 'FULL'

// Mappa delle stazioni (Solo visiva)
const routeStations = [
    "Piazza Ugo Bassi",
    "Via Colombo",
    "Brecce Bianche",
    "Ingegneria",
    "Scienze",
    "Tavernelle!"
];
let currentStationIndex = 0;
let scoreToNextStation = 5;

// Controlli Mobile
let touchStartX = 0;
let touchStartY = 0;

function setup() {
    // Crea un canvas responsive (mantiene proporzioni rettangolari o si adatta al mobile)
    let canvasW = min(windowWidth * 0.9, 600);
    let canvasH = min(windowHeight * 0.9, 800);

    // Arrotonda per difetto per allineare perfettamente alla griglia
    canvasW = floor(canvasW / GRID_SIZE) * GRID_SIZE;
    canvasH = floor(canvasH / GRID_SIZE) * GRID_SIZE;

    createCanvas(canvasW, canvasH);

    cols = width / GRID_SIZE;
    rows = height / GRID_SIZE;

    frameRate(GAME_SPEED);

    initGame();
}

function initGame() {
    // Inizializza il Bus al centro spostato verso il basso
    let startX = floor(cols / 2);
    let startY = floor(rows * 0.8);

    bus = {
        body: [createVector(startX, startY)],
        xdir: 0,
        ydir: -1 // Parte andando verso l'alto (verso Tavernelle)
    };

    passengers = 0;
    currentStationIndex = 0;
    spawnStudent();
    gameState = 'START';
}

function spawnStudent() {
    let validPos = false;
    let newVect;

    // Evita di spawnare lo studente sopra il corpo del bus
    while (!validPos) {
        let rX = floor(random(cols));
        let rY = floor(random(rows));
        newVect = createVector(rX, rY);

        validPos = true;
        for (let p of bus.body) {
            if (p.x === newVect.x && p.y === newVect.y) {
                validPos = false;
                break;
            }
        }
    }
    student = newVect;
}

function draw() {
    drawIslandEnvironment();

    if (gameState === 'START') {
        drawStartScreen();
    } else if (gameState === 'PLAYING') {
        updateBus();
        drawEntities();
        drawUI();
    } else if (gameState === 'GAMEOVER') {
        drawEntities(); // Disegna l'ultima posizione per contesto
        drawGameOverScreen();
    } else if (gameState === 'FULL') {
        drawEntities();
        drawExplosionScreen();
    }
}

// ----------------------------------------
// MECCANICHE CORE (UPDATE)
// ----------------------------------------

function updateBus() {
    let head = bus.body[bus.body.length - 1].copy();
    head.x += bus.xdir;
    head.y += bus.ydir;

    // Controllo collisione con i bordi dell'isola (Morte)
    if (head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows) {
        gameState = 'GAMEOVER';
        return;
    }

    // Controllo collisione con se stesso (Morte)
    for (let i = 0; i < bus.body.length; i++) {
        let part = bus.body[i];
        if (head.x === part.x && head.y === part.y) {
            gameState = 'GAMEOVER';
            return;
        }
    }

    bus.body.push(head);

    // Controllo raccolta Studente
    if (head.x === student.x && head.y === student.y) {
        passengers++;
        updateStationProgress();

        if (passengers >= MAX_PASSENGERS) {
            gameState = 'FULL';
        } else {
            spawnStudent();
        }
        // Non rimuoviamo la coda, quindi il bus "cresce"
    } else {
        // Se non ha raccolto nessuno, rimuovi l'ultimo segmento (la coda avanza)
        bus.body.shift();
    }
}

function updateStationProgress() {
    if (passengers > scoreToNextStation && currentStationIndex < routeStations.length - 1) {
        currentStationIndex++;
        scoreToNextStation += 8; // Più studenti servono per la prossima fermata
    }
}

// ----------------------------------------
// GRAFICA (DRAW)
// ----------------------------------------

function drawIslandEnvironment() {
    background(COLOR_ISLAND);

    // Disegna un pattern a griglia molto leggero per il feeling "Crossy Road"
    stroke(220);
    strokeWeight(0.5);
    for (let i = 0; i < cols; i++) {
        line(i * GRID_SIZE, 0, i * GRID_SIZE, height);
    }
    for (let j = 0; j < rows; j++) {
        line(0, j * GRID_SIZE, width, j * GRID_SIZE);
    }
}

function drawEntities() {
    noStroke();

    // Disegna Studente
    fill(COLOR_STUDENT);
    rect(student.x * GRID_SIZE + 2, student.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4, 3);

    // Disegna Bus (Coda)
    fill(COLOR_BUS_BODY);
    for (let i = 0; i < bus.body.length - 1; i++) {
        let part = bus.body[i];
        rect(part.x * GRID_SIZE + 1, part.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2, 2);
    }

    // Disegna Bus (Testa)
    let head = bus.body[bus.body.length - 1];
    fill(COLOR_BUS_HEAD);
    rect(head.x * GRID_SIZE, head.y * GRID_SIZE, GRID_SIZE, GRID_SIZE, 4);

    // Piccoli fari per capire la direzione (opzionale per estetica)
    fill(255);
    if (bus.ydir === -1) { // Su
        rect(head.x * GRID_SIZE + 2, head.y * GRID_SIZE + 2, 4, 4);
        rect(head.x * GRID_SIZE + GRID_SIZE - 6, head.y * GRID_SIZE + 2, 4, 4);
    } else if (bus.ydir === 1) { // Giù
        rect(head.x * GRID_SIZE + 2, head.y * GRID_SIZE + GRID_SIZE - 6, 4, 4);
        rect(head.x * GRID_SIZE + GRID_SIZE - 6, head.y * GRID_SIZE + GRID_SIZE - 6, 4, 4);
    } else if (bus.xdir === -1) { // Sinistra
        rect(head.x * GRID_SIZE + 2, head.y * GRID_SIZE + 2, 4, 4);
        rect(head.x * GRID_SIZE + 2, head.y * GRID_SIZE + GRID_SIZE - 6, 4, 4);
    } else if (bus.xdir === 1) { // Destra
        rect(head.x * GRID_SIZE + GRID_SIZE - 6, head.y * GRID_SIZE + 2, 4, 4);
        rect(head.x * GRID_SIZE + GRID_SIZE - 6, head.y * GRID_SIZE + GRID_SIZE - 6, 4, 4);
    }
}

function drawUI() {
    fill(0, 150);
    noStroke();
    rect(0, 0, width, 40);

    fill(255);
    textAlign(LEFT, CENTER);
    textSize(16);
    text(`Persone: ${passengers}/${MAX_PASSENGERS}`, 10, 20);

    textAlign(RIGHT, CENTER);
    text(`Fermata: ${routeStations[currentStationIndex]}`, width - 10, 20);
}

// ----------------------------------------
// SCHERMATE DI STATO
// ----------------------------------------

function drawStartScreen() {
    fill(0, 200);
    rect(0, 0, width, height);

    fill(255);
    textAlign(CENTER, CENTER);
    textSize(32);
    text("GULLIVER BUS 46", width / 2, height / 3 - 20);

    textSize(16);
    fill(200);
    text("Raccogli gli studenti lungo il percorso\nverso Tavernelle.", width / 2, height / 3 + 30);

    fill(COLOR_BUS_HEAD);
    rect(width / 2 - 75, height / 2, 150, 50, 10);
    fill(255);
    textSize(20);
    text("PARTI", width / 2, height / 2 + 25);
}

function drawGameOverScreen() {
    fill(0, 200);
    rect(0, 0, width, height);

    fill(COLOR_BUS_HEAD);
    textAlign(CENTER, CENTER);
    textSize(32);
    text("INCIDENTE STRADALE", width / 2, height / 3 - 20);

    fill(255);
    textSize(16);
    text(`Hai raccolto ${passengers} passeggeri.\nHai sbandato prima di arrivare a Tavernelle.`, width / 2, height / 3 + 30);

    drawRestartButton();
}

function drawExplosionScreen() {
    fill(COLOR_BUS_HEAD); // Sfondo rosso esplosivo Gulliver
    rect(0, 0, width, height);

    fill(255);
    textAlign(CENTER, CENTER);
    textSize(50);
    text("💥 BOOM! 💥", width / 2, height / 3);

    textSize(24);
    text("IL 46 È PIENO.", width / 2, height / 2 - 20);

    textSize(16);
    text("Non puoi salire.\nTe la fai a piedi fino in facoltà... \nO voti Gulliver per più corse!", width / 2, height / 2 + 30);

    // Ripristina stili per il bottone speciale Vota Gulliver se necessario
    fill('#ffffff');
    rect(width / 2 - 100, height / 2 + 100, 200, 50, 25);
    fill(COLOR_BUS_HEAD);
    text("SCOPRI IL PROGRAMMA", width / 2, height / 2 + 125);
}

function drawRestartButton() {
    fill(100);
    rect(width / 2 - 75, height / 2 + 100, 150, 40, 5);
    fill(255);
    textSize(16);
    text("RIPROVA", width / 2, height / 2 + 120);
}

// ----------------------------------------
// INPUT E CONTROLLI
// ----------------------------------------

function keyPressed() {
    if (gameState !== 'PLAYING') return;

    if (keyCode === LEFT_ARROW && bus.xdir === 0) {
        bus.xdir = -1; bus.ydir = 0;
    } else if (keyCode === RIGHT_ARROW && bus.xdir === 0) {
        bus.xdir = 1; bus.ydir = 0;
    } else if (keyCode === UP_ARROW && bus.ydir === 0) {
        bus.xdir = 0; bus.ydir = -1;
    } else if (keyCode === DOWN_ARROW && bus.ydir === 0) {
        bus.xdir = 0; bus.ydir = 1;
    }
}

// Supporto per il tocco (Mobile)
function touchStarted() {
    touchStartX = mouseX;
    touchStartY = mouseY;

    // Gestione click schermate
    if (gameState === 'START') {
        let btnY = height / 2;
        if (mouseY > btnY && mouseY < btnY + 50) {
            gameState = 'PLAYING';
        }
    } else if (gameState === 'GAMEOVER') {
        let btnY = height / 2 + 100;
        if (mouseY > btnY && mouseY < btnY + 40) {
            initGame();
            gameState = 'PLAYING';
        }
    } else if (gameState === 'FULL') {
        let btnY = height / 2 + 100;
        if (mouseY > btnY && mouseY < btnY + 50) {
            // Qui aprirebbe il PDF del programma, ora ricarica solo al tap
            window.open('https://github.com/miglioreivan/Gulliver46', '_blank'); // Esempio
        }
    }

    return false; // Prevent default behavior
}

function touchEnded() {
    if (gameState !== 'PLAYING') return false;

    let dx = mouseX - touchStartX;
    let dy = mouseY - touchStartY;

    // Richiede uno swipe minimo
    if (abs(dx) > 30 || abs(dy) > 30) {
        if (abs(dx) > abs(dy)) {
            // Orizzontale
            if (dx > 0 && bus.xdir === 0) { bus.xdir = 1; bus.ydir = 0; } // Destra
            else if (dx < 0 && bus.xdir === 0) { bus.xdir = -1; bus.ydir = 0; } // Sinistra
        } else {
            // Verticale
            if (dy > 0 && bus.ydir === 0) { bus.xdir = 0; bus.ydir = 1; } // Giù
            else if (dy < 0 && bus.ydir === 0) { bus.xdir = 0; bus.ydir = -1; } // Su
        }
    }
    return false;
}

// Rilassamento della finestra dinamico
function windowResized() {
    let canvasW = min(windowWidth * 0.9, 600);
    let canvasH = min(windowHeight * 0.9, 800);
    canvasW = floor(canvasW / GRID_SIZE) * GRID_SIZE;
    canvasH = floor(canvasH / GRID_SIZE) * GRID_SIZE;
    resizeCanvas(canvasW, canvasH);
    cols = width / GRID_SIZE;
    rows = height / GRID_SIZE;
}
