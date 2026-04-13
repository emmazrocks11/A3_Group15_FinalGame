/**
 * When grounded on a platform whose grass art is shifted up (`grassyVisualLift`), draw the
 * player this many px lower so feet line up with the art (collision unchanged).
 */
const BLOB_GROUND_DRAW_DROP_PX = 6;
/** Walk-strip index for `11.png` when grounded and not moving (matches `PLAYER_WALK_FRAME_FILES`). */
const IDLE_WALK_FRAME_INDEX = 11;

class BlobPlayer {
  constructor(jumpSound, walkFrames, walkStepL, walkStepR, jumpFrames) {
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
    this.walkStepL = walkStepL;
    this.walkStepR = walkStepR;
    this._walkStepNextLeft = true;
    this._nextWalkStepAllowedMs = 0;
    /** Play grass step every N walk-frame advances (sprite still updates every advance). */
    this._walkSfxStride = walkFrames && walkFrames.length > 8 ? 5 : 2;
    this._walkSfxStrideCounter = 0;
    /** Minimum ms between step plays (avoids rapid L/R machine-gun). */
    this.walkStepMinGapMs = 130;
    this.walkStepVolume = 0.7;

    // Sprite animation
    this.walkFrames = walkFrames || [];
    this.jumpFrames = jumpFrames || [];
    this.animFrame = 0;
    this.animTimer = 0;
    // Frames per walk-cel advance (lower = faster cycle)
    this.animSpeed =
      this.walkFrames.length > 8 ? 2 : this.walkFrames.length > 2 ? 3 : 10;
    this.facingDir = 1; // 1 = right, -1 = left

    this._intentMove = 0;
    this._appliedMove = 0;
    /** Grounded + still: walks one strip index per frame toward `IDLE_WALK_FRAME_INDEX`; null when moving/in air. */
    this._idleSettleIndex = null;
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
    this._idleSettleIndex = null;

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
    this._idleSettleIndex = null;
  }

  energyLagFrames() {
    return constrain(
      Math.round(map(this.energy, 0, this.maxEnergy, this.maxMoveLagFrames, 0)),
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
    } else if (
      !this.onGround &&
      this.canDoubleJump &&
      this.energy > this.maxEnergy / 2
    ) {
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
    this.isSprinting = keyIsDown(SHIFT) && rawMove !== 0 && this.energy > 0;
    let currentMaxRun = this.maxRun;

    if (this.isSprinting) {
      currentMaxRun *= 1.5;
      // COMMENT/UNCOMMENT HERE TO ENABLE/DISABLE SPRINTING ENERGY CONSUMPTION
      // this.energy = max(0, this.energy - this.energySprintingCost);
    }

    const rainFactor = this.inRain ? 0.55 : 1;
    const effectiveAccel =
      this.accel * (this.isSprinting ? 1.5 : 1.0) * rainFactor;
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

    this._intentMove = rawMove;
    this._appliedMove = move;

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

    // Walk animation every animSpeed frames; grass SFX less often + min gap between plays
    const movingOnGround =
      this.onGround &&
      (Math.abs(this.vx) > 0.1 || Math.abs(this._appliedMove) > 0);
    if (movingOnGround) {
      this._idleSettleIndex = null;
      this.animTimer++;
      if (this.animTimer >= this.animSpeed) {
        this.animTimer = 0;
        const n = max(1, this.walkFrames.length);
        this.animFrame = (this.animFrame + 1) % n;
        this._walkSfxStrideCounter++;
        if (
          this._walkSfxStrideCounter >= this._walkSfxStride &&
          millis() >= this._nextWalkStepAllowedMs
        ) {
          this._walkSfxStrideCounter = 0;
          const snd = this._walkStepNextLeft ? this.walkStepL : this.walkStepR;
          if (snd && typeof snd.play === "function") {
            if (typeof snd.stop === "function") snd.stop();
            if (typeof snd.setVolume === "function") {
              snd.setVolume(this.walkStepVolume);
            }
            snd.play();
          }
          this._walkStepNextLeft = !this._walkStepNextLeft;
          this._nextWalkStepAllowedMs = millis() + this.walkStepMinGapMs;
        }
      }
    } else {
      this.animTimer = 0;
      this._walkSfxStrideCounter = 0;
      if (this.walkStepL && this.walkStepL.isPlaying && this.walkStepL.isPlaying()) {
        this.walkStepL.stop();
      }
      if (this.walkStepR && this.walkStepR.isPlaying && this.walkStepR.isPlaying()) {
        this.walkStepR.stop();
      }

      const n = max(1, this.walkFrames.length);
      const stillOnGround =
        this.onGround &&
        Math.abs(this.vx) <= 0.1 &&
        Math.abs(this._appliedMove) <= 0.1;
      if (stillOnGround) {
        if (this._idleSettleIndex === null) {
          this._idleSettleIndex = this.animFrame % n;
        }
        const tgt = constrain(IDLE_WALK_FRAME_INDEX, 0, n - 1);
        if (this._idleSettleIndex < tgt) this._idleSettleIndex++;
        else if (this._idleSettleIndex > tgt) this._idleSettleIndex--;
        this.animFrame = this._idleSettleIndex;
      } else {
        this._idleSettleIndex = null;
        this.animFrame = 0;
      }
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

  /**
   * Cartoon sweat bubbles: under 70% energy normally; in rain, whenever energy is not full.
   * Intensity follows movement strain (boosted in rain when energy is still high).
   */
  drawSweatBubbles(cx, cy, strain) {
    const n = 5;
    const headTop = cy - this.r * 1.15;
    const intensity = constrain(strain, 0.1, 1);
    for (let i = 0; i < n; i++) {
      const seed = i * 401 + floor(cx * 0.07);
      const t = (frameCount + seed) * 0.11;
      const side = (i % 2 === 0 ? -1 : 1) * (8 + i * 2.5);
      const bob = sin(t + i * 0.7) * 1.8;
      const rise = (frameCount * (1.1 + intensity * 0.9) + seed * 6) % 42;
      const x = cx + side + bob * 0.4;
      const y = headTop - rise * 0.85;
      const br = 2.2 + intensity * 1.4 + (i % 2) * 0.6;
      const fade = constrain(255 - rise * 4.5, 90, 255);
      fill(175, 218, 255, fade);
      stroke(90, 165, 235, fade * 0.6);
      strokeWeight(1);
      ellipse(x, y, br * 2, br * 2.15);
      noStroke();
      fill(210, 238, 255, fade * 0.75);
      ellipse(x - br * 0.35, y - br * 0.3, br * 0.45, br * 0.42);
    }
  }

  draw(colHex) {
    const strain = this.movementStrain();
    const energyRatio =
      this.maxEnergy > 0 ? this.energy / this.maxEnergy : 1;
    const sweatInRain =
      this.inRain && this.maxEnergy > 0 && this.energy < this.maxEnergy;
    const sweatOutsideRain = energyRatio < 0.7;
    const sweatActive = sweatInRain || sweatOutsideRain;
    const bubbleStrain =
      sweatInRain && energyRatio >= 0.7 ? max(strain, 0.38) : strain;

    const px = this.x;
    const py = this.y;
    const rp = this.ridingPlatform;
    const groundDrawDrop =
      this.onGround &&
      rp &&
      rp.useGrassyGroundPng &&
      rp.grassyVisualLift > 0;
    const pyDraw = py + (groundDrawDrop ? BLOB_GROUND_DRAW_DROP_PX : 0);

    // If sprite frames exist, use them instead of wobble blob
    if (this.walkFrames && this.walkFrames.length > 0) {
      let img = null;
      const jumpArt =
        !this.onGround &&
        this.jumpFrames &&
        this.jumpFrames.length > 0 &&
        this.jumpFrames.some((j) => j && j.width > 0);
      if (jumpArt) {
        const n = this.jumpFrames.length;
        const up = this.jumpV * 0.88;
        const down = max(12, this.gravity * 42);
        const ji = Math.round(
          constrain(map(this.vy, up, down, 0, n - 1), 0, n - 1),
        );
        img = this.jumpFrames[ji];
      }
      if (!img || !img.width) {
        const n = max(1, this.walkFrames.length);
        const stillOnGround =
          this.onGround &&
          Math.abs(this.vx) <= 0.1 &&
          Math.abs(this._appliedMove) <= 0.1;
        const wi =
          stillOnGround && this._idleSettleIndex !== null
            ? this._idleSettleIndex
            : this.animFrame % n;
        img = this.walkFrames[wi];
      }
      if (img && img.width && img.height > 0) {
        push();
        imageMode(CENTER);
        // Scale from native aspect ratio (no stretch): match ~collision height, width follows art
        const targetH = (this.r * 2 + 15) * 1.67;
        const uniformScale = targetH / img.height;
        const dw = img.width * uniformScale;
        const dh = targetH;
        translate(px, pyDraw);
        scale(this.facingDir, 1);
        image(img, 0, 0, dw, dh);
        pop();
        if (sweatActive) {
          this.drawSweatBubbles(px, pyDraw, bubbleStrain);
        }
        return;
      }
    }

    // Fallback: original blob shape (draw in local space so squash is centered)
    push();
    translate(px, pyDraw);
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
      vertex(cos(a) * rr, sin(a) * rr);
    }
    endShape(CLOSE);
    pop();

    if (sweatActive) {
      this.drawSweatBubbles(px, pyDraw, bubbleStrain);
    }
  }

  static overlap(a, b) {
    return (
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
    );
  }
}
