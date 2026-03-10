export class SmokeParticle {
    constructor(p, x, y) {
        this.p = p;
        this.x = x + p.random(-30, 30); 
        this.y = y + p.random(-30, 30);
        this.vx = p.random(-1, 1); 
        this.vy = p.random(-3, -1);
        this.alpha = 255; 
        this.d = p.random(10, 40);
    }
    update() { 
        this.x += this.vx; 
        this.y += this.vy; 
        this.alpha -= 5; 
    }
    show() { 
        const p = this.p;
        p.noStroke(); 
        p.fill(50, 50, 50, this.alpha); 
        p.ellipse(this.x, this.y, this.d); 
    }
}
