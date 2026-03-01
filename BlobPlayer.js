class BlobPlayer {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.r = 26;
    this.vx = 0;
    this.vy = 0;

    this.accel = 0.55;
    this.maxRun = 4.0;

    this.gravity = 0.65;
    this.jumpV = -11.0;

    this.frictionAir = 0.995;
    this.frictionGround = 0.88;

    this.onGround = false;

    // wobble visuals
    this.t = 0;
    this.tSpeed = 0.01;
    this.wobble = 7;
    this.points = 48;
    this.wobbleFreq = 0.9;

    // Energy system
    this.energy = 200;
    this.maxEnergy = 200;
    this.energyRegenWalk = 0.2;
    this.energyRegenStill = 0.6;
    this.energySprintingCost = 0.4;
    this.energyJumpCost = 10;
    this.isSprinting = false;
    this.starsCollected = 0;
  }

  spawnFromLevel(level) {
    this.x = level.start.x;
    this.y = level.start.y;
    this.r = level.start.r;

    this.vx = 0;
    this.vy = 0;
    this.onGround = false;

    this.gravity = level.gravity;
    this.jumpV = level.jumpV;
    this.energy = this.maxEnergy;
  }

  tryJump() {
    if (this.onGround && this.energy >= 5) {
      // Scale jump power based on energy (at 0 energy, jump is 50% power)
      const energyFactor = map(this.energy, 0, this.maxEnergy, 0.5, 1.0);
      this.vy = this.jumpV * energyFactor;
      this.onGround = false;
      this.energy = max(0, this.energy - this.energyJumpCost);
    }
  }

  update(level) {
    // input
    let move = 0;
    if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) move -= 1;
    if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) move += 1;

    // Sprinting logic
    this.isSprinting = keyIsDown(SHIFT) && move !== 0 && this.energy > 0;
    let currentMaxRun = this.maxRun;
    
    if (this.isSprinting) {
      currentMaxRun *= 1.5;
      this.energy = max(0, this.energy - this.energySprintingCost);
    }

    // Scale speed based on energy (at 0 energy, speed is 60% of normal)
    const energySpeedFactor = map(this.energy, 0, this.maxEnergy, 0.6, 1.0);
    const effectiveAccel = this.accel * (this.isSprinting ? 1.5 : 1.0) * energySpeedFactor;
    const effectiveMaxRun = currentMaxRun * energySpeedFactor;

    // Energy regeneration
    if (!this.isSprinting) {
      if (move === 0 && this.onGround) {
        this.energy = min(this.maxEnergy, this.energy + this.energyRegenStill);
      } else if (this.onGround) {
        this.energy = min(this.maxEnergy, this.energy + this.energyRegenWalk);
      }
    }

    this.vx += effectiveAccel * move;
    this.vx *= this.onGround ? this.frictionGround : this.frictionAir;
    this.vx = constrain(this.vx, -effectiveMaxRun, effectiveMaxRun);

    this.vy += this.gravity;

    // collider box
    let box = {
      x: this.x - this.r,
      y: this.y - this.r,
      w: this.r * 2,
      h: this.r * 2,
    };

    // move X
    box.x += this.vx;
    for (const s of level.platforms) {
      if (BlobPlayer.overlap(box, s)) {
        if (this.vx > 0) box.x = s.x - box.w;
        else if (this.vx < 0) box.x = s.x + s.w;
        this.vx = 0;
      }
    }

    // move Y
    box.y += this.vy;
    this.onGround = false;
    for (const s of level.platforms) {
      if (BlobPlayer.overlap(box, s)) {
        if (this.vy > 0) {
          box.y = s.y - box.h;
          this.vy = 0;
          this.onGround = true;
        } else if (this.vy < 0) {
          box.y = s.y + s.h;
          this.vy = 0;
        }
      }
    }

    // write back
    this.x = box.x + box.w / 2;
    this.y = box.y + box.h / 2;

    // keep inside world horizontally, allow falling below world
    this.x = constrain(this.x, this.r, level.w - this.r);

    this.t += this.tSpeed;
  }

  draw(colHex) {
    fill(color(colHex));
    noStroke();
    beginShape();
    for (let i = 0; i < this.points; i++) {
      const a = (i / this.points) * TAU;
      const n = noise(
        cos(a) * this.wobbleFreq + 100,
        sin(a) * this.wobbleFreq + 100,
        this.t,
      );
      const rr = this.r + map(n, 0, 1, -this.wobble, this.wobble);
      vertex(this.x + cos(a) * rr, this.y + sin(a) * rr);
    }
    endShape(CLOSE);
  }

  static overlap(a, b) {
    return (
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
    );
  }
}
