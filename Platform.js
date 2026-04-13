class Platform {
  constructor(x, y, w, h, color = null, options = {}) {
    this.baseX = x;
    this.baseY = y;
    this.x = x; 
    this.y = y;
    this.w = w; 
    this.h = h;
    this.color = color;
    
    // Movement options
    this.isMoving = options.isMoving || false;
    this.rangeX = options.rangeX || 0;
    this.rangeY = options.rangeY || 0;
    this.speed = options.speed || 0.02;
    this.offset = options.offset || 0;
    this.reverse = options.reverse || false;

    // Disappearing options
    this.isDisappearing = options.isDisappearing || false;
    this.randomBlink = options.randomBlink || false;
    this.minVisibleFrames = options.minVisibleFrames ?? 50;
    this.maxVisibleFrames = options.maxVisibleFrames ?? 160;
    this.minHiddenFrames = options.minHiddenFrames ?? 30;
    this.maxHiddenFrames = options.maxHiddenFrames ?? 140;
    this.visibleDuration = options.visibleDuration || 120; // frames
    this.hiddenDuration = min(
      options.hiddenDuration || 120,
      Platform.maxHiddenPhaseFrames,
    ); // frames
    this.fadeFrames = options.fadeFrames || 20;           // frames for fade in/out
    this.timer = options.timerOffset || 0;
    this.isVisible = true;
    this.alpha = 1;  // 0–1 for fading
    this.phaseEnd = 1;
    /** Blink/cycle runs only after this platform has intersected the camera view once. */
    this.disappearCycleStarted = false;
    /** After first on-screen visible phase completes, `randomBlink` uses JSON min/max timings. */
    this.firstIntroVisiblePhaseDone = false;

    /** When true, WorldLevel draws `grassyGroundImg` stretched to the platform rect instead of tile strips. */
    this.useGrassyGroundPng = options.grassyGround === true;
    /** Extra pixels to draw that art higher on screen (world −Y); collision unchanged. */
    this.grassyVisualLift = Number(options.grassyVisualLift) || 0;

    if (this.isDisappearing && this.randomBlink) {
      // Random phase is chosen the first time the platform enters the viewport (see update()).
      this.phaseEnd = floor(
        random(this.minVisibleFrames, this.maxVisibleFrames + 1),
      );
    }
  }

  /** ~60fps frame cap: hidden stretch never longer than ~5s wall clock. */
  static maxHiddenPhaseFrames = 5 * 60;

  static clampHiddenPhaseLength(frames) {
    return min(max(1, frames), Platform.maxHiddenPhaseFrames);
  }

  /** World-space platform rect overlaps the camera view (world coords). */
  static intersectsViewport(px, py, pw, ph, camX, camY, viewW, viewH) {
    return !(
      px + pw < camX ||
      px > camX + viewW ||
      py + ph < camY ||
      py > camY + viewH
    );
  }

  update(camX = 0, camY = 0, viewW = 800, viewH = 480) {
    this.lastX = this.x;
    this.lastY = this.y;
    
    if (this.isMoving) {
      let t = frameCount * this.speed + this.offset + (this.reverse ? PI : 0);
      this.x = this.baseX + cos(t) * this.rangeX;
      this.y = this.baseY + sin(t) * this.rangeY;
    }

    if (this.isDisappearing) {
      const inView = Platform.intersectsViewport(
        this.x,
        this.y,
        this.w,
        this.h,
        camX,
        camY,
        viewW,
        viewH,
      );
      if (!this.disappearCycleStarted) {
        if (!inView) {
          this.isVisible = true;
          this.alpha = 1;
          // randomBlink picks a fresh phase on first view; fixed cycle keeps timerOffset
          if (this.randomBlink) {
            this.timer = 0;
          }
          return;
        }
        this.disappearCycleStarted = true;
        if (this.randomBlink) {
          if (!this.firstIntroVisiblePhaseDone) {
            this.isVisible = true;
            const hz = 60;
            const introLo = 4 * hz;
            const introHi = 7 * hz;
            this.phaseEnd = floor(random(introLo, introHi + 1));
            this.timer = 0;
          } else {
            this.isVisible = random() < 0.62;
            this.phaseEnd = this.isVisible
              ? floor(random(this.minVisibleFrames, this.maxVisibleFrames + 1))
              : Platform.clampHiddenPhaseLength(
                  floor(
                    random(this.minHiddenFrames, this.maxHiddenFrames + 1),
                  ),
                );
            this.timer = floor(random(0, this.phaseEnd));
          }
        } else {
          this.timer = 0;
        }
      }

      if (this.randomBlink) {
        this.timer++;
        if (this.timer >= this.phaseEnd) {
          if (!this.firstIntroVisiblePhaseDone && this.isVisible) {
            this.firstIntroVisiblePhaseDone = true;
          }
          this.isVisible = !this.isVisible;
          this.timer = 0;
          this.phaseEnd = this.isVisible
            ? floor(random(this.minVisibleFrames, this.maxVisibleFrames + 1))
            : Platform.clampHiddenPhaseLength(
                floor(
                  random(this.minHiddenFrames, this.maxHiddenFrames + 1),
                ),
              );
        }
        const visDur = this.phaseEnd;
        if (!this.isVisible) {
          this.alpha = 0;
        } else {
          const fd = min(this.fadeFrames, max(visDur * 0.5, 1));
          if (this.timer < fd) {
            this.alpha = this.timer / fd;
          } else if (this.timer >= visDur - fd) {
            this.alpha = (visDur - this.timer) / fd;
          } else {
            this.alpha = 1;
          }
        }
      } else {
        this.timer++;
        let cycle = this.visibleDuration + this.hiddenDuration;
        let phase = this.timer % cycle;
        this.isVisible = phase < this.visibleDuration;

        // Fade in at start of visible, fade out at end
        let fd = min(this.fadeFrames, this.visibleDuration / 2);
        if (phase >= this.visibleDuration) {
          this.alpha = 0;
        } else if (phase < fd) {
          this.alpha = phase / fd;
        } else if (phase >= this.visibleDuration - fd) {
          this.alpha = (this.visibleDuration - phase) / fd;
        } else {
          this.alpha = 1;
        }
      }
    }
  }
}
