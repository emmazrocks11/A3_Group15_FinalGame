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
    this.energyRegenWalk = 0.08;
    this.energyRegenStill = 0.6;
    this.regenStillMaxVx = 0.12;
    this.energySprintingCost = 0.4;
    this.energyJumpCost = 10;
    this.energyDoubleJumpCost = 30;
    this.isSprinting = false;
    this.starsCollected = 0;
    this.canDoubleJump = false;
    this.ridingPlatform = null;
    this.inRain = false;

    // Low energy: delayed horizontal input (worse when energy is lower)
    this.maxMoveLagFrames = 18;
    this.moveInputBuffer = [];
    this.jumpPressQueue = [];
    this.jumpStutterChanceMax = 0.42;

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
    this.moveInputBuffer = [];
    this.jumpPressQueue = [];

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
    this.moveInputBuffer = [];
    this.jumpPressQueue = [];
  }

  energyLagFrames() {
    return constrain(
      Math.round(
        map(this.energy, 0, this.maxEnergy, this.maxMoveLagFrames, 0),
      ),
      0,
      this.maxMoveLagFrames,
    );
  }

  /** 0 = full energy (no movement penalty), 1 = empty (max lag / jump stutter). */
  movementStrain() {
    if (this.maxEnergy <= 0) return 0;
    return constrain(this.energyLagFrames() / this.maxMoveLagFrames, 0, 1);
  }

  registerJumpPress() {
    this.jumpPressQueue.push(this.energyLagFrames());
  }

  tryJump() {
    const rainFactor = this.inRain ? 0.65 : 1;
    if (this.onGround && this.energy >= 5) {
      this.vy = this.jumpV * rainFactor;
      this.onGround = false;
      this.canDoubleJump = true; // Allow double jump after first jump
      this.energy = max(0, this.energy - this.energyJumpCost);
      this.ridingPlatform = null;
      if (this.jumpSound) {
        this.jumpSound.play();
      }
    } else if (!this.onGround && this.canDoubleJump && this.energy > this.maxEnergy / 2) {
      // Double jump logic: only if in air, has double jump flag, and > 50% energy
      this.vy = this.jumpV * 0.8 * rainFactor;
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

    while (this.jumpPressQueue.length > 0 && this.jumpPressQueue[0] <= 0) {
      this.jumpPressQueue.shift();
      this.tryJump();
    }
    if (this.jumpPressQueue.length > 0) {
      const stutterChance = map(
        this.energy,
        0,
        this.maxEnergy,
        this.jumpStutterChanceMax,
        0,
      );
      if (random(1) >= stutterChance) {
        this.jumpPressQueue[0]--;
      }
      if (this.jumpPressQueue[0] <= 0) {
        this.jumpPressQueue.shift();
        this.tryJump();
      }
    }

    // Horizontal input (raw = keys now; move = delayed by energy-based lag)
    let rawMove = 0;
    if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) rawMove -= 1;
    if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) rawMove += 1;
    if (this.invertTimer > 0) rawMove *= -1;

    this.moveInputBuffer.push(rawMove);
    while (this.moveInputBuffer.length > this.maxMoveLagFrames + 1) {
      this.moveInputBuffer.shift();
    }
    const lagFrames = this.energyLagFrames();
    const idx = this.moveInputBuffer.length - 1 - lagFrames;
    const move = idx >= 0 ? this.moveInputBuffer[idx] : 0;

    // Reset double jump if we land
    if (this.onGround) {
      this.canDoubleJump = false;
    }

    // Sprinting logic (follows intent, not delayed move)
    this.isSprinting =
      keyIsDown(SHIFT) && rawMove !== 0 && this.energy > 0;
    let currentMaxRun = this.maxRun;
    
    if (this.isSprinting) {
      currentMaxRun *= 1.5;
      // COMMENT/UNCOMMENT HERE TO ENABLE/DISABLE SPRINTING ENERGY CONSUMPTION
      // this.energy = max(0, this.energy - this.energySprintingCost);
    }

    const rainFactor = this.inRain ? 0.55 : 1;
    const effectiveAccel = this.accel * (this.isSprinting ? 1.5 : 1.0) * rainFactor;
    const effectiveMaxRun = currentMaxRun * rainFactor;

    // Energy regeneration: fast only when grounded, not sprinting, no input, and nearly stopped
    if (!this.isSprinting && this.onGround) {
      const movingHorizontally = Math.abs(this.vx) > this.regenStillMaxVx;
      if (rawMove === 0 && !movingHorizontally) {
        this.energy = min(this.maxEnergy, this.energy + this.energyRegenStill);
      } else {
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
    const strain = this.movementStrain();
    const lowEnergy = strain > 0.08;
    let ox = 0;
    let oy = 0;
    let squashY = 1;
    if (lowEnergy) {
      const amp = strain * 3.2;
      ox =
        sin(frameCount * 0.38) * amp +
        sin(frameCount * 0.13) * amp * 0.35;
      oy = cos(frameCount * 0.31) * amp * 0.55;
      squashY = 1 - strain * 0.07;
    }

    let cuteX = 0;
    let cuteY = 0;
    let cuteR = 0;
    if (!lowEnergy) {
      const t = frameCount * 0.11;
      cuteX = sin(t * 1.4) * 2.2 + sin(t * 2.35) * 1.1;
      cuteY = sin(t * 1.85 + 1.1) * 1.5;
      cuteR = sin(t * 0.88) * 0.045;
    }

    // If sprite frames exist, use them instead of wobble blob
    if (this.walkFrames && this.walkFrames.length > 0) {
      const img = this.walkFrames[this.animFrame % this.walkFrames.length];
      if (img) {
        push();
        imageMode(CENTER);
        // Draw sprite sized like the blob but slightly taller and ~1cm bigger (≈10px) overall
        const width = this.r * 2 + 15;
        const height = this.r * 2.4 + 15;
        translate(this.x + ox + cuteX, this.y + oy + cuteY);
        rotate(cuteR);
        scale(this.facingDir, 1); // flip horizontally when moving left
        scale(1, squashY);
        if (lowEnergy) {
          tint(
            lerp(255, 252, strain),
            lerp(255, 178, strain),
            lerp(255, 168, strain),
          );
        }
        image(img, 0, 0, width, height);
        noTint();
        pop();
        return;
      }
    }

    // Fallback: original blob shape (draw in local space so squash is centered)
    push();
    translate(this.x + ox + cuteX, this.y + oy + cuteY);
    rotate(cuteR);
    scale(1, squashY);
    const baseCol = color(colHex);
    const tiredCol = color(255, 200, 185);
    fill(lowEnergy ? lerpColor(baseCol, tiredCol, strain) : baseCol);
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
      vertex(cos(a) * rr, sin(a) * rr);
    }
    endShape(CLOSE);
    pop();
  }

  static overlap(a, b) {
    return (
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
    );
  }
}
