class Checkpoint {
  constructor(x, y, text = "Checkpoint") {
    this.x = x;
    this.y = y;
    this.text = text;
    this.stemH = 44;
    this.headY = -this.stemH;
    this.hitR = 24;
  }

  update(player) {
    const centerY = this.y + this.headY;
    return dist(player.x, player.y, this.x, centerY) < player.r + this.hitR;
  }

  draw() {
    push();
    translate(this.x, this.y);

    // Stem
    stroke(60, 120, 50);
    strokeWeight(6);
    noFill();
    line(0, 0, 0, this.headY);

    // Leaves
    noStroke();
    fill(70, 140, 55);
    ellipse(4, this.headY + 20, 10, 18);
    ellipse(-6, this.headY + 8, 8, 14);

    // Petals (yellow, around center)
    fill(255, 200, 40);
    const petalCount = 12;
    for (let i = 0; i < petalCount; i++) {
      const a = (i / petalCount) * TAU;
      push();
      translate(0, this.headY);
      rotate(a);
      ellipse(14, 0, 12, 8);
      pop();
    }

    // Center disk (brown seeds)
    fill(90, 55, 25);
    noStroke();
    ellipse(0, this.headY, 16, 16);

    // Center highlight
    fill(120, 75, 35);
    ellipse(-3, this.headY - 3, 6, 6);

    pop();
  }
}
