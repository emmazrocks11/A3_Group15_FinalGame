class WorldLevel {
  constructor(levelJson) {
    this.name = levelJson.name ?? "Level";

    this.theme = Object.assign(
      { bg: "#C1E1ED", platform: "#C8C8C8", blob: "#1478FF" },
      levelJson.theme ?? {},
    );

    // Physics knobs
    this.gravity = levelJson.gravity ?? 0.65;
    this.jumpV = levelJson.jumpV ?? -11.0;

    // Camera knob (data-driven view state)
    this.camLerp = levelJson.camera?.lerp ?? 0.12;

    // World size + death line
    this.w = levelJson.world?.w ?? 2400;
    this.h = levelJson.world?.h ?? 360;
    this.deathY = levelJson.world?.deathY ?? this.h + 200;

    // Start
    this.start = Object.assign({ x: 80, y: 220, r: 26 }, levelJson.start ?? {});

    // Platforms
    this.platforms = (levelJson.platforms ?? []).map(
      (p) => new Platform(p.x, p.y, p.w, p.h, p.color, p.options),
    );
  }

  /**
   * Procedural water strip (replaces grass ground.png): gradient + moving ripples.
   * Matches prior ground layer height, Y anchor, and parallax (0.9).
   */
  _drawWaterLayer(desiredImgH, camX) {
    const shorelineY = 424;
    const canvasBottom = typeof height !== "undefined" ? height : this.h + 120;
    const waterTop = shorelineY;
    const waterH = max(1, canvasBottom - waterTop);
    const groundFactor = 0.9;
    const px = camX * (1 - groundFactor);
    const margin = max(220, desiredImgH * 0.8);
    const wx0 = -margin + px;
    const ww = this.w + margin * 2;

    push();
    noStroke();
    rectMode(CORNER);
    const steps = 26;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const y0 = waterTop + (waterH * i) / steps;
      const y1 = waterTop + (waterH * (i + 1)) / steps;
      const c = lerpColor(
        color(175, 228, 245),
        color(22, 92, 148),
        pow(t, 0.82),
      );
      fill(c);
      rect(wx0, y0, ww, y1 - y0 + 1);
    }

    const tAnim =
      typeof frameCount !== "undefined" ? frameCount * 0.055 : 0;
    for (let k = 0; k < 3; k++) {
      const phase = k * 1.7;
      stroke(230, 248, 255, 95 - k * 22);
      strokeWeight(2.2 - k * 0.4);
      noFill();
      beginShape();
      for (let x = wx0; x <= wx0 + ww; x += 10) {
        const y =
          waterTop +
          waterH * (0.06 + k * 0.035) +
          sin(x * 0.018 + tAnim + phase + px * 0.006) * (4 + k);
        vertex(x, y);
      }
      endShape();
    }

    // Soft caustic-ish highlights (subtle)
    noStroke();
    for (let x = wx0; x < wx0 + ww; x += 140) {
      const cx = x + sin(tAnim * 0.8 + x * 0.01) * 30;
      const cy =
        waterTop +
        waterH * 0.45 +
        sin(tAnim + x * 0.02) * 12;
      fill(255, 255, 255, 18);
      ellipse(cx, cy, 90 + sin(x) * 20, 24);
    }
    pop();
  }

  drawWorld() {
    // If a sky image is available, tile it horizontally across the world width.
    // Drawing happens inside the camera transform (world coordinates).
    if (typeof skyImg !== "undefined" && skyImg) {
      // Make the sky a little taller while preserving aspect ratio
      const baseImgH = this.h || height;
      const desiredImgH = baseImgH * 1.15; // increase height by 15%
      const scale = desiredImgH / skyImg.height; // uniform scale
      const tileW = skyImg.width * scale;
      const tileH = skyImg.height * scale;
      // Slight downward offset so sky sits lower on the canvas
      const skyYOffset = tileH * 0.06; // 6% downward
      // Parallax: make sky move slower than world to mimic depth
      const parallaxFactor = 0.35; // 0 = static, 1 = same speed as world
      const camX = typeof cam !== "undefined" ? cam.x : 0;
      // Draw extra tiles to ensure coverage when offset
      for (let baseX = -tileW * 2; baseX < this.w + tileW * 2; baseX += tileW) {
        const worldX = baseX + camX * (1 - parallaxFactor);
        image(skyImg, worldX, skyYOffset, tileW, tileH);
      }
      // Draw mountain layer on top of the sky (same uniform scale)
      if (typeof mountainImg !== "undefined" && mountainImg) {
        const mountainDrawScale = 0.55;
        const mScale = (desiredImgH / mountainImg.height) * mountainDrawScale;

        const mTileW = mountainImg.width * mScale;
        const mTileH = mountainImg.height * mScale;
        // Shift mountains lower: align their base near the bottom of the sky
        const mountainY = tileH - mTileH + tileH * 0.2; // 20% downward offset (moved lower)
        // Mountain parallax factor: between sky and ground
        const mountainFactor = 0.65; // > sky(0.35) and < ground(0.9)
        for (
          let baseX = -mTileW * 2;
          baseX < this.w + mTileW * 2;
          baseX += mTileW
        ) {
          const worldX = baseX + camX * (1 - mountainFactor);
          image(mountainImg, worldX, mountainY, mTileW, mTileH);
        }
      }
      // Water layer in front of mountains (same footprint / parallax as old grass tile)
      this._drawWaterLayer(desiredImgH, camX);
    } else {
      background(this.theme.bg);
    }

    push();
    rectMode(CORNER); // critical: undo any global rectMode(CENTER) [web:230]
    noStroke();

    for (const p of this.platforms) {
      p.update(); // Update moving/disappearing platforms
      if (p.isDisappearing && !p.isVisible) continue;
      let c = color(p.color || this.theme.platform);
      if (p.isDisappearing) {
        fill(red(c), green(c), blue(c), p.alpha * 255);
      } else {
        fill(c);
      }
      rect(p.x, p.y, p.w, p.h); // x,y = top-left [web:234]
    }
    pop();
  }
}
