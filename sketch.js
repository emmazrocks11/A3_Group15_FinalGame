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
let collectiblesData;
let stars = [];
let totalStarsCollected = 0;
let gameStarted = false;
let energyBoostTimer = 0;
let checkpoint = null;
let respawnPoint = null;
let checkpointMessage = null;
let checkpointMessageTimer = 0;

function preload() {
  allLevelsData = loadJSON("levels.json"); // levels.json beside index.html [web:122]
  collectiblesData = loadJSON("collectibles.json");
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

  player = new BlobPlayer();
  player.spawnFromLevel(level);

  // Initialize stars from JSON (full reset on level load)
  totalStarsCollected = 0;
  stars = [];
  if (collectiblesData && collectiblesData.stars) {
    for (let s of collectiblesData.stars) {
      stars.push(new Star(s.x, s.y));
    }
  }

  if (collectiblesData && collectiblesData.checkpoint) {
    const c = collectiblesData.checkpoint;
    checkpoint = new Checkpoint(c.x, c.y, c.text || "Checkpoint");
  } else {
    checkpoint = null;
  }

  respawnPoint = null;
  checkpointMessage = null;
  checkpointMessageTimer = 0;

  cam.x = player.x - width / 2;
  cam.y = 0;
  cam.clampToWorld(level.w, level.h);
}

function respawnPlayer() {
  player = new BlobPlayer();
  if (respawnPoint) {
    player.spawnAt(respawnPoint.x, respawnPoint.y);
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
  player.update(level);

  for (let s of stars) {
    if (s.update(player)) {
      totalStarsCollected++;
      player.applyStarEnergyBonus(player.starsCollected);
      player.energy = player.maxEnergy;
      energyBoostTimer = 60;
    }
  }

  if (checkpoint && checkpoint.update(player)) {
    const wasFirstReach = respawnPoint === null;
    respawnPoint = { x: checkpoint.x + 2, y: checkpoint.y - player.r };
    if (checkpoint.text && wasFirstReach) {
      checkpointMessage = checkpoint.text;
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
  if (checkpoint) checkpoint.draw();
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
  let energyCol = lerpColor(color(255, 80, 80), color(100, 200, 255), player.energy / player.maxEnergy);
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
    } else if (checkpointMessageTimer < fadeInFrames + holdFrames + fadeOutFrames) {
      const t = (checkpointMessageTimer - fadeInFrames - holdFrames) / fadeOutFrames;
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

function keyPressed() {
  if (key === " " || key === "W" || key === "w" || keyCode === UP_ARROW) {
    if (!gameStarted) {
      gameStarted = true;
    } else {
      player.tryJump();
    }
  }
  if (key === "r" || key === "R") loadLevel(levelIndex);
}

function mousePressed() {
  if (gameStarted) return;

  if (isPlayButtonClicked(mouseX, mouseY)) {
    gameStarted = true;
  }
}
