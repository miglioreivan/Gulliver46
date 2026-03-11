export function handleInput(p, vJoy, inputState) {
    inputState.up = p.keyIsDown(p.UP_ARROW) || p.keyIsDown(87);
    inputState.down = p.keyIsDown(p.DOWN_ARROW) || p.keyIsDown(83);
    inputState.left = p.keyIsDown(p.LEFT_ARROW) || p.keyIsDown(65);
    inputState.right = p.keyIsDown(p.RIGHT_ARROW) || p.keyIsDown(68);

    if (p.touches.length > 0) {
        if (!vJoy.active) {
            vJoy.active = true;
            vJoy.touchId = p.touches[0].id;
            vJoy.baseX = p.touches[0].x;
            vJoy.baseY = p.touches[0].y;
            vJoy.stickX = p.touches[0].x;
            vJoy.stickY = p.touches[0].y;
        } else {
            let found = false;
            for (let i = 0; i < p.touches.length; i++) {
                if (p.touches[i].id === vJoy.touchId || p.touches.length === 1) {
                    found = true;
                    let dx = p.touches[i].x - vJoy.baseX;
                    let dy = p.touches[i].y - vJoy.baseY;
                    let distPx = p.sqrt(dx * dx + dy * dy);
                    if (distPx > vJoy.maxR) {
                        dx = (dx / distPx) * vJoy.maxR;
                        dy = (dy / distPx) * vJoy.maxR;
                    }
                    vJoy.stickX = vJoy.baseX + dx;
                    vJoy.stickY = vJoy.baseY + dy;
                    break;
                }
            }
            if (!found) vJoy.active = false;
        }
    } else {
        vJoy.active = false;
    }
}

export function updatePhysics(p, bus, vJoy, inputState, width, height, setGameState) {
    if (vJoy.active) {
        let dx = vJoy.stickX - vJoy.baseX;
        let dy = vJoy.stickY - vJoy.baseY;
        let distPx = p.sqrt(dx * dx + dy * dy);

        if (distPx > 10) {
            let targetAngle = p.atan2(dy, dx);
            bus.angle = targetAngle;
            let touchMaxSpeed = bus.maxSpeed * 1.0;
            let targetSpeed = p.map(distPx, 10, vJoy.maxR, 0, touchMaxSpeed, true);
            bus.speed = p.lerp(bus.speed, targetSpeed, 0.8);
        } else {
            bus.speed = 0;
        }
    } else {
        if (inputState.up) bus.speed += bus.acceleration;
        else if (inputState.down) bus.speed -= bus.acceleration;
        else {
            if (width < 500) {
                bus.speed = 0;
            } else {
                if (bus.speed > 0) bus.speed -= bus.friction;
                if (bus.speed < 0) bus.speed += bus.friction;
                if (p.abs(bus.speed) < bus.friction) bus.speed = 0;
            }
        }

        bus.speed = p.constrain(bus.speed, -bus.maxSpeed / 2, bus.maxSpeed);

        if (p.abs(bus.speed) > 0.5) {
            let turnDir = (bus.speed > 0) ? 1 : -1;
            if (inputState.left) bus.angle -= bus.turnSpeed * turnDir;
            if (inputState.right) bus.angle += bus.turnSpeed * turnDir;
        }
    }

    bus.x += p.cos(bus.angle) * bus.speed;
    bus.y += p.sin(bus.angle) * bus.speed;

    // Controllo Game Over
    let hudBottom = 55;
    let tickerTop = height - (width < 500 ? 75 : 95);
    let bh = bus.h / 2;
    let bw = bus.w / 2;
    let cosA = p.cos(bus.angle);
    let sinA = p.sin(bus.angle);

    let r = bw + 2; // Check radius (half-width + tiny buffer)
    let offset = bh - r;
    let checkPoints = [
        { x: bus.x, y: bus.y },
        { x: bus.x + offset * cosA, y: bus.y + offset * sinA },
        { x: bus.x - offset * cosA, y: bus.y - offset * sinA }
    ];

    for (let cp of checkPoints) {
        if (cp.x - r < -2 || cp.x + r > width + 2 || 
            cp.y - r < hudBottom - 2 || cp.y + r > tickerTop + 2) {
            setGameState('CRASHING');
            break;
        }
    }
}
