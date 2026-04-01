/**
 * Daisy checkpoint: seed on the ground with beam until touched, then grow1 → grow2 → daisy.
 * Optional prerequisite gates bloom/respawn order.
 */
class Checkpoint {
  constructor(x, y, text = "Checkpoint", options = {}) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.messageShown = false;
    this.stemH = 44;
    this.hitR = 30;

    const imgs = options.images || {};
    this.imgSeed = imgs.seed ?? null;
    this.imgGrow1 = imgs.grow1 ?? null;
    this.imgGrow2 = imgs.grow2 ?? null;
    this.imgDaisy = imgs.daisy ?? null;

    this.plantDrawW = 78;
    /** Nudge sprite art downward (screen Y+) from anchor */
    this.plantYOffset = 30;
    /** Collision center follows art (base -42 + plantYOffset) */
    this.headY = -42 + this.plantYOffset;

    /** Must be reached first (its flower bloomed) before this one can bloom or count for respawn */
    this.prerequisite = options.prerequisite ?? null;

    /** Set false only to skip beam/bud (default: all checkpoints use them) */
    this.useBeamAndGrow = options.useBeamAndGrow !== false;

    this.reached = false;
    this.bloomT = 0;
    this.bloomDuration = 52;
    this.sunWorldY = 64;
  }

  prerequisiteMet() {
    return !this.prerequisite || this.prerequisite.reached;
  }

  hasDaisyArt() {
    return (
      this.imgSeed &&
      this.imgGrow1 &&
      this.imgGrow2 &&
      this.imgDaisy &&
      this.imgSeed.width > 0
    );
  }

  update(player) {
    const centerY = this.y + this.headY;
    const touching =
      dist(player.x, player.y, this.x, centerY) < player.r + this.hitR;
    const canProgress = this.prerequisiteMet();

    if (touching && !this.reached && canProgress) {
      this.reached = true;
      this.bloomT = 0;
    }
    if (this.reached && this.bloomT < this.bloomDuration) {
      this.bloomT++;
    }
    return touching && canProgress;
  }

  bloomScale() {
    if (!this.reached) return 0;
    const t = constrain(this.bloomT / this.bloomDuration, 0, 1);
    const eased = 1 - pow(1 - t, 3);
    return lerp(0.18, 1, eased);
  }

  /** Which image to show while blooming (after touch, before fully open). */
  bloomStageImage() {
    const t = constrain(this.bloomT / this.bloomDuration, 0, 1);
    if (t < 1 / 3) return this.imgGrow1;
    if (t < 2 / 3) return this.imgGrow2;
    return this.imgDaisy;
  }

  drawPlantImage(img) {
    if (!img || !img.width) return;
    push();
    imageMode(CENTER);
    const w = this.plantDrawW;
    const h = (img.height / img.width) * w;
    image(img, 0, -h / 2 + this.plantYOffset, w, h);
    pop();
  }

  drawLightBeamAndSun() {
    const budTipY = -14;
    const topY = this.sunWorldY - this.y;
    const pulse = 0.82 + 0.18 * sin(frameCount * 0.055);

    push();
    blendMode(ADD);

    const wBot = 16 * pulse;
    const wTop = 48 * pulse;
    for (let i = 0; i < 4; i++) {
      const layer = i / 3;
      const a = (22 - i * 5) * pulse;
      fill(255, 248, 210, a);
      noStroke();
      quad(
        -wBot * (1 - layer * 0.15),
        budTipY,
        wBot * (1 - layer * 0.15),
        budTipY,
        wTop * (1 - layer * 0.12),
        topY,
        -wTop * (1 - layer * 0.12),
        topY,
      );
    }

    translate(0, topY);
    for (let i = 0; i < 5; i++) {
      const r = 28 + i * 14;
      fill(255, 235, 160, 14 - i * 2);
      noStroke();
      ellipse(0, 0, r, r * 0.92);
    }
    fill(255, 252, 220, 200 * pulse);
    ellipse(0, 0, 22, 20);

    blendMode(BLEND);
    pop();
  }

  drawGroundAura() {
    const pulse = 0.88 + 0.12 * sin(frameCount * 0.07 + this.x * 0.01);
    push();
    blendMode(ADD);
    for (let i = 0; i < 6; i++) {
      const r = 20 + i * 12;
      fill(255, 230, 140, (10 - i) * pulse);
      noStroke();
      ellipse(0, -4, r, r * 0.55);
    }
    blendMode(BLEND);
    pop();
  }

  drawBud() {
    stroke(55, 110, 45);
    strokeWeight(4);
    noFill();
    line(0, 0, 0, -12);

    noStroke();
    fill(65, 130, 52);
    ellipse(5, -4, 8, 14);
    ellipse(-4, -6, 7, 11);

    fill(255, 220, 80, 230);
    ellipse(0, -14, 10, 11);
    fill(255, 245, 180, 180);
    ellipse(-2, -16, 4, 4);
  }

  drawMatureFlower() {
    stroke(60, 120, 50);
    strokeWeight(6);
    noFill();
    line(0, 0, 0, this.headY);

    noStroke();
    fill(70, 140, 55);
    ellipse(4, this.headY + 20, 10, 18);
    ellipse(-6, this.headY + 8, 8, 14);

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

    fill(90, 55, 25);
    noStroke();
    ellipse(0, this.headY, 16, 16);

    fill(120, 75, 35);
    ellipse(-3, this.headY - 3, 6, 6);
  }

  draw() {
    push();
    translate(this.x, this.y);

    if (!this.useBeamAndGrow) {
      if (this.hasDaisyArt() && this.imgDaisy) {
        this.drawPlantImage(this.imgDaisy);
      } else {
        this.drawMatureFlower();
      }
      pop();
      return;
    }

    if (!this.reached) {
      this.drawLightBeamAndSun();
      this.drawGroundAura();
      if (this.hasDaisyArt() && this.imgSeed) {
        this.drawPlantImage(this.imgSeed);
      } else {
        this.drawBud();
      }
      pop();
      return;
    }

    const s = this.bloomScale();
    scale(s);
    if (this.hasDaisyArt()) {
      const img = this.bloomStageImage();
      if (img) this.drawPlantImage(img);
      else this.drawMatureFlower();
    } else {
      this.drawMatureFlower();
    }
    pop();
  }
}
