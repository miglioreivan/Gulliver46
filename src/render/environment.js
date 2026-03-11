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
    
    // 1. Ombra proiettata (Main block + Tower)
    p.fill(0, 40); p.noStroke();
    p.rect(ux + 4, uy + 4, uw, uh, 4); // Main shadow
    p.rect(ux - 25, uy - 40, 20, uh + 44, 2); // Tower shadow

    // 2. La Torre (Iconica)
    p.fill('#7f8c8d'); // Cemento chiaro
    p.rect(ux - 30, uy - 45, 20, uh + 45, 2);
    
    // Dettagli Torre (finestrelle verticali)
    p.fill('#2c3e50');
    for(let i = 0; i < 5; i++) {
        p.rect(ux - 26, uy - 35 + i * 20, 12, 10, 1);
    }
    // Cima della torre
    p.fill('#e67e22'); p.rect(ux - 32, uy - 50, 24, 8, 1);

    // 3. Struttura Principale (Brutalismo)
    p.fill('#95a5a6'); p.rect(ux, uy, uw, uh, 4);
    
    // Texture cemento (linee strutturali)
    p.stroke(0, 30); p.strokeWeight(1);
    for(let i = 1; i < 3; i++) {
        p.line(ux, uy + (uh/3)*i, ux + uw, uy + (uh/3)*i);
    }
    p.noStroke();

    // 4. Facciata Continua (Finestre a griglia)
    p.fill('#34495e');
    let cols = 5;
    let rows = 3;
    let gap = 4;
    let winW = (uw - (cols + 1) * gap) / cols;
    let winH = (uh - (rows + 1) * gap) / rows;
    
    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            let wx = ux + gap + i * (winW + gap);
            let wy = uy + gap + j * (winH + gap);
            p.fill('#2c3e50');
            p.rect(wx, wy, winW, winH, 1);
            p.fill(255, 15);
            p.rect(wx + 1, wy + 1, winW/2, winH/2);
        }
    }

    // 5. Insegna Superiore
    p.fill('#1a1a1c'); p.rect(ux - 5, uy - 35, uw + 10, 45, 5);
    p.stroke('#e67e22'); p.strokeWeight(2); p.line(ux - 5, uy + 10, ux + uw + 5, uy + 10);
    p.noStroke();

    p.fill(255); p.textAlign(p.CENTER, p.CENTER); p.textStyle(p.BOLD);
    p.textSize(16); p.text("UNIVPM", ux + uw / 2, uy - 22);
    p.fill('#bdc3c7'); p.textSize(8); p.text("FACOLTÀ DI INGEGNERIA", ux + uw / 2, uy - 8);

    // 6. Ingresso
    p.fill('#2980b9'); p.rect(ux + uw / 2 - 25, uy + uh - 12, 50, 12, 2);
    p.fill('#ecf0f1');
    p.rect(ux + uw / 2 - 20, uy + uh - 15, 18, 15, 1);
    p.rect(ux + uw / 2 + 2, uy + uh - 15, 18, 15, 1);
    
    p.pop();
}
