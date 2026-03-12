import { UI_DARK_BG, UI_BUTTON_RED, routeStations, FINAL_CRASH_STATION_INDEX } from '../config.js';
import { drawBus } from '../render/helpers.js';

export function drawHUD(p, width, height, passengers, currentStationIndex, gameState, waitingPedsCount, initialPedsCount) {
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
    p.pop();
}

export function drawBottomTicker(p, width, height, currentStationIndex, tickerScrollState, gameState, waitingPedsCount, initialPedsCount) {
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

    // Subtle loading progress bar just above the stops
    if (gameState === 'LOADING' && initialPedsCount > 0 && currentStationIndex !== 3) {
        let progress = (initialPedsCount - waitingPedsCount) / initialPedsCount;
        p.noStroke();
        p.fill(UI_BUTTON_RED);
        // Draws a 4px line that fills across the top of the ticker
        p.rect(barX + 10, barY + 4, (barW - 20) * progress, 3, 2);
        
        p.textSize(9);
        p.textAlign(p.LEFT, p.TOP);
        p.fill(UI_BUTTON_RED);
        p.text(`${Math.floor(progress * 100)}%`, barX + 12, barY + 10);
    }

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

function drawModernCard(p, width, height, modalW, modalH) {
    let mx = width / 2 - modalW / 2;
    let my = height / 2 - modalH / 2;

    p.push();
    p.fill(UI_DARK_BG);
    p.stroke(255, 40);
    p.strokeWeight(1);
    p.drawingContext.shadowBlur = 30;
    p.drawingContext.shadowColor = p.color(0, 150);
    p.rect(mx, my, modalW, modalH, 25);
    p.drawingContext.shadowBlur = 0;
    p.pop();

    return { mx, my };
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

    let isMobile = width < 500;
    let modalW = p.min(width * 0.9, 400);
    let modalH = isMobile ? 380 : 350;
    let { mx, my } = drawModernCard(p, width, height, modalW, modalH);

    // Draw the bus icon above the title
    p.push();
    let busW = 36 * (isMobile ? 0.8 : 1);
    let busH = 96 * (isMobile ? 0.8 : 1);
    let busX = width / 2;
    let busY = my + 50;
    // We want it horizontal, so we need to account for drawBus which assumes bus.h is vertical length and bus.w is horizontal width when angle is 0
    // Actually drawBus does: rotate(bus.angle), then draws body with rect(-bh/2, -bw/2, bh, bw)
    // So with angle 0, bh (96) is along X axis, bw (36) is along Y axis. This is exactly what we want for "horizontal"
    drawBus(p, { x: busX, y: busY, w: busW, h: busH, angle: 0 }, 1, { down: false });
    p.pop();

    p.textAlign(p.CENTER, p.TOP);
    p.fill(UI_BUTTON_RED);
    p.textStyle(p.BOLD);
    p.textSize(isMobile ? 32 : 42);
    p.text(title, width / 2, my + 100);

    p.fill(255, 100);
    p.rect(width / 2 - 30, my + 155, 60, 3, 2);

    p.fill(255);
    p.textStyle(p.NORMAL);
    p.textSize(18);
    p.text(subtitle, width / 2, my + 180);

    let btnArray = Array.isArray(buttons) ? buttons : [buttons];
    let btnW = modalW * 0.8;
    let btnH = 60;
    let pulse = p.sin(p.frameCount * 0.1) * 3;

    for (let i = 0; i < btnArray.length; i++) {
        let btnY = my + 240 + i * (btnH + 15);
        p.fill(UI_BUTTON_RED);
        p.noStroke();
        p.rect(width / 2 - (btnW + pulse) / 2, btnY, btnW + pulse, btnH, 15);
        p.fill(255);
        p.textStyle(p.BOLD);
        p.textSize(22);
        p.textAlign(p.CENTER, p.CENTER);
        p.text(btnArray[i], width / 2, btnY + btnH / 2);
    }

    // GitHub Link at the bottom
    p.textAlign(p.CENTER, p.BOTTOM);
    p.textSize(14);
    p.textStyle(p.NORMAL);
    p.fill(255, 150);
    p.text("GitHub Repository", width / 2, my + modalH - 20);
    
    p.pop();
}

export function drawGameOverMenu(p, width, height, currentIronicMessage, passengers, runOverCount, isMobile) {
    p.push();
    p.fill(0, 180);
    p.rect(0, 0, width, height);

    let modalW = isMobile ? width * 0.9 : 400;
    let modalH = isMobile ? 400 : 360;
    let { mx, my } = drawModernCard(p, width, height, modalW, modalH);

    p.textAlign(p.CENTER, p.TOP);
    p.textStyle(p.BOLD);
    p.fill(UI_BUTTON_RED);
    p.textSize(isMobile ? 22 : 26);
    let titlePadding = 30;
    p.text(currentIronicMessage, width / 2 - modalW / 2 + titlePadding, my + 40, modalW - titlePadding * 2);

    p.fill(255, 40);
    p.rect(width / 2 - 40, my + 120, 80, 2);

    // Stats Section
    let sy = my + 145;
    p.textAlign(p.CENTER, p.CENTER);
    p.fill(255, 180);
    p.textSize(12);
    p.text("STATISTICHE", width / 2, sy);

    p.fill(255);
    p.textSize(isMobile ? 14 : 16);
    p.textStyle(p.BOLD);
    p.text(`Sardine in ritardo: ${passengers}`, width / 2, sy + 25);
    p.fill(UI_BUTTON_RED);
    p.text(`Pedoni stirati: ${runOverCount}`, width / 2, sy + 48);

    p.fill(255, 150);
    p.textStyle(p.ITALIC);
    p.textSize(12);
    p.text("Non scoraggiarti, Gulliver crede in te!", width / 2, sy + 85);

    let btnW = modalW * 0.7;
    let btnH = 55;
    let by = my + modalH - 85;

    p.fill(UI_BUTTON_RED);
    p.noStroke();
    p.rect(width / 2 - btnW / 2, by, btnW, btnH, 15);
    p.fill(255);
    p.textStyle(p.BOLD);
    p.textSize(20);
    p.text("RIPROVA", width / 2, by + btnH / 2);
    p.pop();
}

export function drawTutorialScreen(p, width, height, assets, menuPeds) {
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

    p.fill(0, 220);
    p.rect(0, 0, width, height);

    let isMobile = width < 500;
    let modalW = p.min(width * 0.95, 480);
    let modalH = isMobile ? 540 : 580; // Optimized height
    let { mx, my } = drawModernCard(p, width, height, modalW, modalH);

    p.fill(255);
    p.textAlign(p.CENTER, p.TOP);
    p.textStyle(p.BOLD);
    p.textSize(isMobile ? 26 : 32);
    p.text("COME SI GIOCA", width / 2, my + 30);

    let currentY = my + 80;
    let iconSize = isMobile ? 70 : 85;

    // Controls Section (Side-by-Side)
    p.imageMode(p.CENTER);
    if (assets.arrows && assets.joystick) {
        let spacing = modalW * 0.18; // Reduced spacing
        p.image(assets.arrows, width / 2 - spacing, currentY + iconSize / 2, iconSize, iconSize);
        p.image(assets.joystick, width / 2 + spacing, currentY + iconSize / 2, iconSize, iconSize);
        currentY += iconSize + 10;
        p.fill(255, 200);
        p.textStyle(p.NORMAL);
        p.textSize(isMobile ? 12 : 14);
        p.text("Utilizza le frecce o trascina il dito sullo schermo per guidare.", width / 2, currentY);
        currentY += 45;
    }

    // Bus Stop Section (Height-constrained scaling)
    if (assets.busstop) {
        let maxH = isMobile ? 120 : 150;
        let ratio = assets.busstop.width / assets.busstop.height;
        let stopImgH = maxH;
        let stopImgW = stopImgH * ratio;

        // Ensure it doesn't exceed width either
        if (stopImgW > modalW * 0.8) {
            stopImgW = modalW * 0.8;
            stopImgH = stopImgW / ratio;
        }

        p.imageMode(p.CENTER);
        p.image(assets.busstop, width / 2, currentY + stopImgH / 2, stopImgW, stopImgH);
        currentY += stopImgH + 10;
        p.fill(255, 204, 0);
        p.textStyle(p.BOLD);
        p.textSize(isMobile ? 15 : 18);
        p.text("Fermati nelle zone tratteggiate!", width / 2, currentY);
        currentY += 35;
    }

    // General Instructions
    p.fill(255, 100, 100);
    p.textStyle(p.BOLD);
    p.textSize(isMobile ? 14 : 16);
    p.text("Non stirare nessuno!", width / 2, currentY);

    // OK Button
    let btnW = modalW * 0.5;
    let btnH = 50;
    let btnY = my + modalH - 80;

    let pulse = p.sin(p.frameCount * 0.1) * 3;
    p.fill(UI_BUTTON_RED);
    p.noStroke();
    p.rect(width / 2 - (btnW + pulse) / 2, btnY, btnW + pulse, btnH, 15);
    p.fill(255);
    p.textSize(22);
    p.textAlign(p.CENTER, p.CENTER);
    p.text("OK", width / 2, btnY + btnH / 2);

    p.pop();
}

