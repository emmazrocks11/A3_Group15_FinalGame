/*
Week 5 — Example 5: Side-Scroller Platformer with JSON Levels + Modular Camera

Course: GBDA302 | Instructors: Dr. Karen Cochrane & David Han
Date: Feb. 12, 2026

Move: WASD/Arrows | Jump: Space

Learning goals:
- Build a side-scrolling platformer using modular game systems
- Load complete level definitions from external JSON (LevelLoader + levels.json)
- Separate responsibilities across classes (Player, Platform, Camera, World)
- Implement gravity, jumping, and collision with platforms
- Use a dedicated Camera2D class for smooth horizontal tracking
- Support multiple levels and easy tuning through data files
- Explore scalable project architecture for larger games
*/

const VIEW_W = 800;
const VIEW_H = 480;

let allLevelsData;
let levelIndex = 0;

let level;
let player;
let cam;
let skyImg;
let mountainImg;
let groundImg;
let jumpSound;
let walk1Img;
let walk2Img;
let seedImg;
let grow1Img;
let grow2Img;
let daisyImg;
let splashScreenImg;
let daisyNameImg;
let startScreenBuddyImg;
let collectiblesData;
let stars = [];
let totalStarsCollected = 0;
let gameStarted = false;
/** @type {"main"|"instructions"|"about"} */
let menuScreen = "main";
let energyBoostTimer = 0;
let checkpoint = null;
let checkpoint2 = null;
let startCheckpoint = null;
let respawnPoint = null;
let checkpointMessage = null;
let checkpointMessageTimer = 0;
let rainZone = null;
let lightningZone = null;
let checkpointTpTargets = [];
let checkpointsDrawOrder = [];
let checkpointsUpdateOrder = [];

function preload() {
  allLevelsData = loadJSON("levels.json"); // levels.json beside index.html [web:122]
  collectiblesData = loadJSON("collectibles.json");
  // Load the tiled sky background (file lives in `assets/images/sky.png`)
  skyImg = loadImage("assets/images/sky.png");
  // Load mountain layer to draw on top of the sky
  mountainImg = loadImage("assets/images/mountain.png");
  // Load ground layer to draw in front of mountains
  groundImg = loadImage("assets/images/ground.png");
  // Load jump sound effect
  jumpSound = loadSound("assets/sounds/jumpsound.mp3");
  // Load blob walk animation frames
  walk1Img = loadImage("assets/images/walk1.png");
  walk2Img = loadImage("assets/images/walk2.png");
  seedImg = loadImage("assets/images/seed.png");
  grow1Img = loadImage("assets/images/grow1.png");
  grow2Img = loadImage("assets/images/grow2.png");
  daisyImg = loadImage("assets/images/daisy.png");
  splashScreenImg = loadImage("assets/images/splashscreen.png");
  daisyNameImg = loadImage("assets/images/daisyname.png");
  startScreenBuddyImg = loadImage("assets/images/startscreenbuddy.png");
}

function setup() {
  createCanvas(VIEW_W, VIEW_H);
  textFont("Inter");
  textSize(14);

  cam = new Camera2D(width, height);
  loadLevel(levelIndex);
}

function loadLevel(i) {
  level = LevelLoader.fromLevelsJson(allLevelsData, i);

  player = new BlobPlayer(jumpSound, [walk1Img, walk2Img]);
  player.spawnFromLevel(level);

  const dropHeight = 220;
  const groundY = 424 - player.r;
  player.spawnAt(level.start.x, groundY - dropHeight);

  // Initialize stars from JSON (full reset on level load)
  totalStarsCollected = 0;
  stars = [];
  if (collectiblesData && collectiblesData.stars) {
    for (let s of collectiblesData.stars) {
      stars.push(new Star(s.x, s.y));
    }
  }

  const daisyImages = {
    seed: seedImg,
    grow1: grow1Img,
    grow2: grow2Img,
    daisy: daisyImg,
  };

  // Checkpoint.js: seed + beam until touched, then grow1 → grow2 → daisy.
  if (collectiblesData && collectiblesData.startCheckpoint) {
    const s = collectiblesData.startCheckpoint;
    startCheckpoint = new Checkpoint(s.x, s.y, s.text || null, {
      images: daisyImages,
    });
  } else {
    startCheckpoint = null;
  }

  if (collectiblesData && collectiblesData.checkpoint) {
    const c = collectiblesData.checkpoint;
    checkpoint = new Checkpoint(c.x, c.y, c.text || "Checkpoint", {
      prerequisite: startCheckpoint,
      images: daisyImages,
    });
  } else {
    checkpoint = null;
  }

  if (collectiblesData && collectiblesData.checkpoint2) {
    const c2 = collectiblesData.checkpoint2;
    checkpoint2 = new Checkpoint(c2.x, c2.y, c2.text || "Checkpoint", {
      prerequisite: checkpoint,
      images: daisyImages,
    });
  } else {
    checkpoint2 = null;
  }

  checkpointsDrawOrder = [];
  if (startCheckpoint) checkpointsDrawOrder.push(startCheckpoint);
  if (checkpoint) checkpointsDrawOrder.push(checkpoint);
  if (checkpoint2) checkpointsDrawOrder.push(checkpoint2);

  checkpointsUpdateOrder = [];
  if (checkpoint) checkpointsUpdateOrder.push(checkpoint);
  if (checkpoint2) checkpointsUpdateOrder.push(checkpoint2);
  if (startCheckpoint) checkpointsUpdateOrder.push(startCheckpoint);

  respawnPoint = null;
  checkpointMessage = null;
  checkpointMessageTimer = 0;

  if (collectiblesData && collectiblesData.rainZone) {
    rainZone = collectiblesData.rainZone;
  } else {
    rainZone = null;
  }

  if (collectiblesData && collectiblesData.lightningZone) {
    lightningZone = collectiblesData.lightningZone;
  } else {
    lightningZone = null;
  }

  checkpointTpTargets = [];
  const sunflowerTpOrder = [
    startCheckpoint,
    checkpoint,
    checkpoint2,
  ];
  for (const cp of sunflowerTpOrder) {
    if (!cp) continue;
    checkpointTpTargets.push({
      label: cp.text || "Checkpoint",
      x: cp.x + 2,
      y: cp.y - 26,
    });
  }
  // TP to end of map (platform at x 13000–13800) — before Lightning so End stays on-screen
  if (level && level.w) {
    checkpointTpTargets.push({
      label: "End",
      x: 13780,
      y: 398,
    });
  }
  if (lightningZone) {
    checkpointTpTargets.push({
      label: "Lightning",
      x: (lightningZone.startX + lightningZone.endX) / 2,
      y: 200,
    });
  }

  cam.x = player.x - width / 2;
  cam.y = 0;
  cam.clampToWorld(level.w, level.h);
}

function respawnPlayer() {
  player = new BlobPlayer(jumpSound, [walk1Img, walk2Img]);
  if (respawnPoint) {
    const dropHeight = 220;
    player.spawnAt(respawnPoint.x, respawnPoint.y - dropHeight);
    player.starsCollected = totalStarsCollected;
    player.applyStarEnergyBonus(totalStarsCollected);
    player.energy = player.maxEnergy;
  } else {
    player.spawnFromLevel(level);
    player.starsCollected = totalStarsCollected;
    player.applyStarEnergyBonus(totalStarsCollected);
    player.energy = player.maxEnergy;
  }

  cam.x = player.x - width / 2;
  cam.y = 0;
  cam.clampToWorld(level.w, level.h);
}

function draw() {
  background(200, 220, 255);

  if (!gameStarted) {
    drawStartScreen();
    return;
  }

  // --- game state ---
  if (rainZone) {
    player.inRain = player.x >= rainZone.startX && player.x <= rainZone.endX;
  } else {
    player.inRain = false;
  }

  player.update(level);

  // Lightning strikes every 4 seconds. If hit, invert controls temporarily.
  if (lightningZone && checkLightningHit(lightningZone, player)) {
    player.invertTimer = 180; // ~3 seconds
  }

  for (let s of stars) {
    if (s.update(player)) {
      totalStarsCollected++;
      player.applyStarEnergyBonus(player.starsCollected);
      player.energy = player.maxEnergy;
      energyBoostTimer = 60;
    }
  }

  for (const cp of checkpointsUpdateOrder) {
    if (!cp.update(player)) continue;
    respawnPoint = { x: cp.x + 2, y: cp.y - player.r };
    if (
      cp !== startCheckpoint &&
      cp.text &&
      !cp.messageShown
    ) {
      cp.messageShown = true;
      checkpointMessage = cp.text;
      checkpointMessageTimer = 0;
    }
  }

  // Fall death → respawn (preserve stars)
  if (player.y - player.r > level.deathY) {
    respawnPlayer();
    return;
  }

  // --- view state (data-driven smoothing) ---
  cam.followSideScrollerX(player.x, level.camLerp);
  cam.y = 0;
  cam.clampToWorld(level.w, level.h);

  // --- draw ---
  cam.begin();
  level.drawWorld();
  if (rainZone) drawRainZone(rainZone);
  if (lightningZone) drawLightningZone(lightningZone);
  for (const cp of checkpointsDrawOrder) {
    cp.draw();
  }
  drawEndHouse(13770); // small house centered at end
  for (let s of stars) {
    s.draw();
  }
  player.draw(level.theme.blob);
  cam.end();

  // HUD - Level Name
  fill(40, 40, 50);
  textFont("Poppins");
  textStyle(BOLD);
  textSize(20);
  textAlign(LEFT, TOP);
  noStroke();

  // Energy Bar HUD
  const barW = 220;
  const barH = 20;
  const barX = 16;
  const barY = 50;

  const boostActive = energyBoostTimer > 0;
  if (boostActive) {
    energyBoostTimer--;
  }

  // Background with border
  fill(240, 240, 245);
  stroke(180, 180, 190);
  strokeWeight(2);
  rect(barX, barY, barW, barH, 8);

  // Foreground (Energy)
  const energyW = map(player.energy, 0, player.maxEnergy, 0, barW - 4);
  let energyCol = lerpColor(
    color(255, 80, 80),
    color(100, 200, 255),
    player.energy / player.maxEnergy,
  );
  if (boostActive) {
    energyCol = color(90, 220, 140);
  }
  fill(energyCol);
  noStroke();
  rect(barX + 2, barY + 2, energyW, barH - 4, 6);

  // Label: Lightning Bolt Icon (Bigger and overlapping the bar)
  push();
  translate(barX + barW - 15, barY + barH / 2); // Positioned to the right of the bar

  // Shadow
  fill(0, 0, 0, 80); // Translucent black shadow
  noStroke();
  push();
  translate(2, 2); // Slightly offset to the bottom-right
  beginShape();
  vertex(2, -15);
  vertex(-10, 2);
  vertex(-2, 2);
  vertex(-10, 15);
  vertex(8, -2);
  vertex(0, -2);
  vertex(8, -15);
  endShape(CLOSE);
  pop();

  // Main Bolt
  fill(255, 230, 0); // Bright lightning yellow
  noStroke();
  beginShape();
  vertex(2, -15);
  vertex(-10, 2);
  vertex(-2, 2);
  vertex(-10, 15);
  vertex(8, -2);
  vertex(0, -2);
  vertex(8, -15);
  endShape(CLOSE);
  pop();

  if (boostActive) {
    // Bold, larger arrow to the right of the bar
    textFont("Poppins");
    textStyle(BOLD);
    textSize(20);
    fill(90, 220, 140);
    const arrowX = barX + barW + 12;
    const arrowY = barY + barH / 2 - 10;
    text("↑", arrowX, arrowY);
  }

  // Stars Counter HUD (Aligned with Energy Bar)
  textFont("Poppins");
  textStyle(BOLD);
  textSize(28);
  textAlign(RIGHT, CENTER); // Center vertically with the bar
  fill(255, 215, 0);
  noStroke();

  const starY = barY + barH / 2; // Same vertical center as the energy bar
  text("⭐", width - 45, starY);

  fill(40, 40, 50);
  text(player.starsCollected, width - 18, starY + 2); // Slight offset for visual alignment with text baseline

  // Debug: teleport to checkpoint buttons (testing only)
  const tpBtnY = height - 44;
  const tpBtnH = 32;
  const tpBtnPad = 8;
  let tpBtnX = 16;
  textFont("Inter");
  textStyle(NORMAL);
  textSize(11);
  fill(80, 80, 90);
  textAlign(LEFT, TOP);
  text("TP:", 16, tpBtnY - 14);
  for (let i = 0; i < checkpointTpTargets.length; i++) {
    const t = checkpointTpTargets[i];
    const btnW = textWidth(t.label) + 20;
    const hover =
      mouseX >= tpBtnX &&
      mouseX <= tpBtnX + btnW &&
      mouseY >= tpBtnY &&
      mouseY <= tpBtnY + tpBtnH;
    if (hover) {
      fill(100, 140, 200);
    } else {
      fill(70, 90, 130);
    }
    stroke(50, 70, 100);
    strokeWeight(1);
    rect(tpBtnX, tpBtnY, btnW, tpBtnH, 6);
    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    text(t.label, tpBtnX + btnW / 2, tpBtnY + tpBtnH / 2);
    textAlign(LEFT, TOP);
    tpBtnX += btnW + tpBtnPad;
  }

  // Checkpoint message (fade in, hold, fade out)
  if (checkpointMessage) {
    checkpointMessageTimer++;
    const fadeInFrames = 45;
    const holdFrames = 120;
    const fadeOutFrames = 45;
    let alpha = 0;
    if (checkpointMessageTimer < fadeInFrames) {
      alpha = (checkpointMessageTimer / fadeInFrames) * 255;
    } else if (checkpointMessageTimer < fadeInFrames + holdFrames) {
      alpha = 255;
    } else if (
      checkpointMessageTimer <
      fadeInFrames + holdFrames + fadeOutFrames
    ) {
      const t =
        (checkpointMessageTimer - fadeInFrames - holdFrames) / fadeOutFrames;
      alpha = 255 * (1 - t);
    } else {
      checkpointMessage = null;
    }
    if (checkpointMessage && alpha > 0) {
      push();
      fill(40, 40, 50, alpha);
      textFont("Poppins");
      textStyle(BOLD);
      textSize(64);
      textAlign(CENTER, CENTER);
      text(checkpointMessage, width / 2, height / 2);
      pop();
    }
  }

  // Reset text settings
  textAlign(LEFT, TOP);
  textFont("Inter");
  textStyle(NORMAL);
  textSize(14);
  noStroke();
}

function drawEndHouse(centerX) {
  const groundY = 424;
  const houseW = 50;
  const houseH = 70;
  const x = centerX - houseW / 2; // center house at given x
  const baseY = groundY - houseH;

  // Only draw when in view
  if (x + houseW < cam.x - 50 || x > cam.x + width + 50) return;

  noStroke();

  // Body (cream/white)
  fill(245, 240, 230);
  rect(x, baseY, houseW, houseH);

  // Roof (brown)
  fill(120, 85, 60);
  triangle(x - 4, baseY, x + houseW / 2, baseY - 28, x + houseW + 4, baseY);

  // Door (brown)
  fill(100, 70, 50);
  rect(x + houseW / 2 - 8, baseY + houseH - 32, 16, 32, 2);

  // Window
  fill(200, 230, 255);
  rect(x + 8, baseY + 18, 14, 14, 2);
  stroke(80, 60, 45);
  strokeWeight(1);
  line(x + 15, baseY + 18, x + 15, baseY + 32);
  line(x + 8, baseY + 25, x + 22, baseY + 25);
  noStroke();
}

function drawRainZone(zone) {
  const left = max(zone.startX, cam.x - 50);
  const right = min(zone.endX, cam.x + width + 50);
  if (left >= right) return;

  noStroke();

  // Clouds (grey puffs along the rain zone)
  const cloudBases = [];
  for (let x = zone.startX; x <= zone.endX; x += 280) {
    cloudBases.push(x + ((x * 0.1) % 120));
  }
  fill(140, 150, 165, 200);
  const cloudWidth = 55;
  for (const cx of cloudBases) {
    if (cx < left - 80 || cx > right + 80) continue;
    ellipse(cx, 45, 90, 35);
    ellipse(cx - 35, 55, 70, 28);
    ellipse(cx + 40, 52, 75, 30);
    ellipse(cx - 10, 38, 55, 25);
    ellipse(cx + 25, 40, 50, 22);
  }

  // Rain only under each cloud — dense, irregular grid to avoid blank strips
  const rainSpeed = 2.5;
  const cloudBottomY = 82;
  const rainFloorY = 500;
  const rainHeight = rainFloorY - cloudBottomY + 20;
  noStroke();

  for (const cx of cloudBases) {
    if (cx + cloudWidth < left || cx - cloudWidth > right) continue;
    let wx = cx - cloudWidth;
    let col = 0;
    while (wx <= cx + cloudWidth) {
      const step = 8 + (col % 5);
      const colOffset = (wx * 17 + col * 7) % 100;
      const numDrops = 9;
      for (let d = 0; d < numDrops; d++) {
        const phaseSeed = (wx * 23 + d * 41 + colOffset) % 997;
        const phase = (frameCount * rainSpeed + phaseSeed) % rainHeight;
        const y = cloudBottomY + phase;
        const xJitter = ((wx * 11 + d * 19) % 13) - 6;
        const x = wx + xJitter + phase * 0.015;
        const dropH = 9 + (phaseSeed % 4);
        const dropW = 2 + (phaseSeed % 5) * 0.25;
        const alpha = 120 + ((phaseSeed + wx) % 70);
        fill(200, 220, 240, alpha);
        push();
        translate(x, y);
        ellipse(0, 0, dropW, dropH);
        fill(255, 255, 255, alpha * 0.35);
        ellipse(-dropW * 0.2, -dropH * 0.2, dropW * 0.5, dropH * 0.4);
        pop();
      }
      wx += step;
      col++;
    }
  }
  noStroke();
}

function drawLightningZone(zone) {
  const left = max(zone.startX, cam.x - 50);
  const right = min(zone.endX, cam.x + width + 50);
  if (left >= right) return;

  const cloudTopY = 40;
  const cloudWidth = 70;
  const cloudStep = 320;
  const cloudBases = [];
  for (let x = zone.startX + 120; x <= zone.endX; x += cloudStep) {
    cloudBases.push(x + ((x * 0.13) % 140) - 70);
  }

  // Clouds
  noStroke();
  fill(110, 120, 135, 210);
  for (const cx of cloudBases) {
    if (cx < left - 100 || cx > right + 100) continue;
    ellipse(cx, cloudTopY + 10, 110, 40);
    ellipse(cx - 42, cloudTopY + 20, 85, 32);
    ellipse(cx + 46, cloudTopY + 18, 90, 34);
    ellipse(cx - 12, cloudTopY + 2, 70, 28);
    ellipse(cx + 24, cloudTopY + 4, 62, 24);
  }

  // Bolts
  const cycleFrames = 240; // 4 seconds @ 60fps
  const strikeFrames = 30;
  const strikeOn = frameCount % cycleFrames < strikeFrames;
  if (!strikeOn) return;

  for (let i = 0; i < cloudBases.length; i++) {
    const cx = cloudBases[i];
    if (cx < left - 100 || cx > right + 100) continue;

    // Alternate which clouds strike to avoid wall-of-bolts
    if (i % 2 === Math.floor(frameCount / cycleFrames) % 2) continue;

    const boltTopY = 82;
    const boltBottomY = 500;

    // Zig-zag bolt: build a jagged path using noise-based offsets
    const steps = 7;
    const strikeIndex = Math.floor(frameCount / cycleFrames);
    const pts = [];
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const y = lerp(boltTopY, boltBottomY, t);
      let x = cx;
      if (s > 0 && s < steps) {
        const n = noise(i * 0.37, s * 0.61, strikeIndex * 0.23);
        const dir = s % 2 === 0 ? -1 : 1;
        const amp = 30 + n * 30; // 30–60 px sideways
        x += dir * amp;
      }
      pts.push({ x, y });
    }

    // Outer glow stroke (same zig-zag path, thicker + softer)
    stroke(255, 255, 220, 140);
    strokeWeight(9);
    noFill();
    beginShape();
    for (const p of pts) vertex(p.x, p.y);
    endShape();

    // Inner bright core
    stroke(255, 250, 180, 255);
    strokeWeight(3);
    beginShape();
    for (const p of pts) vertex(p.x, p.y);
    endShape();
  }
  noStroke();
}

function checkLightningHit(zone, player) {
  const cycleFrames = 240; // 4 seconds @ 60fps
  const strikeFrames = 30;
  const strikeOn = frameCount % cycleFrames < strikeFrames;
  if (!strikeOn) return false;

  if (player.x < zone.startX || player.x > zone.endX) return false;

  const boltTopY = 82;
  const boltBottomY = 500;
  if (player.y < boltTopY || player.y > boltBottomY) return false;

  // Match cloud positions used for drawing
  const cloudStep = 320;
  const cloudBases = [];
  for (let x = zone.startX + 120; x <= zone.endX; x += cloudStep) {
    cloudBases.push(x + ((x * 0.13) % 140) - 70);
  }

  const boltHalfW = 14;
  for (let i = 0; i < cloudBases.length; i++) {
    // Alternate bolts same way as drawLightningZone
    if (i % 2 === Math.floor(frameCount / cycleFrames) % 2) continue;

    const cx = cloudBases[i];
    if (Math.abs(player.x - cx) <= boltHalfW + player.r * 0.4) {
      return true;
    }
  }
  return false;
}

function keyPressed() {
  if (!gameStarted) {
    if (startScreenKeyPressed()) return;
  }
  if (key === " " || key === "W" || key === "w" || keyCode === UP_ARROW) {
    if (gameStarted) {
      player.registerJumpPress();
    }
  }
  if (key === "r" || key === "R") loadLevel(levelIndex);
}

function mousePressed() {
  if (!gameStarted) {
    startScreenMousePressed();
    return;
  }

  // Debug: teleport to checkpoint (testing only)
  const tpBtnY = height - 44;
  const tpBtnH = 32;
  const tpBtnPad = 8;
  let tpBtnX = 16;
  for (let i = 0; i < checkpointTpTargets.length; i++) {
    const t = checkpointTpTargets[i];
    const btnW = textWidth(t.label) + 20;
    if (
      mouseX >= tpBtnX &&
      mouseX <= tpBtnX + btnW &&
      mouseY >= tpBtnY &&
      mouseY <= tpBtnY + tpBtnH
    ) {
      player.x = t.x;
      player.y = t.y;
      player.vx = 0;
      player.vy = 0;
      respawnPoint = { x: t.x, y: t.y };
      return;
    }
    tpBtnX += btnW + tpBtnPad;
  }
}
