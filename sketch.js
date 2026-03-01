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

function preload() {
  allLevelsData = loadJSON("levels.json"); // levels.json beside index.html [web:122]
  collectiblesData = loadJSON("collectibles.json");
}

function setup() {
  createCanvas(VIEW_W, VIEW_H);
  textFont("sans-serif");
  textSize(14);

  cam = new Camera2D(width, height);
  loadLevel(levelIndex);
}

function loadLevel(i) {
  level = LevelLoader.fromLevelsJson(allLevelsData, i);

  player = new BlobPlayer();
  player.spawnFromLevel(level);

  // Initialize stars from JSON
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

function draw() {
  // --- game state ---
  player.update(level);

  for (let s of stars) {
    s.update(player);
  }

  // Fall death → respawn
  if (player.y - player.r > level.deathY) {
    loadLevel(levelIndex);
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

  // HUD
  fill(0);
  noStroke();
  text(level.name + " (Example 5)", 10, 18);
  text("A/D or ←/→ move • Space/W/↑ jump • Shift sprint • Fall = respawn", 10, 36);
  text("camLerp(JSON): " + level.camLerp + "  world.w: " + level.w, 10, 54);
  text("cam: " + cam.x + ", " + cam.y, 10, 90);
  const p0 = level.platforms[0];
  text(`p0: x=${p0.x} y=${p0.y} w=${p0.w} h=${p0.h}`, 10, 108);

  text(
    "platforms: " +
      level.platforms.length +
      " start: " +
      level.start.x +
      "," +
      level.start.y,
    10,
    72,
  );

  // Energy Bar HUD
  const barW = 200;
  const barH = 15;
  const barX = 10;
  const barY = 120;

  // Background
  fill(50, 50, 50, 150);
  rect(barX, barY, barW, barH, 5);

  // Foreground (Energy)
  const energyW = map(player.energy, 0, player.maxEnergy, 0, barW);
  const energyCol = lerpColor(color(255, 50, 50), color(50, 255, 50), player.energy / player.maxEnergy);
  fill(energyCol);
  rect(barX, barY, energyW, barH, 5);

  // Label
  fill(0);
  text("Energy", barX, barY - 5);

  // Stars Counter HUD (Top Right)
  fill(255, 215, 0); // Gold
  stroke(0);
  strokeWeight(2);
  textSize(24);
  textAlign(RIGHT, TOP);
  text("⭐ " + player.starsCollected, width - 20, 20);
  
  // Reset text settings for other HUD elements
  textAlign(LEFT, TOP);
  textSize(14);
  noStroke();
}

function keyPressed() {
  if (key === " " || key === "W" || key === "w" || keyCode === UP_ARROW) {
    player.tryJump();
  }
  if (key === "r" || key === "R") loadLevel(levelIndex);
}
