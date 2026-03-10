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
        const mScale = desiredImgH / mountainImg.height;
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
      // Draw ground layer on top of mountains (anchor to bottom of world)
      if (typeof groundImg !== "undefined" && groundImg) {
        const gScale = desiredImgH / groundImg.height;
        const gTileW = groundImg.width * gScale;
        const gTileH = groundImg.height * gScale;
        // Anchor ground so its bottom aligns with the world bottom
        // Move ground slightly lower so it sits a bit below the world baseline
        const groundY = this.h - gTileH + gTileH * 0.33; // 33% downward offset
        // Ground parallax factor: moves almost with the world
        const groundFactor = 0.9;
        for (
          let baseX = -gTileW * 2;
          baseX < this.w + gTileW * 2;
          baseX += gTileW
        ) {
          const worldX = baseX + camX * (1 - groundFactor);
          image(groundImg, worldX, groundY, gTileW, gTileH);
        }
      }
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
