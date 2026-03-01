class Star {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = 15;
    this.collected = false;
    this.angle = 0;
  }

  update(player) {
    if (this.collected) return;

    // Simple distance-based collision
    let d = dist(player.x, player.y, this.x, this.y);
    if (d < player.r + this.r) {
      this.collected = true;
      player.starsCollected++;
    }
    
    this.angle += 0.05;
  }

  draw() {
    if (this.collected) return;

    push();
    translate(this.x, this.y);
    rotate(this.angle);
    fill("gold");
    stroke("orange");
    strokeWeight(2);
    
    // Draw a star shape
    beginShape();
    for (let i = 0; i < 10; i++) {
      let radius = i % 2 === 0 ? this.r : this.r / 2;
      let angle = TWO_PI * i / 10;
      let sx = cos(angle) * radius;
      let sy = sin(angle) * radius;
      vertex(sx, sy);
    }
    endShape(CLOSE);
    pop();
  }
}