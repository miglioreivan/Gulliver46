import { COLOR_STUDENT_PANTS, COLOR_STUDENT_SKIN } from '../config.js';

export class Person {
    constructor(p, x, y, scaleFactor) {
        this.p = p;
        this.x = x; 
        this.y = y; 
        this.angle = p.random(p.TWO_PI);
        this.offsetTimer = p.random(100); 
        this.walkCycle = 0;
        this.shirtColor = [p.random(50, 255), p.random(50, 255), p.random(50, 255)];
        this.isBoarding = false;
        this.scaleFactor = scaleFactor;
        this.isAngry = false;
    }

    draw() {
        const p = this.p;
        p.push(); 
        p.translate(this.x, this.y); 
        p.rotate(this.angle);
        p.scale(this.scaleFactor);

        // 1. Ombra minuscola per distacco dal terreno
        p.noStroke();
        p.fill(0, 40);
        p.ellipse(0, 2, 12, 12);

        // 2. Stroke scuro per contrasto
        p.stroke(0, 100);
        p.strokeWeight(1);

        let legOffset = p.sin(this.walkCycle) * 4;
        p.fill(COLOR_STUDENT_PANTS); 
        p.rect(-5, -6 + legOffset, 4, 8, 2);
        p.rect(-5, 2 - legOffset, 4, 8, 2);

        p.fill(this.shirtColor[0], this.shirtColor[1], this.shirtColor[2]); 
        p.rect(-6, -5, 12, 10, 3);
        
        let armOffset = p.sin(this.walkCycle + p.PI) * 4;
        p.fill(COLOR_STUDENT_SKIN);
        p.rect(0, -7 + armOffset, 4, 3, 1);
        p.rect(0, 4 - armOffset, 4, 3, 1);

        // Testa e Capelli
        p.ellipse(0, 0, 8, 8);
        p.noStroke(); 
        p.fill('#8e44ad'); 
        p.arc(0, 0, 8, 10, -p.PI / 2, p.PI / 2);

        if (this.walkCycle === 0) p.rotate(p.sin(p.frameCount * 0.1 + this.offsetTimer) * 0.2);
        p.pop();
    }
}
