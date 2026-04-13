class Star {
  /**
   * Same 5-point star as collectibles (gold fill, orange stroke), centered at `cx`,`cy`.
   * @param {number} cx
   * @param {number} cy
   * @param {number} r outer radius
   * @param {number} [angleRad=0] rotation
   */
  static drawShapeAt(cx, cy, r, angleRad = 0) {
    push();
    translate(cx, cy);
    rotate(angleRad);
    fill("gold");
    stroke("orange");
    strokeWeight(max(1, r * 0.14));
    beginShape();
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 === 0 ? r : r / 2;
      // −HALF_PI so one outer tip points straight up (symmetric like a typical ★)
      const a = TWO_PI * (i / 10) - HALF_PI;
      vertex(cos(a) * radius, sin(a) * radius);
    }
    endShape(CLOSE);
    pop();
  }

  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = 15;
    this.collected = false;
    this.angle = 0;
  }

  update(player) {
    this.angle += 0.05;

    if (this.collected) return false;

    // Simple distance-based collision
    let d = dist(player.x, player.y, this.x, this.y);
    if (d < player.r + this.r) {
      this.collected = true;
      player.starsCollected++;
      return true;
    }
    return false;
  }

  draw() {
    if (this.collected) return;
    Star.drawShapeAt(this.x, this.y, this.r, this.angle);
  }
}