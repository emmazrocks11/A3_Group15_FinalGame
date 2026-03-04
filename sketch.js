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

  cam.x = player.x - width / 2;
  cam.y = 0;
  cam.clampToWorld(level.w, level.h);
}

function respawnPlayer() {
  player = new BlobPlayer();
  player.spawnFromLevel(level);
  player.starsCollected = totalStarsCollected;

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
  text(level.name, 16, 14);

  // Energy Bar HUD
  const barW = 220;
  const barH = 20;
  const barX = 16;
  const barY = 50;

  // Background with border
  fill(240, 240, 245);
  stroke(180, 180, 190);
  strokeWeight(2);
  rect(barX, barY, barW, barH, 8);

  // Foreground (Energy)
  const energyW = map(player.energy, 0, player.maxEnergy, 0, barW - 4);
  const energyCol = lerpColor(color(255, 80, 80), color(100, 200, 255), player.energy / player.maxEnergy);
  fill(energyCol);
  noStroke();
  rect(barX + 2, barY + 2, energyW, barH - 4, 6);

  // Label
  fill(60, 60, 70);
  textFont("Inter");
  textStyle(NORMAL);
  textSize(12);
  text("Energy", barX, barY - 18);

  // Stars Counter HUD (Top Right)
  textFont("Poppins");
  textStyle(BOLD);
  textSize(28);
  textAlign(RIGHT, TOP);
  fill(255, 215, 0);
  noStroke();
  text("⭐", width - 45, 12);
  
  fill(40, 40, 50);
  text(player.starsCollected, width - 18, 16);
  
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
