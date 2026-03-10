import p5 from 'p5';
import * as Config from './src/config.js';
import { Person } from './src/entities/Person.js';
import { SmokeParticle } from './src/entities/SmokeParticle.js';
import { FleeingStudent } from './src/entities/FleeingStudent.js';
import { handleInput, updatePhysics } from './src/logic/physics.js';
import { spawnStationGroup } from './src/logic/gameplay.js';
import { drawHUD, drawBottomTicker, drawModalMessage, drawGameOverMenu, drawTutorialScreen } from './src/ui/components.js';
import { drawIslandEnvironment, drawUnivpmBuilding } from './src/render/environment.js';
import { drawStationMarker, drawBus, drawBloodSplats, drawAngryBubble } from './src/render/helpers.js';

const sketch = (p) => {
    let canvasW, canvasH;
    let mainFont = 'Arial';
    let scaleFactor = 1.0;
    let lastStationCenter = { x: null, y: null };
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
    let passengers = 0;
    let gameState = 'START';
    let currentStationIndex = 0;
    let stationZone, waitingArea;
    let waitingPeds = [];
    let loadingTimer = 0;
    let runOverCount = 0;
    let crashStationInitialPeds = 0;
    let bloodSplats = [];
    let lastPedestrianCount = { value: 0 };
    let tickerScrollState = { x: 0 };
    let explosionTimer = 0;
    let particles = [];
    let fleeingStudents = [];
    let textOpacity = 0;
    let univpmBuilding = { x: 0, y: 0, w: 150, h: 100 };
    let menuPeds = [];
    let currentIronicMessage = "";
    let tutorialAssets = { arrows: null, joystick: null, busstop: null };
    let currentStopInitialPeds = 0;

    p.preload = () => {
        tutorialAssets.arrows = p.loadImage('assets/arrows.png');
        tutorialAssets.joystick = p.loadImage('assets/joystick.png');
        tutorialAssets.busstop = p.loadImage('assets/busstop.png');
    };

    p.setup = () => {
        let w = p.windowWidth || window.innerWidth || 320;
        let h = p.windowHeight || window.innerHeight || 480;
        canvasW = p.max(320, p.min(w * 0.95, 800));
        canvasH = p.max(480, p.min(h * 0.95, 1200));

        let cnv = p.createCanvas(canvasW, canvasH);
        updateSizes();

        let container = document.getElementById('game-container');
        if (container) cnv.parent(container);

        p.textFont(mainFont);
        p.textStyle(p.BOLD);

        cnv.elt.addEventListener("touchstart", (e) => { e.preventDefault(); }, { passive: false });
        cnv.elt.addEventListener("touchmove", (e) => { e.preventDefault(); }, { passive: false });

        for (let i = 0; i < 15; i++) {
            menuPeds.push(new Person(p, p.random(p.width), p.random(p.height), scaleFactor));
        }

        initGame();
    };

    const updateSizes = () => {
        scaleFactor = p.width < 500 ? 0.8 : 1.0;
        bus.w = 36 * scaleFactor;
        bus.h = 96 * scaleFactor;
        univpmBuilding.w = 100 * scaleFactor;
        univpmBuilding.h = 80 * scaleFactor;
        univpmBuilding.x = p.width / 2 - univpmBuilding.w / 2;
        univpmBuilding.y = 70 * scaleFactor;
    };

    const initGame = () => {
        bus.x = p.width / 2;
        bus.y = p.height * 0.7;
        bus.angle = p.PI;
        bus.speed = 0;
        passengers = 0;
        currentStationIndex = 0;
        runOverCount = 0;
        bus.acceleration = 0.1;
        vJoy.active = false;
        inputState = { up: false, down: false, left: false, right: false };
        lastPedestrianCount.value = 0;
        tickerScrollState.x = p.width / 2;
        crashStationInitialPeds = 0;
        bloodSplats = [];
        explosionTimer = 0;
        particles = [];
        fleeingStudents = [];
        textOpacity = 0;
        lastStationCenter = { x: null, y: null };

        const spawned = spawnStationGroup(p, p.width, p.height, scaleFactor, bus, lastStationCenter, currentStationIndex, lastPedestrianCount, univpmBuilding);
        waitingArea = spawned.waitingArea;
        stationZone = spawned.stationZone;
        waitingPeds = spawned.waitingPeds;

        currentIronicMessage = p.random(Config.ironicMessages);
        gameState = 'START';
    };

    p.windowResized = () => {
        let w = window.innerWidth || 320;
        let h = window.innerHeight || 480;
        let hFactor = (w < 500) ? 0.92 : 0.95;
        canvasW = p.max(320, p.min(w * 0.95, 800));
        canvasH = p.max(480, p.min(h * hFactor, 1200));
        p.resizeCanvas(canvasW, canvasH);
        updateSizes();
    };

    p.draw = () => {
        drawIslandEnvironment(p);

        if (gameState === 'START') {
            drawModalMessage(p, p.width, p.height, "GULLIVER 46", "Riuscirai a portare tutti a lezione?", ["ACCENDI MOTORE"], menuPeds);
        } else if (gameState === 'HOW_TO_PLAY') {
            drawTutorialScreen(p, p.width, p.height, tutorialAssets, menuPeds);
        } else if (gameState === 'LOADING') {
            bus.speed = 0;
            processStationLoading();
            drawStationMarker(p, waitingArea, stationZone, currentStationIndex, Config.routeStations, scaleFactor);
            drawPedestrians();
            drawBus(p, bus, scaleFactor, inputState);
            drawHUD(p, p.width, p.height, passengers, currentStationIndex, gameState, waitingPeds.length, currentStopInitialPeds);
            drawBottomTicker(p, p.width, p.height, currentStationIndex, tickerScrollState, gameState);
        } else if (gameState === 'PLAYING') {
            handleInput(p, vJoy, inputState);
            updatePhysics(p, bus, vJoy, inputState, p.width, p.height, (gs) => gameState = gs);
            checkStationZone();
            drawStationMarker(p, waitingArea, stationZone, currentStationIndex, Config.routeStations, scaleFactor);
            drawPedestrians();
            drawBus(p, bus, scaleFactor, inputState);
            drawHUD(p, p.width, p.height, passengers, currentStationIndex, gameState, waitingPeds.length, currentStopInitialPeds);
            drawBottomTicker(p, p.width, p.height, currentStationIndex, tickerScrollState, gameState);
            drawMobileControls();
        } else if (gameState === 'GAMEOVER') {
            drawStationMarker(p, waitingArea, stationZone, currentStationIndex, Config.routeStations, scaleFactor);
            drawPedestrians();
            drawBus(p, bus, scaleFactor, inputState);
            drawGameOverMenu(p, p.width, p.height, currentIronicMessage, passengers, runOverCount, p.width < 500);
        } else {
            handleEndingSequence();
        }
    };

    const processStationLoading = () => {
        bus.speed = 0;
        bus.acceleration = 0;
        loadingTimer++;

        if (currentStationIndex === Config.FINAL_CRASH_STATION_INDEX - 1 && crashStationInitialPeds === 0) {
            crashStationInitialPeds = waitingPeds.length;
        }

        let isCrashStation = (currentStationIndex === Config.FINAL_CRASH_STATION_INDEX - 1);

        if (loadingTimer > 4) {
            for (let ped of waitingPeds) {
                if (!ped.isBoarding && !ped.isAngry) {
                    ped.isBoarding = true;
                    loadingTimer = 0;
                    break;
                }
            }
        }

        if (isCrashStation && crashStationInitialPeds > 0) {
            let angryCount = waitingPeds.filter(ped => ped.isAngry).length;
            if (angryCount >= Math.ceil(crashStationInitialPeds * 0.5)) {
                for (let ped of waitingPeds) {
                    fleeingStudents.push(new FleeingStudent(p, ped.x, ped.y, scaleFactor, univpmBuilding));
                }
                waitingPeds = [];
                gameState = 'EXPLODING_SHAKE';
                return;
            }
        }

        if (waitingPeds.length === 0) {
            if (loadingTimer > 30) {
                bus.acceleration = 0.1;
                currentStationIndex++;
                if (currentStationIndex >= Config.routeStations.length || currentStationIndex === Config.FINAL_CRASH_STATION_INDEX) {
                    gameState = 'EXPLODING_SHAKE';
                } else {
                    bloodSplats = [];
                    const spawned = spawnStationGroup(p, p.width, p.height, scaleFactor, bus, lastStationCenter, currentStationIndex, lastPedestrianCount, univpmBuilding);
                    waitingArea = spawned.waitingArea;
                    stationZone = spawned.stationZone;
                    waitingPeds = spawned.waitingPeds;
                    gameState = 'PLAYING';
                }
                loadingTimer = 0;
            }
        }
    };

    const checkStationZone = () => {
        if (bus.x > stationZone.x && bus.x < stationZone.x + stationZone.w &&
            bus.y > stationZone.y && bus.y < stationZone.y + stationZone.h) {
            if (p.abs(bus.speed) < 0.5) {
                gameState = 'LOADING';
                loadingTimer = 0;
                currentStopInitialPeds = waitingPeds.length;
            }
        }
    };

    const drawPedestrians = () => {
        let isCrashStation = (currentStationIndex === Config.FINAL_CRASH_STATION_INDEX - 1);
        let crashLoadingStarted = isCrashStation && crashStationInitialPeds > 0;
        drawBloodSplats(p, bloodSplats);

        for (let i = waitingPeds.length - 1; i >= 0; i--) {
            let ped = waitingPeds[i];
            if (ped.isBoarding) {
                let dx = bus.x - ped.x;
                let dy = bus.y - ped.y;
                let d = p.sqrt(dx * dx + dy * dy);
                ped.angle = p.atan2(dy, dx);
                let stopDist = isCrashStation ? 45 : 5;
                if (d > stopDist) {
                    ped.x += (dx / d) * 2;
                    ped.y += (dy / d) * 2;
                    ped.walkCycle += 0.3;
                } else {
                    if (isCrashStation) {
                        ped.isAngry = true;
                        ped.isBoarding = false;
                    } else {
                        passengers++;
                        waitingPeds.splice(i, 1);
                        continue;
                    }
                }
            }

            let hit = false;
            if (!ped.isBoarding && !ped.isAngry && p.abs(bus.speed) > 0.1) {
                // 3-circle collision check for better accuracy
                let cosA = p.cos(bus.angle);
                let sinA = p.sin(bus.angle);
                let r = (bus.w / 2) + 5; // Slightly increased radius for better consistency
                let offset = (bus.h / 2) - r;

                let checkPoints = [
                    { x: bus.x, y: bus.y },
                    { x: bus.x + offset * cosA, y: bus.y + offset * sinA },
                    { x: bus.x - offset * cosA, y: bus.y - offset * sinA }
                ];

                for (let cp of checkPoints) {
                    if (p.dist(ped.x, ped.y, cp.x, cp.y) < r + 2) { // Additional tiny buffer per student
                        hit = true;
                        break;
                    }
                }
            }

            if (hit) {
                runOverCount++;
                bloodSplats.push({ x: ped.x, y: ped.y, r: p.random(18, 28), alpha: p.random(160, 210), seed: p.floor(p.random(100000)) });
                waitingPeds.splice(i, 1);
                continue;
            }

            ped.draw();
            if (crashLoadingStarted && !ped.isBoarding) {
                drawAngryBubble(p, ped.x, ped.y);
            }
        }
    };

    const drawMobileControls = () => {
        if (vJoy.active) {
            p.push();
            p.fill(255, 30); p.stroke(255, 80); p.strokeWeight(2);
            p.ellipse(vJoy.baseX, vJoy.baseY, vJoy.maxR * 2 + 20);
            p.fill(255, 100); p.noStroke();
            p.ellipse(vJoy.stickX, vJoy.stickY, vJoy.maxR);
            p.pop();
        }
    };

    const handleEndingSequence = () => {
        drawIslandEnvironment(p);
        drawUnivpmBuilding(p, univpmBuilding);
        drawBottomTicker(p, p.width, p.height, currentStationIndex, tickerScrollState, gameState);
        explosionTimer++;

        for (let fs of fleeingStudents) {
            fs.update();
            fs.draw();
        }

        if (gameState === 'EXPLODING_SHAKE') {
            if (passengers === 0) passengers = 60;
            p.push(); p.translate(p.random(-4, 4), p.random(-4, 4)); drawBus(p, bus, scaleFactor, inputState); p.pop();
            if (explosionTimer % 2 === 0) particles.push(new SmokeParticle(p, bus.x, bus.y));
            if (explosionTimer > 90) {
                gameState = 'EXPLODING_BOOM'; explosionTimer = 0;
                for (let i = 0; i < passengers; i++) fleeingStudents.push(new FleeingStudent(p, bus.x + p.random(-20, 20), bus.y + p.random(-20, 20), scaleFactor, univpmBuilding));
            }
        } else if (gameState === 'EXPLODING_BOOM') {
            let r = explosionTimer * 20;
            p.fill(255, 100, 0, 255 - explosionTimer * 5); p.noStroke(); p.ellipse(bus.x, bus.y, r, r);
            p.fill(255, 255, 255, 200 - explosionTimer * 2); p.ellipse(bus.x, bus.y, r / 2, r / 2);
            if (explosionTimer > 60) { gameState = 'WALKING_AWAY'; explosionTimer = 0; }
        } else if (gameState === 'WALKING_AWAY' || gameState === 'FINAL_SCREEN') {
            if (explosionTimer > 120) gameState = 'FINAL_SCREEN';
            
            if (gameState === 'FINAL_SCREEN') {
                let isMobile = p.width < 500;
                textOpacity = p.min(textOpacity + 5, 255);
                
                // Dark Backdrop
                p.fill(0, textOpacity * 0.85);
                p.rect(0, 0, p.width, p.height);

                p.push();
                let modalW = p.min(p.width * 0.9, 450);
                let modalH = isMobile ? 520 : 580;
                let mx = p.width / 2 - modalW / 2;
                let my = p.height / 2 - modalH / 2;
                
                // Main Card
                p.fill(Config.UI_DARK_BG);
                p.stroke(255, 40);
                p.strokeWeight(1);
                p.drawingContext.shadowBlur = 30;
                p.drawingContext.shadowColor = p.color(0, 150);
                p.rect(mx, my, modalW, modalH, 25);
                p.drawingContext.shadowBlur = 0;

                // Title Area
                p.textAlign(p.CENTER, p.TOP);
                p.fill(255);
                p.textStyle(p.BOLD);
                p.textSize(isMobile ? 28 : 34);
                p.text("Il 46 è PIENO !!!", p.width / 2, my + 40);
                
                // Subtitle / Narrative
                p.textStyle(p.NORMAL);
                p.textSize(isMobile ? 14 : 16);
                p.fill(255, 220);
                let subY = my + 95;
                p.text("Farsela a piedi fino a Montedago\nnon è il massimo.", p.width / 2, subY);
                p.fill(255, 180);
                p.textSize(isMobile ? 12 : 14);
                p.text("Gulliver lavora da anni per un trasporto migliore.", p.width / 2, subY + 50);

                // Stats Section (Modern Box)
                let statsW = modalW * 0.85;
                let statsH = isMobile ? 80 : 90;
                let sx = p.width / 2 - statsW / 2;
                let sy = subY + 95;
                p.fill(0, 60);
                p.noStroke();
                p.rect(sx, sy, statsW, statsH, 15);
                
                p.textAlign(p.CENTER, p.CENTER);
                p.fill(255, 200);
                p.textSize(12);
                p.text("STATISTICHE DI VIAGGIO", p.width / 2, sy + 15);
                
                p.fill(255);
                p.textSize(isMobile ? 13 : 15);
                p.textStyle(p.BOLD);
                p.text(`Sardine in ritardo: ${passengers}`, p.width / 2, sy + 40);
                p.fill(Config.UI_BUTTON_RED);
                p.text(`Pedoni stirati: ${runOverCount}`, p.width / 2, sy + 62);

                // Action Buttons
                let btnW = modalW * 0.8;
                let btnH = isMobile ? 50 : 55;
                let btnX = p.width / 2;
                let btnVotaY = sy + statsH + 30;
                
                // VOTA Button
                p.fill(Config.UI_BUTTON_RED);
                p.rect(btnX - btnW / 2, btnVotaY, btnW, btnH, 12);
                p.fill(255);
                p.textSize(isMobile ? 20 : 22);
                p.text("VOTA GULLIVER", p.width / 2, btnVotaY + btnH / 2);

                // REPORT Button
                let btnReportY = btnVotaY + btnH + 15;
                p.fill('#2980b9');
                p.rect(btnX - btnW / 2, btnReportY, btnW, btnH, 12);
                p.fill(255);
                p.textSize(isMobile ? 14 : 16);
                p.text("LEGGI IL REPORT TRASPORTI", p.width / 2, btnReportY + btnH / 2);

                // Replay Button (Bottom of screen, subtle)
                let btnRipartiY = my + modalH - 45;
                p.fill(255, 180); // Increased visibility
                p.textAlign(p.CENTER, p.CENTER);
                p.textStyle(p.BOLD);
                p.textSize(14);
                p.text("TOCCA PER GIOCARE DI NUOVO", p.width / 2, btnRipartiY);
                p.pop();
            }
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update(); particles[i].show();
            if (particles[i].alpha <= 0) particles.splice(i, 1);
        }
    };

    p.touchStarted = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (p.touches && p.touches.length > 0) {
            handleUniversalClick(p.touches[0].x, p.touches[0].y);
        }
        return false;
    };

    p.touchEnded = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (p.touches && p.touches.length === 0) {
            handleUniversalClick(p.mouseX, p.mouseY);
        }
        return false;
    };

    p.mouseReleased = () => {
        if (p.width >= 500) {
            handleUniversalClick(p.mouseX, p.mouseY);
        }
        return false;
    };

    const handleUniversalClick = (mx, my) => {
        if (gameState === 'START') {
            let isMobile = p.width < 500;
            let modalH = isMobile ? 380 : 350;
            let modalY = p.height / 2 - modalH / 2;
            let btnY = modalY + 180;
            if (isButtonAt(mx, my, p.width / 2, btnY, 240, 60)) {
                gameState = 'HOW_TO_PLAY';
            }
        } else if (gameState === 'HOW_TO_PLAY') {
            let isMobile = p.width < 500;
            let modalH = isMobile ? 540 : 580;
            let modalY = p.height / 2 - modalH / 2;
            let btnY = modalY + modalH - 80;
            if (isButtonAt(mx, my, p.width / 2, btnY, 200, 50)) {
                gameState = 'PLAYING';
            }
        } else if (gameState === 'GAMEOVER') {
            let isMobile = p.width < 500;
            let modalW = isMobile ? p.width * 0.9 : 400;
            let modalH = isMobile ? 400 : 360;
            let modalY = p.height / 2 - modalH / 2;
            let btnY = modalY + modalH - 85;
            if (isButtonAt(mx, my, p.width / 2, btnY, isMobile ? modalW * 0.7 : 240, 55)) {
                initGame();
            }
        } else if (gameState === 'FINAL_SCREEN') {
            let isMobile = p.width < 500;
            let modalW = p.min(p.width * 0.9, 450);
            let modalH = isMobile ? 520 : 580;
            let modalY = p.height / 2 - modalH / 2;
            let subY = modalY + 95;
            let sy = subY + 95;
            let btnW = modalW * 0.8;
            let btnH = isMobile ? 50 : 55;
            let btnVotaY = sy + (isMobile ? 80 : 90) + 30; // sy + statsH + 30
            let btnReportY = btnVotaY + btnH + 15;
            let btnRipartiY = modalY + modalH - 50;

            if (isButtonAt(mx, my, p.width / 2, btnRipartiY - 20, btnW, 40)) { // Adjusted for "Tocca per giocare di nuovo"
                initGame();
            } else if (isButtonAt(mx, my, p.width / 2, btnVotaY, btnW, btnH)) {
                window.open('https://www.instagram.com/acu_gulliver/', '_blank');
            } else if (isButtonAt(mx, my, p.width / 2, btnReportY, btnW, btnH)) {
                let pdfUrl = 'https://ugc.production.linktr.ee/818a15e8-6f08-441d-84f9-d8a20c7a6499_REPORT-QUESTIONARIO-TRASPORTI.pdf';
                window.open('https://docs.google.com/viewer?url=' + encodeURIComponent(pdfUrl), '_blank');
            }
        }
    };

    const isButtonAt = (mx, my, x, y, w, h) => {
        let padding = (p.width < 500) ? 15 : 0;
        return (mx > x - w / 2 - padding && mx < x + w / 2 + padding &&
            my > y - padding && my < y + h + padding);
    };
};

new p5(sketch);
