/** World Y of the water surface (must match `_drawWaterLayer`). */
const WORLD_WATER_TOP_Y = 427;
/**
 * Bottom-ground grassy strip: top of draw may not sit lower than this offset under `WORLD_WATER_TOP_Y`,
 * so stretched art still blankets the shoreline (world Y increases downward).
 */
const GRASSY_GROUND_SHORE_COVER_PX = 92;

/**
 * Fraction of `grassyground.png` height to skip from the top (sky / empty area).
 * Only the lower part of the texture is stretched so the walk line `p.y` sits on grass, not on sky.
 */
const GRASSY_GROUND_SRC_CROP_TOP_FRAC = 0.38;
/** Floor for draw height below `p.h` (px); strip also grows to viewport bottom. */
const GRASSY_GROUND_DEST_EXTRA_BOTTOM = 14;
/** Floor for extra vertical size (px); actual height reaches `cam.y + viewH - drawY`. */
const GRASSY_GROUND_EXTRA_DRAW_HEIGHT = 48;
/**
 * Vertical nudge for the grass strip (world px). Negative = higher on screen (smaller Y);
 * positive = lower.
 */
const GRASSY_GROUND_TOP_OFFSET_Y = -62;
/** Extra nudge upward (world px) after shore clamp. */
const GRASSY_GROUND_EXTRA_UP_PX = 10;

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
    const shorelineY = WORLD_WATER_TOP_Y;
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

    const tAnim = typeof frameCount !== "undefined" ? frameCount * 0.055 : 0;
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
      const cy = waterTop + waterH * 0.45 + sin(tAnim + x * 0.02) * 12;
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

    const camX = typeof cam !== "undefined" && cam ? cam.x : 0;
    const camY = typeof cam !== "undefined" && cam ? cam.y : 0;
    const viewW = typeof width !== "undefined" ? width : 800;
    const viewH = typeof height !== "undefined" ? height : 480;
    for (const p of this.platforms) {
      p.update(camX, camY, viewW, viewH); // moving + disappearing (blink only when on-screen)
      if (p.isDisappearing && !p.isVisible) continue;
      let c = color(p.color || this.theme.platform);
      if (p.isDisappearing) {
        fill(red(c), green(c), blue(c), p.alpha * 255);
      } else {
        fill(c);
      }
      // Single stretched grassy ground art (per-platform option in levels.json)
      if (
        p.useGrassyGroundPng &&
        typeof grassyGroundImg !== "undefined" &&
        grassyGroundImg &&
        grassyGroundImg.width > 0
      ) {
        push();
        imageMode(CORNER);
        if (p.isDisappearing) {
          tint(255, p.alpha * 255);
        } else {
          noTint();
        }
        const isBottomGround = p.y >= 420 && p.h >= 30;
        const visualOffset = isBottomGround ? 0 : 7;
        let drawY = p.y + visualOffset + GRASSY_GROUND_TOP_OFFSET_Y;
        if (isBottomGround) {
          const shoreCoverTopMaxY = WORLD_WATER_TOP_Y - GRASSY_GROUND_SHORE_COVER_PX;
          drawY = min(drawY, shoreCoverTopMaxY);
        }
        drawY -= GRASSY_GROUND_EXTRA_UP_PX + p.grassyVisualLift;
        const screenBottomWorldY = camY + viewH;
        const minGrassDrawH =
          p.h + GRASSY_GROUND_DEST_EXTRA_BOTTOM + GRASSY_GROUND_EXTRA_DRAW_HEIGHT;
        const drawH = max(1, minGrassDrawH, screenBottomWorldY - drawY);
        const g = grassyGroundImg;
        const sy = constrain(g.height * GRASSY_GROUND_SRC_CROP_TOP_FRAC, 0, g.height - 1);
        const sh = g.height - sy;
        image(g, p.x, drawY, p.w, drawH, 0, sy, g.width, sh);
        pop();
      } else if (typeof end1Img !== "undefined" && end1Img) {
        push();
        imageMode(CORNER);
        // Apply disappearing alpha to images
        if (p.isDisappearing) {
          tint(255, p.alpha * 255);
        } else {
          noTint();
        }

        const leftX = p.x;
        const rightX = p.x + p.w;
        const colW = (end1Img.width / end1Img.height) * p.h;
        const overlap = min(colW * 0.18, 10);
        const step = max(0.5, colW - overlap);

        const isBottomGround = p.y >= 420 && p.h >= 30;
        const visualOffset = isBottomGround ? 0 : 7;
        const drawY = p.y + visualOffset;

        const drawTile = (img, drawX, tw = colW) => {
          if (!img) return;
          image(img, drawX, drawY, tw, p.h);
        };

        /** Left slice of sprite so dest width `tw` matches cropped source. */
        const drawTileLeftCrop = (img, drawX, tw) => {
          if (!img || tw <= 0) return;
          const twClamped = min(tw, colW * 1.35);
          const sw = min(img.width, (twClamped / colW) * img.width);
          image(img, drawX, drawY, twClamped, p.h, 0, 0, sw, img.height);
        };

        /** 1px overlap hides hairline gaps between last middle and end2 (float / filtering). */
        const seamPx = 1;

        if (p.w < colW * 2) {
          const half = p.w / 2;
          if (end1Img) image(end1Img, leftX, drawY, half, p.h);
          if (end2Img) image(end2Img, leftX + half, drawY, p.w - half, p.h);
        } else {
          drawTile(end1Img, leftX);

          let m = 0;
          while (leftX + colW + m * step + colW <= rightX - colW + 0.001) {
            m++;
          }
          for (let i = 0; i < m; i++) {
            const img = i % 2 === 0 ? middle1Img : middle2Img;
            drawTile(img, leftX + colW + i * step);
          }

          const afterMiddles =
            m > 0 ? leftX + colW + (m - 1) * step + colW : leftX + colW;
          const gapW = rightX - colW - afterMiddles;
          if (gapW > 0.01) {
            const img = m % 2 === 0 ? middle1Img : middle2Img;
            drawTileLeftCrop(img, afterMiddles, gapW + seamPx);
          }

          if (end2Img) {
            image(end2Img, rightX - colW - seamPx, drawY, colW + seamPx, p.h);
          }
        }

        pop();
      } else {
        rect(p.x, p.y, p.w, p.h); // x,y = top-left [web:234]
      }
    }
    pop();
  }
}
