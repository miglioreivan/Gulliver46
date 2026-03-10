import { UI_DARK_BG, UI_BUTTON_RED, routeStations, FINAL_CRASH_STATION_INDEX } from '../config.js';

export function drawHUD(p, width, height, passengers, currentStationIndex, gameState) {
    p.push();
    p.fill(UI_DARK_BG);
    p.noStroke();
    p.rect(0, 0, width, 55);

    p.fill(0, 50);
    p.rect(0, 55, width, 4);

    p.fill(255);
    p.textAlign(p.LEFT, p.CENTER);
    p.textSize(18);
    p.text(`Sardine a bordo: ${passengers}`, 15, 27);

    p.textAlign(p.RIGHT, p.CENTER);
    p.textSize(14);
    p.text(`Pros: ${routeStations[currentStationIndex]}`, width - 15, 27);

    if (gameState === 'LOADING') {
        p.fill(0, 150);
        p.rect(0, height / 2 - 30, width, 60);
        p.textAlign(p.CENTER, p.CENTER);
        p.fill(255, 204, 0);
        p.textSize(28);
        p.text("FERMO E CARICA...", width / 2, height / 2);
    }
    p.pop();
}

export function drawBottomTicker(p, width, height, currentStationIndex, tickerScrollState, gameState) {
    p.push();
    let isMobile = width < 500;
    let margin = isMobile ? 10 : 20;
    let barW = width - (margin * 2);
    let barH = isMobile ? 65 : 75;
    let barX = margin;
    let barY = height - barH - margin;

    p.fill(0, 200);
    p.stroke(255, 40);
    p.strokeWeight(1.5);
    p.rect(barX, barY, barW, barH, 15);

    p.fill(255, 220);
    p.textAlign(p.CENTER, p.TOP);
    p.textSize(isMobile ? 11 : 12);
    p.textStyle(p.BOLD);
    let instruction = (gameState === 'LOADING') ? "ATTENDI CARICAMENTO..." : "SPOSTA L'AUTOBUS NELLA ZONA TRATTEGGIATA";
    p.text(instruction, width / 2, barY + (isMobile ? 10 : 12));

    let spacing = isMobile ? 130 : 160;
    let targetX = -currentStationIndex * spacing + width / 2;
    tickerScrollState.x = p.lerp(tickerScrollState.x, targetX, 0.1);

    p.push();
    p.translate(tickerScrollState.x, barY + (isMobile ? 38 : 45));

    for (let i = 0; i < routeStations.length; i++) {
        let sx = i * spacing;
        let isPast = i < currentStationIndex;
        let isCurrent = i === currentStationIndex;
        let isExploded = (gameState.startsWith('EXPLODING') || gameState === 'WALKING_AWAY' || gameState === 'FINAL_SCREEN') && i >= FINAL_CRASH_STATION_INDEX;

        if (i < routeStations.length - 1) {
            p.strokeWeight(3);
            let nextIndex = i + 1;
            let isNextExploded = (gameState.startsWith('EXPLODING') || gameState === 'WALKING_AWAY' || gameState === 'FINAL_SCREEN') && nextIndex >= FINAL_CRASH_STATION_INDEX;

            if (isNextExploded) p.stroke(200, 0, 0);
            else if (i < currentStationIndex) p.stroke(0, 100, 255);
            else p.stroke(60);
            p.line(sx + 8, 0, sx + spacing - 8, 0);
        }

        p.noStroke();
        if (isExploded) p.fill(200, 0, 0);
        else if (isCurrent) {
            p.fill(0, 100, 255, 50);
            p.ellipse(sx, 0, 20, 20);
            p.fill(0, 100, 255);
        }
        else if (isPast) p.fill(150);
        else p.fill(60);
        p.ellipse(sx, 0, isCurrent ? 12 : 8, isCurrent ? 12 : 8);

        if (isCurrent || isExploded || p.dist(sx + tickerScrollState.x, 0, width / 2, 0) < spacing * 0.8) {
            p.textAlign(p.CENTER, p.TOP);
            p.textSize(isCurrent ? 11 : 9);
            p.textStyle(isCurrent ? p.BOLD : p.NORMAL);
            p.fill(isExploded ? p.color(200, 0, 0) : (isCurrent ? 255 : 180));
            let name = routeStations[i];
            if (name.length > 18) name = name.substring(0, 16) + "..";
            p.text(name, sx, 10);
        }
    }
    p.pop();
    p.pop();
}

export function drawModalMessage(p, width, height, title, subtitle, buttons, menuPeds) {
    p.push();
    if (menuPeds) {
        for (let ped of menuPeds) {
            ped.x += p.cos(ped.angle) * 0.5;
            ped.y += p.sin(ped.angle) * 0.5;
            if (ped.x < 0) ped.x = width; if (ped.x > width) ped.x = 0;
            if (ped.y < 0) ped.y = height; if (ped.y > height) ped.y = 0;
            ped.draw();
        }
    }

    p.fill(0, 180);
    p.rect(0, 0, width, height);

    p.fill(UI_BUTTON_RED);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(42);
    p.text(title, width / 2, height / 3 - 50);

    p.stroke(UI_BUTTON_RED);
    p.strokeWeight(3);
    p.line(width / 2 - 40, height / 3 - 10, width / 2 + 40, height / 3 - 10);
    p.noStroke();

    p.fill(255);
    p.textSize(18);
    p.text(subtitle, width / 2, height / 3 + 40);

    let btnArray = Array.isArray(buttons) ? buttons : [buttons];
    let btnW = 240;
    let btnH = 60;
    let spacing = 15;
    let pulse = p.sin(p.frameCount * 0.1) * 3;

    for (let i = 0; i < btnArray.length; i++) {
        let btnY = height / 2 + 80 + i * (btnH + spacing);
        let btnX = width / 2 - (btnW + pulse) / 2;
        p.fill(UI_BUTTON_RED);
        p.rect(btnX, btnY, btnW + pulse, btnH, 12);
        p.fill(255);
        p.textSize(22);
        p.text(btnArray[i], width / 2, btnY + btnH / 2);
    }
    p.pop();
}

export function drawGameOverMenu(p, width, height, currentIronicMessage, passengers, runOverCount, isMobile) {
    p.push();
    p.fill(0, 180);
    p.rect(0, 0, width, height);

    let modalW = isMobile ? width * 0.9 : 400;
    let modalH = isMobile ? 350 : 320;
    let mx = width / 2 - modalW / 2;
    let my = height / 2 - modalH / 2;

    p.fill(UI_DARK_BG);
    p.stroke(255, 30);
    p.strokeWeight(2);
    p.rect(mx, my, modalW, modalH, 15);

    p.textAlign(p.CENTER, p.TOP);
    p.textStyle(p.BOLD);
    p.fill(UI_BUTTON_RED);
    p.textSize(isMobile ? 22 : 26);
    let titlePadding = 20;
    p.text(currentIronicMessage, width / 2 - modalW / 2 + titlePadding, my + 30, modalW - titlePadding * 2);

    p.fill(255);
    p.textSize(isMobile ? 14 : 16);
    p.textLeading(20);
    p.textAlign(p.CENTER, p.CENTER);
    let statsText = `Passeggeri arrivati in ritardo: ${passengers}\nPedoni stirati: ${runOverCount}\n\nNon scoraggiarti,\nGulliver crede in te!`;
    p.text(statsText, width / 2, my + modalH / 2 + 25);

    let btnW = isMobile ? modalW * 0.7 : 240;
    let btnH = 50;
    let bx = width / 2;
    let by = my + modalH - 70;

    p.fill(UI_BUTTON_RED);
    p.noStroke();
    p.rect(bx - btnW / 2, by, btnW, btnH, 10);
    p.fill(255);
    p.textSize(isMobile ? 18 : 20);
    p.text("RIPROVA", bx, by + btnH / 2);
    p.pop();
}
