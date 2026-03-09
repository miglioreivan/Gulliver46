let bus;
let persone = [];
let passeggeri = 0;
let limitePieno = 10;
let giocoFinito = false;

function setup() {
  createCanvas(400, 600);
  bus = createVector(width / 2, height - 50);
}

function draw() {
  background(220);
  
  if (!giocoFinito) {
    // Disegna il "Bus 46"
    fill(255, 150, 0); // Arancione bus
    rect(bus.x, bus.y, 40, 20);
    fill(0);
    text("46", bus.x + 10, bus.y + 15);

    // Logica movimento (semplificata per test)
    if (keyIsDown(LEFT_ARROW)) bus.x -= 3;
    if (keyIsDown(RIGHT_ARROW)) bus.x += 3;
    bus.y -= 1; // Il bus sale verso Tavernelle

    // Trigger Esplosione (Esempio a coordinate o passeggeri)
    if (bus.y < 100 || passeggeri >= limitePieno) {
      esplosione();
    }
  } else {
    schermataVotaGulliver();
  }
}

function esplosione() {
  giocoFinito = true;
}

function schermataVotaGulliver() {
  textAlign(CENTER);
  textSize(24);
  text("💥 BOOM!", width/2, height/2 - 50);
  textSize(18);
  text("Il 46 è pieno.\nOra te la fai a piedi...", width/2, height/2);
  fill(0, 102, 153);
  textSize(30);
  text("VOTA GULLIVER", width/2, height/2 + 80);
}
