import { Person } from '../entities/Person.js';

export function spawnStationGroup(p, width, height, scaleFactor, bus, lastStationCenter, currentStationIndex, lastPedestrianCount, univpmBuilding) {
    let waitingPeds = [];
    
    let areaW = p.constrain(p.floor(width * 0.35), 100, 220) * scaleFactor;
    let sidewalkH = p.constrain(p.floor(height * 0.12), 60, 140) * scaleFactor;
    let areaH = p.constrain(p.floor(height * 0.14), 80, 180) * scaleFactor;
    let totalH = sidewalkH + areaH + (70 * scaleFactor);

    let numStudents = 0;
    if (currentStationIndex === 0) {
        numStudents = p.floor(p.random(25, 35));
    } else {
        let increase = p.floor(p.random(10, 20));
        numStudents = lastPedestrianCount.value + increase;
    }
    lastPedestrianCount.value = numStudents;

    let busSize = p.max(bus.w, bus.h);
    let busBuffer = (busSize * 0.8) + (width < 500 ? 30 : 10);
    let minDistanceFromPrev = (width < 500) ? width * 0.25 : width * 0.15;

    let sx = 0, sy = 0;
    let validArea = false;
    let safetyCounter = 0;
    let maxAttempts = 300;

    while (!validArea && safetyCounter < maxAttempts) {
        safetyCounter++;
        let marginX = width < 500 ? 40 : 30;
        let marginY = width < 500 ? 100 : 80;
        
        sx = p.random(marginX, width - areaW - marginX);
        sy = p.random(marginY, height - totalH - 120);

        let monAreaX = width - 200;
        let monAreaY = 320;
        if (sx + areaW > monAreaX && sy < monAreaY) continue;
        if (sx + areaW > univpmBuilding.x - 20 && sx < univpmBuilding.x + univpmBuilding.w + 20 &&
            sy < univpmBuilding.y + univpmBuilding.h + 20) continue;

        if (lastStationCenter.x !== null) {
            let d = p.dist(sx + areaW / 2, sy + totalH / 2, lastStationCenter.x, lastStationCenter.y);
            if (d < minDistanceFromPrev) continue;
        }

        let busRect = {
            x: bus.x - busSize / 2 - busBuffer,
            y: bus.y - busSize / 2 - busBuffer,
            w: busSize + busBuffer * 2,
            h: busSize + busBuffer * 2
        };
        let stationRect = {
            x: sx - 10,
            y: sy - 10,
            w: areaW + 20,
            h: totalH + 20
        };

        let overlap = !(stationRect.x + stationRect.w < busRect.x ||
                        stationRect.x > busRect.x + busRect.w ||
                        stationRect.y + stationRect.h < busRect.y ||
                        stationRect.y > busRect.y + busRect.h);

        if (overlap) {
            let dirX = (sx + areaW / 2 < bus.x) ? -1 : 1;
            sx += dirX * (busBuffer + 20);
            if (sx < marginX || sx + areaW > width - marginX) continue;
            stationRect.x = sx - 10;
            overlap = !(stationRect.x + stationRect.w < busRect.x ||
                        stationRect.x > busRect.x + busRect.w ||
                        stationRect.y + stationRect.h < busRect.y ||
                        stationRect.y > busRect.y + busRect.h);
            if (overlap) continue;
        }

        validArea = true;
    }

    if (!validArea) {
        sx = (bus.x < width / 2) ? width - areaW - 40 : 40;
        sy = p.constrain(height * 0.3, 100, height - totalH - 150);
    }

    let waitingArea = { x: sx, y: sy, w: areaW, h: sidewalkH };
    let stationZone = { x: sx, y: sy + sidewalkH, w: areaW, h: areaH };
    
    lastStationCenter.x = sx + areaW / 2;
    lastStationCenter.y = sy + totalH / 2;

    for (let i = 0; i < numStudents; i++) {
        let px = waitingArea.x + p.random(8, p.max(8, waitingArea.w - 8));
        let py = waitingArea.y + p.random(8, p.max(8, waitingArea.h - 8));
        waitingPeds.push(new Person(p, px, py, scaleFactor));
    }

    return { waitingArea, stationZone, waitingPeds };
}
