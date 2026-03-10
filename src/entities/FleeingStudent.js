import { Person } from './Person.js';

export class FleeingStudent extends Person {
    constructor(p, x, y, scaleFactor, building) {
        super(p, x, y, scaleFactor);
        this.targetX = building.x + building.w / 2 + p.random(-40, 40);
        this.targetY = building.y + building.h / 2 + p.random(20, 50);
        this.speed = p.random(0.5, 2);
    }
    update() {
        const p = this.p;
        let dx = this.targetX - this.x; 
        let dy = this.targetY - this.y;
        this.angle = p.atan2(dy, dx);
        if (p.dist(this.x, this.y, this.targetX, this.targetY) > 10) {
            this.x += p.cos(this.angle) * this.speed; 
            this.y += p.sin(this.angle) * this.speed;
            this.walkCycle += this.speed * 0.2;
        } else { 
            this.walkCycle = 0; 
        }
    }
}
