import { COLOR_BUS_BODY, UI_BUTTON_RED, UI_DARK_BG } from '../config.js';

export function drawStationMarker(p, waitingArea, stationZone, currentStationIndex, routeStations, scaleFactor) {
    p.push();
    // 1. Marciapiede
    p.push();
    p.fill('#bdc3c7');
    p.stroke('#34495e');
    p.strokeWeight(1);
    p.rect(waitingArea.x, waitingArea.y, waitingArea.w, waitingArea.h, 5);

    p.stroke(0, 40);
    let tileSize = 15;
    for (let x = waitingArea.x + tileSize; x < waitingArea.x + waitingArea.w; x += tileSize) {
        p.line(x, waitingArea.y, x, waitingArea.y + waitingArea.h);
    }
    for (let y = waitingArea.y + tileSize; y < waitingArea.y + waitingArea.h; y += tileSize) {
        p.line(waitingArea.x, y, waitingArea.x + waitingArea.w, y);
    }

    p.fill('#7f8c8d');
    p.noStroke();
    p.rect(waitingArea.x, waitingArea.y + waitingArea.h - 6, waitingArea.w, 6, 0, 0, 5, 5);
    p.pop();

    // 2. Cartello Fermata
    let signX = waitingArea.x + 15;
    let signY = waitingArea.y - 20;
    p.fill(60);
    p.rect(signX - 2, signY + 15, 4, 30);
    p.fill(UI_BUTTON_RED);
    p.stroke(255);
    p.strokeWeight(1.5);
    p.rect(signX - 14, signY, 28, 18, 5);
    p.noStroke();
    p.fill(255);
    p.textSize(10); p.textAlign(p.CENTER, p.CENTER);
    p.text("BUS", signX, signY + 9);

    // 3. Posteggio
    p.stroke(255);
    p.strokeWeight(3);
    p.drawingContext.setLineDash([8, 8]);
    p.noFill();
    p.rect(stationZone.x, stationZone.y, stationZone.w, stationZone.h, 5);
    p.drawingContext.setLineDash([]);

    p.noStroke();
    p.fill(255, 204, 0, 150);
    p.textSize(28);
    p.textAlign(p.CENTER, p.CENTER);
    p.text("BUS", stationZone.x + stationZone.w / 2, stationZone.y + stationZone.h / 2);

    // Testo Fermata
    let stName = routeStations[currentStationIndex];
    p.textSize(14);
    let tw = p.textWidth(stName);
    let pillW = tw + 30;
    let pillH = 26;
    let pillX = stationZone.x + stationZone.w / 2 - pillW / 2;
    let pillY = stationZone.y + stationZone.h + 15;

    p.fill(UI_DARK_BG);
    p.stroke(255, 100);
    p.strokeWeight(1.5);
    p.rect(pillX, pillY, pillW, pillH, 13);
    p.noStroke();
    p.fill(255);
    p.textAlign(p.CENTER, p.CENTER);
    p.text(stName, stationZone.x + stationZone.w / 2, pillY + pillH / 2);
    p.pop();
}

export function drawBus(p, bus, scaleFactor, inputState) {
    p.push();
    p.translate(bus.x, bus.y);
    p.rotate(bus.angle);

    let bw = bus.w;
    let bh = bus.h;

    p.noStroke();
    p.fill(0, 40);
    p.rect(-bh / 2 + 4, -bw / 2 + 6, bh, bw, 6);

    p.fill(COLOR_BUS_BODY);
    p.stroke(0, 100);
    p.strokeWeight(1);
    p.rect(bh / 2 - 10, -bw / 2 - 4, 6, 4, 1);
    p.rect(bh / 2 - 10, bw / 2, 6, 4, 1);

    p.noStroke();
    p.fill(COLOR_BUS_BODY);
    p.rect(-bh / 2, -bw / 2, bh, bw, 5);

    p.fill(255, 30);
    p.rect(-bh / 2 + 2, -bw / 2 + 2, bh - 4, bw / 4, 2);
    p.fill(0, 20);
    p.rect(-bh / 2 + 2, bw / 4 - bw / 2, bh - 4, bw / 2, 0);

    p.fill(180, 230, 255);
    p.rect(bh / 2 - 14, -bw / 2 + 2, 10, bw - 4, 2);
    p.fill(255, 150);
    p.rect(bh / 2 - 12, -bw / 2 + 4, 2, bw - 8, 1);

    p.fill(100, 150, 200);
    p.rect(-bh / 2 + 2, -bw / 2 + 3, 5, bw - 6, 1);

    p.fill(40);
    let winCount = 5;
    let winSpace = (bh - 25) / winCount;
    for (let i = 0; i < winCount; i++) {
        let wx = -bh / 2 + 12 + (i * winSpace);
        p.rect(wx, -bw / 2 + 1, winSpace - 3, 2);
        p.rect(wx, bw / 2 - 3, winSpace - 3, 2);
    }

    p.drawingContext.shadowBlur = 10;
    p.drawingContext.shadowColor = 'white';
    p.fill(255, 255, 220);
    p.rect(bh / 2 - 4, -bw / 2 + 3, 4, 7, 1);
    p.rect(bh / 2 - 4, bw / 2 - 10, 4, 7, 1);
    p.drawingContext.shadowBlur = 0;

    let isBraking = inputState.down && bus.speed > 0;
    p.fill(isBraking ? p.color(255, 0, 0) : p.color(150, 0, 0));
    if (isBraking) {
        p.drawingContext.shadowBlur = 15;
        p.drawingContext.shadowColor = 'red';
    }
    p.rect(-bh / 2 - 2, -bw / 2 + 3, 4, 8, 1);
    p.rect(-bh / 2 - 2, bw / 2 - 11, 4, 8, 1);
    p.drawingContext.shadowBlur = 0;

    p.fill('#a5281b');
    p.rect(bh / 2 - 16, -bw / 2 + 4, 2, bw - 8);

    p.fill(255);
    p.textAlign(p.CENTER, p.CENTER);
    p.push();
    p.rotate(p.PI / 2);
    p.textSize(18);
    p.text("46", 0, 0);
    p.pop();

    p.pop();
}

export function drawBloodSplats(p, bloodSplats) {
    p.noStroke();
    for (let s of bloodSplats) {
        p.randomSeed(s.seed);
        let n = p.floor(p.random(4, 7));
        for (let i = 0; i < n; i++) {
            let ox = p.random(-s.r * 0.6, s.r * 0.6);
            let oy = p.random(-s.r * 0.4, s.r * 0.4);
            let ew = p.random(s.r * 0.6, s.r * 1.2);
            let eh = p.random(s.r * 0.4, s.r * 0.8);
            p.fill(180, 0, 0, s.alpha);
            p.ellipse(s.x + ox, s.y + oy, ew, eh);
        }
    }
    p.randomSeed();
}

export function drawAngryBubble(p, x, y) {
    p.push();
    let bx = x;
    let by = y - 22;
    let wobble = p.sin(p.frameCount * 0.25 + x) * 2;
    by += wobble;

    p.fill(255, 60, 60, 220);
    p.noStroke();
    p.ellipse(bx, by, 18, 16);
    p.triangle(bx - 3, by + 7, bx + 3, by + 7, bx, by + 13);

    p.fill(255);
    p.textAlign(p.CENTER, p.CENTER);
    p.textStyle(p.BOLD);
    p.textSize(10);
    p.noStroke();
    p.text(p.frameCount % 40 < 20 ? "😠" : "!", bx, by);
    p.pop();
}
