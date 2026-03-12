class BlobPlayer {
  constructor(jumpSound, walkFrames) {
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
    this.baseMaxEnergy = 200;
    this.maxEnergy = this.baseMaxEnergy;
    this.energy = this.maxEnergy;
    this.energyRegenWalk = 0.2;
    this.energyRegenStill = 0.6;
    this.energySprintingCost = 0.4;
    this.energyJumpCost = 10;
    this.energyDoubleJumpCost = 30;
    this.isSprinting = false;
    this.starsCollected = 0;
    this.canDoubleJump = false;
    this.ridingPlatform = null;
    this.inRain = false;

    // Status effects
    this.invertTimer = 0; // frames remaining for inverted left/right
    this.jumpSound = jumpSound;

    // Sprite animation
    this.walkFrames = walkFrames || [];
    this.animFrame = 0;
    this.animTimer = 0;
    this.animSpeed = 10; // frames per sprite frame
    this.facingDir = 1; // 1 = right, -1 = left
  }

  spawnFromLevel(level) {
    this.x = level.start.x;
    this.y = level.start.y;
    this.r = level.start.r;

    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.canDoubleJump = false;
    this.ridingPlatform = null;

    this.gravity = level.gravity;
    this.jumpV = level.jumpV;
    this.maxEnergy = this.baseMaxEnergy;
    this.applyStarEnergyBonus(this.starsCollected || 0);
    this.energy = this.maxEnergy;
  }

  spawnAt(x, y) {
    this.x = x;
    this.y = y;

    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.canDoubleJump = false;
    this.ridingPlatform = null;
  }

  tryJump() {
    const rainFactor = this.inRain ? 0.65 : 1;
    if (this.onGround && this.energy >= 5) {
      // Scale jump power based on energy (at 0 energy, jump is 50% power)
      const energyFactor = map(this.energy, 0, this.maxEnergy, 0.5, 1.0) * rainFactor;
      this.vy = this.jumpV * energyFactor;
      this.onGround = false;
      this.canDoubleJump = true; // Allow double jump after first jump
      this.energy = max(0, this.energy - this.energyJumpCost);
      this.ridingPlatform = null;
      if (this.jumpSound) {
        this.jumpSound.play();
      }
    } else if (!this.onGround && this.canDoubleJump && this.energy > this.maxEnergy / 2) {
      // Double jump logic: only if in air, has double jump flag, and > 50% energy
      const energyFactor = map(this.energy, 0, this.maxEnergy, 0.5, 1.0) * 0.8 * rainFactor;
      this.vy = this.jumpV * energyFactor;
      this.canDoubleJump = false; // consume the double jump
      this.energy = max(0, this.energy - this.energyDoubleJumpCost);
      this.ridingPlatform = null;
      if (this.jumpSound) {
        this.jumpSound.play();
      }
    }
  }

  update(level) {
    if (this.invertTimer > 0) this.invertTimer--;

    // input
    let move = 0;
    if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) move -= 1;
    if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) move += 1;
    if (this.invertTimer > 0) move *= -1;

    // Reset double jump if we land
    if (this.onGround) {
      this.canDoubleJump = false;
    }

    // Sprinting logic
    this.isSprinting = keyIsDown(SHIFT) && move !== 0 && this.energy > 0;
    let currentMaxRun = this.maxRun;
    
    if (this.isSprinting) {
      currentMaxRun *= 1.5;
      // COMMENT/UNCOMMENT HERE TO ENABLE/DISABLE SPRINTING ENERGY CONSUMPTION
      // this.energy = max(0, this.energy - this.energySprintingCost);
    }

    // Scale speed based on energy (at 0 energy, speed is 60% of normal)
    const rainFactor = this.inRain ? 0.55 : 1;
    const energySpeedFactor = map(this.energy, 0, this.maxEnergy, 0.6, 1.0);
    const effectiveAccel = this.accel * (this.isSprinting ? 1.5 : 1.0) * energySpeedFactor * rainFactor;
    const effectiveMaxRun = currentMaxRun * energySpeedFactor * rainFactor;

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

    // move X (ignore moving platforms for side collisions to avoid jitter/glitch)
    box.x += this.vx;
    for (const s of level.platforms) {
      if (s.isMoving) continue;
      if (BlobPlayer.overlap(box, s)) {
        if (this.vx > 0) box.x = s.x - box.w;
        else if (this.vx < 0) box.x = s.x + s.w;
        this.vx = 0;
      }
    }

    box.y += this.vy;
    this.onGround = false;
    this.ridingPlatform = null; // Reset riding platform before check
    for (const s of level.platforms) {
      if (BlobPlayer.overlap(box, s)) {
        if (this.vy > 0) {
          box.y = s.y - box.h;
          this.vy = 0;
          this.onGround = true;
          this.ridingPlatform = s; // Set the platform we are standing on
        } else if (this.vy < 0) {
          box.y = s.y + s.h;
          this.vy = 0;
        }
      }
    }

    // write back
    this.x = box.x + box.w / 2;
    this.y = box.y + box.h / 2;

    // Carry the player along with moving platforms only when firmly grounded
    if (this.onGround && this.ridingPlatform && this.ridingPlatform.isMoving) {
      if (this.ridingPlatform.lastX !== undefined) {
        this.x += this.ridingPlatform.x - this.ridingPlatform.lastX;
        this.y += this.ridingPlatform.y - this.ridingPlatform.lastY;
      }
    }

    // keep inside world horizontally, allow falling below world
    this.x = constrain(this.x, this.r, level.w - this.r);

    this.t += this.tSpeed;

    // Simple walk animation timer (only when moving on ground)
    const movingOnGround = this.onGround && Math.abs(this.vx) > 0.1;
    if (movingOnGround) {
      this.animTimer++;
      if (this.animTimer >= this.animSpeed) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % this.walkFrames.length;
      }
    } else {
      // Reset to first frame when idle / in air so it looks clean
      this.animTimer = 0;
      this.animFrame = 0;
    }

    // Update facing direction based on horizontal velocity
    if (Math.abs(this.vx) > 0.1) {
      this.facingDir = this.vx < 0 ? -1 : 1;
    }
  }

  applyStarEnergyBonus(count) {
    const bonusPerStar = 15;
    this.maxEnergy = this.baseMaxEnergy + count * bonusPerStar;
  }

  draw(colHex) {
    // If sprite frames exist, use them instead of wobble blob
    if (this.walkFrames && this.walkFrames.length > 0) {
      const img = this.walkFrames[this.animFrame % this.walkFrames.length];
      if (img) {
        push();
        imageMode(CENTER);
        // Draw sprite sized like the blob but slightly taller and ~5px bigger overall
        const width = this.r * 2 + 5;
        const height = this.r * 2.4 + 5;
        translate(this.x, this.y);
        scale(this.facingDir, 1); // flip horizontally when moving left
        image(img, 0, 0, width, height);
        pop();
        return;
      }
    }

    // Fallback: original blob shape
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
