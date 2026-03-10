import { COLOR_ISLAND } from '../config.js';

export function drawIslandEnvironment(p) {
    p.background(COLOR_ISLAND);
}

export function drawUnivpmBuilding(p, building) {
    let ux = building.x;
    let uy = building.y;
    let uw = building.w;
    let uh = building.h;

    p.push();
    // 1. Ombra proiettata
    p.fill(0, 40); p.noStroke();
    p.rect(ux + 4, uy + 4, uw, uh, 4);

    // 2. Struttura Principale
    p.fill('#2c3e50'); p.rect(ux, uy, uw, uh, 4);

    // 3. Facciata Continua
    p.fill('#34495e');
    let winW = (uw - 25) / 4;
    for (let i = 0; i < 4; i++) {
        let wx = ux + 5 + i * (winW + 5);
        p.rect(wx, uy + 10, winW, uh - 20, 1);
        p.fill(255, 20);
        p.rect(wx + 2, uy + 12, winW / 2, uh - 30);
        p.fill('#34495e');
    }

    // 4. Insegna Superiore
    p.fill('#1a1a1c'); p.rect(ux - 5, uy - 30, uw + 10, 40, 5);
    p.stroke('#e67e22'); p.strokeWeight(2); p.line(ux - 5, uy + 10, ux + uw + 5, uy + 10);
    p.noStroke();

    p.fill(255); p.textAlign(p.CENTER, p.CENTER); p.textStyle(p.BOLD);
    p.textSize(16); p.text("UNIVPM", ux + uw / 2, uy - 18);
    p.fill('#bdc3c7'); p.textSize(8); p.text("FACOLTÀ DI INGEGNERIA", ux + uw / 2, uy - 5);

    // 5. Ingresso
    p.fill('#2980b9'); p.rect(ux + uw / 2 - 25, uy + uh - 12, 50, 12, 2);
    p.fill('#ecf0f1');
    p.rect(ux + uw / 2 - 20, uy + uh - 15, 18, 15, 1);
    p.rect(ux + uw / 2 + 2, uy + uh - 15, 18, 15, 1);
    p.pop();
}
