// Costanti di Gioco
const GRID_SIZE = 20;
let cols, rows;

// Colori Tema Gulliver
const COLOR_ISLAND = '#ecf0f1';
const COLOR_BUS_HEAD = '#e74c3c';
const COLOR_BUS_BODY = '#c0392b';
const COLOR_STUDENT = '#2980b9'; // Blu intenso per contrasto

// Entità
let bus;
let currentGroup = []; // Il "mucchio" di studenti alla fermata
let passengers = 0;
const GAME_SPEED = 8; // Leggermente più lento per manovrare meglio

// Stati di Gioco
let gameState = 'START';
// 'START', 'PLAYING', 'GAMEOVER', 'EXPLODING_SHAKE', 'EXPLODING_BOOM', 'WALKING_AWAY', 'FINAL_SCREEN'

// Mappa delle stazioni in ordine
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

// Variabili Animazione Finale
let explosionTimer = 0;
let particles = [];
let fleeingStudents = [];
let textOpacity = 0;

// Controlli Mobile
let touchStartX = 0;
let touchStartY = 0;

function setup() {
    let canvasW = min(windowWidth * 0.9, 600);
    let canvasH = min(windowHeight * 0.95, 800);
    canvasW = floor(canvasW / GRID_SIZE) * GRID_SIZE;
    canvasH = floor(canvasH / GRID_SIZE) * GRID_SIZE;
    createCanvas(canvasW, canvasH);
    cols = width / GRID_SIZE;
    rows = height / GRID_SIZE;
    frameRate(GAME_SPEED);
    initGame();
}

function initGame() {
    let startX = floor(cols / 2);
    let startY = floor(rows * 0.8);
    bus = {
        body: [createVector(startX, startY)],
        xdir: 0,
        ydir: -1
    };
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
    currentGroup = [];
    // Più avanziamo, più persone aspettano alla fermata (da 2 a 6 persone)
    let numStudents = min(2 + floor(currentStationIndex / 2), 6);

    // Trova un'area libera 3x3 per la fermata
    let validArea = false;
    let stationX, stationY;

    while (!validArea) {
        stationX = floor(random(2, cols - 3));
        stationY = floor(random(2, rows - 3));
        validArea = true;

        // Controlla che il bus non sia già lì
        for (let p of bus.body) {
            if (abs(p.x - stationX) < 3 && abs(p.y - stationY) < 3) {
                validArea = false;
                break;
            }
        }
    }

    // Genera gli studenti intorno a quel punto
    for (let i = 0; i < numStudents; i++) {
        // Offset casuali attorno al centro fermata
        let ox = floor(random(-1, 2));
        let oy = floor(random(-1, 2));
        currentGroup.push(createVector(stationX + ox, stationY + oy));
    }
}

function draw() {
    drawIslandEnvironment();

    if (gameState === 'START') {
        drawStartScreen();
    } else if (gameState === 'PLAYING') {
        updateBus();
        drawStationMarker();
        drawEntities();
        drawUI();
    } else if (gameState === 'GAMEOVER') {
        drawEntities();
        drawGameOverScreen();
    } else {
        // Tutta la sequenza finale usa logica di update interna al draw per maggior fluidità
        handleEndingSequence();
    }
}

// ----------------------------------------
// MECCANICHE CORE (UPDATE)
// ----------------------------------------

function updateBus() {
    let head = bus.body[bus.body.length - 1].copy();
    head.x += bus.xdir;
    head.y += bus.ydir;

    // Morte se esce dall'isola o si mangia la coda
    if (head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows) {
        gameState = 'GAMEOVER';
        return;
    }
    for (let i = 0; i < bus.body.length; i++) {
        let part = bus.body[i];
        if (head.x === part.x && head.y === part.y) {
            gameState = 'GAMEOVER';
            return;
        }
    }

    bus.body.push(head);

    // Controllo raccolta studenti nel mucchio corrente
    let ateSomeone = false;
    for (let i = currentGroup.length - 1; i >= 0; i--) {
        let st = currentGroup[i];
        if (head.x === st.x && head.y === st.y) {
            passengers++;
            currentGroup.splice(i, 1);
            ateSomeone = true;
            break;
        }
    }

    if (!ateSomeone) {
        bus.body.shift(); // Avanza normalmente
    }

    // Controllo se il mucchio della fermata è finito
    if (currentGroup.length === 0) {
        currentStationIndex++;

        // Se abbiamo raggiunto Tavernelle / Ingegneria, innesca il finale!
        // L'indice 9 è "Universita' Ingegneria"
        if (currentStationIndex >= routeStations.length - 1) {
            gameState = 'EXPLODING_SHAKE';
            // Aumenta il framerate per animazioni più fluide nel finale
            frameRate(30);
        } else {
            spawnStationGroup();
        }
    }
}

// ----------------------------------------
// SEQUENZA FINALE (TAVERNELLE)
// ----------------------------------------

function handleEndingSequence() {
    drawIslandEnvironment(); // Sfondo pulito
    drawStationMarker(); // Mostra che siamo all'università

    let head = bus.body[bus.body.length - 1];
    let headPxX = head.x * GRID_SIZE;
    let headPxY = head.y * GRID_SIZE;

    explosionTimer++;

    if (gameState === 'EXPLODING_SHAKE') {
        // 1. Il bus vibra violentemente e fa fumo
        let shakeX = random(-4, 4);
        let shakeY = random(-4, 4);

        push();
        translate(shakeX, shakeY);
        drawEntities();
        pop();

        // Genera fumo nero/grigio
        if (explosionTimer % 2 === 0) {
            particles.push(new SmokeParticle(headPxX + GRID_SIZE / 2, headPxY + GRID_SIZE / 2));
        }

        if (explosionTimer > 90) { // Dopo 3 secondi a 30fps
            gameState = 'EXPLODING_BOOM';
            explosionTimer = 0;
            // Converti ogni pezzo del bus in uno studente in fuga
            for (let p of bus.body) {
                fleeingStudents.push(new FleeingStudent(p.x * GRID_SIZE, p.y * GRID_SIZE));
            }
        }

    } else if (gameState === 'EXPLODING_BOOM') {
        // 2. Esplosione arancione gigante
        // Non disegniamo più il bus, ma l'esplosione!
        let r = explosionTimer * 15;
        fill(255, 100, 0, 255 - explosionTimer * 5); // Sfuma
        noStroke();
        ellipse(headPxX + GRID_SIZE / 2, headPxY + GRID_SIZE / 2, r, r);

        // Nuvola bianca al centro ("fumetto scoppiato")
        fill(255, 255, 255, 200 - explosionTimer * 2);
        ellipse(headPxX + GRID_SIZE / 2, headPxY + GRID_SIZE / 2, r / 2, r / 2);

        if (explosionTimer > 60) {
            gameState = 'WALKING_AWAY';
            explosionTimer = 0;
        }

    } else if (gameState === 'WALKING_AWAY' || gameState === 'FINAL_SCREEN') {
        // 3. I passeggeri abbandonati incamminano verso Nord-Est (Università)
        for (let fs of fleeingStudents) {
            fs.update();
            fs.show();
        }

        if (explosionTimer > 60) {
            gameState = 'FINAL_SCREEN';
        }

        // 4. Testo in sovraimpressione che sfuma in entrata
        if (gameState === 'FINAL_SCREEN') {
            textOpacity = min(textOpacity + 2, 255);

            fill(0, textOpacity * 0.8); // Sfondo scuro semitrasparente
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

            // Rimetti il framerate basso se qualcuno clicca o tocca
            if (mouseIsPressed || touches.length > 0) {
                window.open('https://gulliver.univpm.it/', '_blank');
            }
        }
    }

    // Aggiorna e mostra le particelle vive (Fumo)
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].show();
        if (particles[i].alpha <= 0) {
            particles.splice(i, 1);
        }
    }
}

// --- Classi per le animazioni finali ---

class SmokeParticle {
    constructor(x, y) {
        this.x = x + random(-20, 20);
        this.y = y + random(-20, 20);
        this.vx = random(-1, 1);
        this.vy = random(-3, -1);
        this.alpha = 255;
        this.d = random(10, 30);
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 5;
    }
    show() {
        noStroke();
        fill(100, 100, 100, this.alpha);
        ellipse(this.x, this.y, this.d);
    }
}

class FleeingStudent {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        // Si muovono tutti generalmente verso l'alto-destra (Nord-Est teorico)
        this.vx = random(0.2, 1);
        this.vy = random(-1, -0.2);
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
    }
    show() {
        noStroke();
        fill(COLOR_STUDENT);
        rect(this.x, this.y, GRID_SIZE - 6, GRID_SIZE - 6, 3);
    }
}


// ----------------------------------------
// GRAFICA BASE (DRAW)
// ----------------------------------------

function drawIslandEnvironment() {
    background(COLOR_ISLAND);
    stroke(220);
    strokeWeight(0.5);
    for (let i = 0; i < cols; i++) line(i * GRID_SIZE, 0, i * GRID_SIZE, height);
    for (let j = 0; j < rows; j++) line(0, j * GRID_SIZE, width, j * GRID_SIZE);
}

function drawStationMarker() {
    if (currentGroup.length === 0) return;
    // Calcola il centro del mucchio per mettere il nome
    let cx = 0, cy = 0;
    for (let st of currentGroup) {
        cx += st.x; cy += st.y;
    }
    cx /= currentGroup.length;
    cy /= currentGroup.length;

    fill(50, 150);
    noStroke();
    ellipse(cx * GRID_SIZE + GRID_SIZE / 2, cy * GRID_SIZE + GRID_SIZE / 2, GRID_SIZE * 5, GRID_SIZE * 5);

    fill(0);
    textAlign(CENTER, BOTTOM);
    textSize(12);
    // Testo sopra il mucchio
    let txtY = (cy - 2) * GRID_SIZE;
    // Evita che il testo esca dallo schermo
    txtY = max(txtY, 60);
    text("Fermata:", cx * GRID_SIZE, txtY - 15);
    fill(COLOR_BUS_HEAD);
    text(routeStations[currentStationIndex], cx * GRID_SIZE, txtY);
}

function drawEntities() {
    noStroke();

    // Disegna Studenti (Fermata)
    fill(COLOR_STUDENT);
    for (let st of currentGroup) {
        // Disegna omini "tondeggianti" (pallini)
        ellipse(st.x * GRID_SIZE + GRID_SIZE / 2, st.y * GRID_SIZE + GRID_SIZE / 2, GRID_SIZE - 4, GRID_SIZE - 4);
        // Testa
        fill('#f1c40f'); // Testoline per sembrare persone
        ellipse(st.x * GRID_SIZE + GRID_SIZE / 2, st.y * GRID_SIZE + GRID_SIZE / 2 - 2, GRID_SIZE - 10, GRID_SIZE - 10);
        fill(COLOR_STUDENT);
    }

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

    // Fari direzionali
    fill(255);
    if (bus.ydir === -1) {
        rect(head.x * GRID_SIZE + 2, head.y * GRID_SIZE + 2, 4, 4);
        rect(head.x * GRID_SIZE + GRID_SIZE - 6, head.y * GRID_SIZE + 2, 4, 4);
    } else if (bus.ydir === 1) {
        rect(head.x * GRID_SIZE + 2, head.y * GRID_SIZE + GRID_SIZE - 6, 4, 4);
        rect(head.x * GRID_SIZE + GRID_SIZE - 6, head.y * GRID_SIZE + GRID_SIZE - 6, 4, 4);
    } else if (bus.xdir === -1) {
        rect(head.x * GRID_SIZE + 2, head.y * GRID_SIZE + 2, 4, 4);
        rect(head.x * GRID_SIZE + 2, head.y * GRID_SIZE + GRID_SIZE - 6, 4, 4);
    } else if (bus.xdir === 1) {
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
    text(`Persone: ${passengers}`, 10, 20);

    textAlign(RIGHT, CENTER);
    // Mostra la destinazione finale sempre a destra
    text("Dir: " + routeStations[routeStations.length - 1], width - 10, 20);
}

// ----------------------------------------
// SCHERMATE DI STATO BASE
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
    text("Raccogli gli studenti alle fermate\nfino a Tavernelle.", width / 2, height / 3 + 30);
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
    text(`Hai raccolto ${passengers} passeggeri.\nHai sbandato prima di arrivare in Facoltà.`, width / 2, height / 3 + 30);

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

function touchStarted() {
    touchStartX = mouseX;
    touchStartY = mouseY;

    if (gameState === 'START') {
        let btnY = height / 2;
        if (mouseY > btnY && mouseY < btnY + 50) {
            // Reimposta frameRate al click per sicurezza
            frameRate(GAME_SPEED);
            gameState = 'PLAYING';
        }
    } else if (gameState === 'GAMEOVER') {
        let btnY = height / 2 + 100;
        if (mouseY > btnY && mouseY < btnY + 40) {
            frameRate(GAME_SPEED);
            initGame();
            gameState = 'PLAYING';
        }
    } else if (gameState === 'FINAL_SCREEN') {
        // Call to action finale (click sullo schermo intero porta al sito dell'associazione)
        window.open('https://gulliver.univpm.it/', '_blank');
    }
    return false;
}

function touchEnded() {
    if (gameState !== 'PLAYING') return false;
    let dx = mouseX - touchStartX;
    let dy = mouseY - touchStartY;
    if (abs(dx) > 30 || abs(dy) > 30) {
        if (abs(dx) > abs(dy)) {
            if (dx > 0 && bus.xdir === 0) { bus.xdir = 1; bus.ydir = 0; }
            else if (dx < 0 && bus.xdir === 0) { bus.xdir = -1; bus.ydir = 0; }
        } else {
            if (dy > 0 && bus.ydir === 0) { bus.xdir = 0; bus.ydir = 1; }
            else if (dy < 0 && bus.ydir === 0) { bus.xdir = 0; bus.ydir = -1; }
        }
    }
    return false;
}

function windowResized() {
    let canvasW = min(windowWidth * 0.9, 600);
    let canvasH = min(windowHeight * 0.95, 800);
    canvasW = floor(canvasW / GRID_SIZE) * GRID_SIZE;
    canvasH = floor(canvasH / GRID_SIZE) * GRID_SIZE;
    resizeCanvas(canvasW, canvasH);
    cols = width / GRID_SIZE;
    rows = height / GRID_SIZE;
}
