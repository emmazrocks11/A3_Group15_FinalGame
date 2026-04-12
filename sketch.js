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
/** First drop-in spawn: shift left from `level.start.x` (JSON stays canonical). */
const INITIAL_SPAWN_X_OFFSET = 30;

/** Win screen ending credits — replace with your six names. */
const WIN_SCREEN_CREDITS = [
  "Rose Chen",
  "Cherry Ke",
  "Kaitlyn Subacharoen",
  "Caitlyn Tan",
  "Olivia Yip",
  "Emma Zhang",
];

/** Win screen: top→bottom scroll (thank-you + credits), then auto-return to main menu. */
const WIN_SCROLL_SPEED = 2.65;
/** First line starts above the top edge; reel moves downward. */
const WIN_CREDITS_REEL_START_Y = -400;
const WIN_CREDITS_LINE_GAP = 36;
/** Frames after credits leave the screen before returning to the start menu. */
const WIN_AUTO_RETURN_AFTER_CREDITS = 40;
/** Dark overlay alpha (0–255) during credits; fades to 0 over this many frames after credits end. */
const WIN_OVERLAY_MAX_ALPHA = 115;
const WIN_OVERLAY_FADE_FRAMES = 55;
/** Blackout over the win screen before switching to the menu (0→255). */
const WIN_TO_MENU_FADE_OUT_FRAMES = 32;
/** Start menu fades in from black after the win transition. */
const MAIN_MENU_FADE_IN_FRAMES = 52;

/**
 * Rain atmosphere: horizontal fade distance (world px) for one smooth ramp in and
 * one smooth ramp out of the zone (flat full strength between zone edges).
 */
const RAIN_ATMO_APPROACH = 200;

let allLevelsData;
let levelIndex = 0;

let level;
let player;
let cam;
let skyImg;
let mountainImg;
let jumpSound;
let walkSound;
let shineSound;
let lobbyMusic;
let winMusic;
let walk1Img;
let walk2Img;
let seedImg;
let grow1Img;
let grow2Img;
let daisyImg;
let instructionsHowToImg;
let splashScreenImg;
let daisyNameImg;
let startScreenBuddyImg;
let liedown1Img;
let liedown2Img;
let hatImg;
let collectiblesData;
let stars = [];
let totalStarsCollected = 0;
let gameStarted = false;
/** After winning, main menu primary button shows “Replay” until they start the game. */
let mainMenuPlayLabelReplay = false;
/** @type {"main"|"instructions"|"about"} */
let menuScreen = "main";
let energyBoostTimer = 0;
let checkpoint = null;
let checkpoint2 = null;
let checkpoint3 = null;
let startCheckpoint = null;
let gameWon = false;
/** Frames since win; drives thank-you → credits → replay. */
let winScreenTimer = 0;
/** Frame index when the last credit line scrolled off (null until then). */
let winScreenCreditsDoneFrame = null;
/** null = not fading; counts down each frame during win→menu blackout. */
let winToMenuBlackoutFramesLeft = null;
/** Counts down while the main menu is covered by a fading black layer. */
let mainMenuFadeInFramesLeft = 0;
let respawnPoint = null;
let checkpointMessage = null;
let checkpointMessageTimer = 0;
/** @type {{ startX: number, endX: number }[]} */
let rainZones = [];
let lightningZone = null;
let checkpointTpTargets = [];
let checkpointsDrawOrder = [];
let checkpointsUpdateOrder = [];
/** World position readout (toggle with C or the XY button). */
let showCoordsHud = true;

/** Last p5 pixelDensity applied (avoid redundant buffer resets). */
let _lastUiPixelDensity = 0;

function preload() {
  allLevelsData = loadJSON("levels.json"); // levels.json beside index.html [web:122]
  collectiblesData = loadJSON("collectibles.json");
  // Load the tiled sky background (file lives in `assets/images/sky.png`)
  skyImg = loadImage("assets/images/sky.png");
  // Load mountain layer to draw on top of the sky
  mountainImg = loadImage("assets/images/mountain.png");
  rainyCloudImg = loadImage("assets/images/rainycloud.png");
  // Load jump sound effect
  jumpSound = loadSound("assets/sounds/jumpsound.mp3");
  walkSound = loadSound("assets/sounds/walk.mp3");
  shineSound = loadSound("assets/sounds/shine.mp3");
  lobbyMusic = loadSound("assets/sounds/lobbymusic.mp3");
  winMusic = loadSound("assets/sounds/winmusic.mp3");
  // Load blob walk animation frames
  walk1Img = loadImage("assets/images/walk1.png");
  walk2Img = loadImage("assets/images/walk2.png");
  seedImg = loadImage("assets/images/seed.png");
  grow1Img = loadImage("assets/images/grow1.png");
  grow2Img = loadImage("assets/images/grow2.png");
  daisyImg = loadImage("assets/images/daisy.png");
  instructionsHowToImg = loadImage("assets/images/instructions.png");
  splashScreenImg = loadImage("assets/images/splashscreen.png");
  daisyNameImg = loadImage("assets/images/daisyname.png");
  startScreenBuddyImg = loadImage("assets/images/startscreenbuddy.png");
  liedown1Img = loadImage("assets/images/liedown1.png");
  liedown2Img = loadImage("assets/images/liedown2.png");
  hatImg = loadImage("assets/images/hat.png");
  // Grass platform tiles (small blocks)
  end1Img = loadImage("assets/images/end 1.png");
  middle1Img = loadImage("assets/images/middle 1.png");
  middle2Img = loadImage("assets/images/middle 2.png");
  end2Img = loadImage("assets/images/end 2.png");
}

/**
 * Scale the canvas element so the fixed 800×480 game fills the browser (letterboxed),
 * and raise pixelDensity so backing-store pixels match on-screen pixels (sharp UI/text).
 */
function applyCanvasDisplayScale() {
  const s = min(windowWidth / VIEW_W, windowHeight / VIEW_H);
  const el = document.querySelector("#game-root canvas");
  if (el) {
    el.style.width = `${VIEW_W * s}px`;
    el.style.height = `${VIEW_H * s}px`;
  }
  const dpr =
    typeof window !== "undefined" && window.devicePixelRatio
      ? window.devicePixelRatio
      : 1;
  const nextPd = max(1, min(4, round(s * dpr)));
  if (nextPd !== _lastUiPixelDensity) {
    _lastUiPixelDensity = nextPd;
    pixelDensity(nextPd);
  }
}

function setup() {
  createCanvas(VIEW_W, VIEW_H).parent(select("#game-root"));
  applyCanvasDisplayScale();
  textFont("Inter");
  textSize(14);

  // Walking SFX at 2× speed (jump uses default 1×)
  if (walkSound && typeof walkSound.rate === "function") {
    walkSound.rate(2);
  }
  if (jumpSound && typeof jumpSound.setVolume === "function") {
    jumpSound.setVolume(0.8);
  }
  if (shineSound && typeof shineSound.setVolume === "function") {
    shineSound.setVolume(0.75);
  }
  if (winMusic && typeof winMusic.setVolume === "function") {
    winMusic.setVolume(0.5);
  }

  cam = new Camera2D(width, height);
  loadLevel(levelIndex);
}

function windowResized() {
  applyCanvasDisplayScale();
}

function loadLevel(i) {
  gameWon = false;
  winScreenTimer = 0;
  winScreenCreditsDoneFrame = null;
  winToMenuBlackoutFramesLeft = null;
  mainMenuFadeInFramesLeft = 0;
  level = LevelLoader.fromLevelsJson(allLevelsData, i);

  // Platforms use grass tile strips (end 1 / middle 1–2 / end 2) in WorldLevel when art loads

  if (walkSound && walkSound.isPlaying && walkSound.isPlaying()) {
    walkSound.stop();
  }
  if (winMusic && winMusic.isPlaying && winMusic.isPlaying()) {
    winMusic.stop();
  }
  player = new BlobPlayer(jumpSound, [walk1Img, walk2Img], walkSound);
  player.spawnFromLevel(level);

  const dropHeight = 220;
  const groundY = 424 - player.r;
  player.spawnAt(level.start.x - INITIAL_SPAWN_X_OFFSET, groundY - dropHeight);

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

  if (collectiblesData && collectiblesData.checkpoint3) {
    const c3 = collectiblesData.checkpoint3;
    checkpoint3 = new Checkpoint(c3.x, c3.y, c3.text ?? null, {
      prerequisite: checkpoint2,
      images: daisyImages,
      isFinalCheckpoint: true,
    });
  } else {
    checkpoint3 = null;
  }

  checkpointsDrawOrder = [];
  if (startCheckpoint) checkpointsDrawOrder.push(startCheckpoint);
  if (checkpoint) checkpointsDrawOrder.push(checkpoint);
  if (checkpoint2) checkpointsDrawOrder.push(checkpoint2);
  if (checkpoint3) checkpointsDrawOrder.push(checkpoint3);

  checkpointsUpdateOrder = [];
  if (checkpoint) checkpointsUpdateOrder.push(checkpoint);
  if (checkpoint2) checkpointsUpdateOrder.push(checkpoint2);
  if (checkpoint3) checkpointsUpdateOrder.push(checkpoint3);
  if (startCheckpoint) checkpointsUpdateOrder.push(startCheckpoint);

  respawnPoint = null;
  checkpointMessage = null;
  checkpointMessageTimer = 0;

  rainZones = [];
  if (collectiblesData) {
    if (
      Array.isArray(collectiblesData.rainZones) &&
      collectiblesData.rainZones.length
    ) {
      rainZones = collectiblesData.rainZones.slice();
    } else if (collectiblesData.rainZone) {
      rainZones = [collectiblesData.rainZone];
    }
  }

  if (collectiblesData && collectiblesData.lightningZone) {
    lightningZone = collectiblesData.lightningZone;
  } else {
    lightningZone = null;
  }

  checkpointTpTargets = [];
  const sunflowerTpOrder = [startCheckpoint, checkpoint, checkpoint2];
  for (const cp of sunflowerTpOrder) {
    if (!cp) continue;
    checkpointTpTargets.push({
      label: cp.text || "Checkpoint",
      x: cp.x + 2,
      y: cp.y - player.r,
    });
  }
  if (lightningZone) {
    const rawMid = (lightningZone.startX + lightningZone.endX) / 2;
    const lx = constrain(rawMid, player.r + 4, level.w - player.r - 4);
    const groundY = checkpoint2 ? checkpoint2.y - player.r : 424 - player.r;
    checkpointTpTargets.push({
      label: "Lightning",
      x: lx,
      y: groundY,
    });
  }
  // End: final checkpoint (same ground Y as JSON anchor)
  if (checkpoint3) {
    const ex = constrain(
      checkpoint3.x + 2,
      player.r + 4,
      level.w - player.r - 4,
    );
    checkpointTpTargets.push({
      label: "End",
      x: ex,
      y: checkpoint3.y - player.r,
    });
  }

  cam.x = player.x - width / 2;
  cam.y = 0;
  cam.clampToWorld(level.w, level.h);
}

/** After win: reset level, show start menu, primary button becomes “Replay”. */
function returnToStartScreen() {
  loadLevel(levelIndex);
  gameStarted = false;
  menuScreen = "main";
  mainMenuPlayLabelReplay = true;
  mainMenuFadeInFramesLeft = MAIN_MENU_FADE_IN_FRAMES;
}

function respawnPlayer() {
  if (walkSound && walkSound.isPlaying && walkSound.isPlaying()) {
    walkSound.stop();
  }
  player = new BlobPlayer(jumpSound, [walk1Img, walk2Img], walkSound);
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

/**
 * Start menu music when the Web Audio context is running.
 * On first load the context is suspended until a user gesture — see unlockAudioAndStartLobbyMusic().
 */
function tryStartLobbyMusic() {
  if (gameStarted || !lobbyMusic) return;
  if (lobbyMusic.isPlaying && lobbyMusic.isPlaying()) return;
  if (typeof lobbyMusic.setVolume === "function") {
    lobbyMusic.setVolume(0.45);
  }
  lobbyMusic.loop();
}

/** Chrome/Safari/Firefox require a click/tap/key before audio; p5 resumes the AudioContext here. */
function unlockAudioAndStartLobbyMusic() {
  if (typeof userStartAudio === "function") {
    userStartAudio().then(() => tryStartLobbyMusic());
  } else {
    tryStartLobbyMusic();
  }
}

function draw() {
  background(200, 220, 255);

  if (gameStarted && lobbyMusic && lobbyMusic.isPlaying()) {
    lobbyMusic.stop();
  }

  if (!gameStarted) {
    tryStartLobbyMusic();
    drawStartScreen();
    if (mainMenuFadeInFramesLeft > 0) {
      const a = map(
        mainMenuFadeInFramesLeft,
        MAIN_MENU_FADE_IN_FRAMES,
        0,
        255,
        0,
      );
      fill(0, 0, 0, constrain(a, 0, 255));
      noStroke();
      rect(0, 0, VIEW_W, VIEW_H);
      mainMenuFadeInFramesLeft--;
    }
    return;
  }

  // --- game state ---
  player.inRain = false;
  for (const z of rainZones) {
    if (player.x >= z.startX && player.x <= z.endX) {
      player.inRain = true;
      break;
    }
  }

  const awaitingFinalDaisy =
    checkpoint3 &&
    checkpoint3.reached &&
    !checkpoint3.finalSequenceComplete() &&
    !gameWon;

  if (!gameWon) {
    if (!awaitingFinalDaisy) {
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
    }

    if (
      awaitingFinalDaisy &&
      walkSound &&
      walkSound.isPlaying &&
      walkSound.isPlaying()
    ) {
      walkSound.stop();
    }

    for (const cp of checkpointsUpdateOrder) {
      const wasReached = cp.reached;
      if (!cp.update(player)) continue;
      if (!wasReached && cp.reached && shineSound) {
        shineSound.play();
      }
      respawnPoint = { x: cp.x + 2, y: cp.y - player.r };
      if (
        cp !== startCheckpoint &&
        cp !== checkpoint3 &&
        cp.text &&
        !cp.messageShown
      ) {
        cp.messageShown = true;
        checkpointMessage = cp.text;
        checkpointMessageTimer = 0;
      }
    }

    if (checkpoint3 && checkpoint3.finalSequenceComplete()) {
      gameWon = true;
      winScreenTimer = 0;
      winScreenCreditsDoneFrame = null;
      checkpointMessage = null;
      if (walkSound && walkSound.isPlaying && walkSound.isPlaying()) {
        walkSound.stop();
      }
      if (winMusic) {
        if (winMusic.isPlaying && winMusic.isPlaying()) {
          winMusic.stop();
        }
        winMusic.loop();
      }
    }

    // Fall death → respawn (preserve stars); do not respawn on the same frame we just won
    if (!gameWon && player.y - player.r > level.deathY) {
      respawnPlayer();
      return;
    }
  }

  // --- view state (data-driven smoothing) ---
  cam.followSideScrollerX(player.x, level.camLerp);
  cam.y = 0;
  cam.clampToWorld(level.w, level.h);

  // --- draw ---
  let rainAtmosphereBlend = 0;
  cam.begin();
  level.drawWorld();
  for (const z of rainZones) {
    const lz = rainZoneLocalBlend(player.x, z);
    rainAtmosphereBlend = max(rainAtmosphereBlend, lz);
    drawRainZone(z, lz);
  }
  if (lightningZone) drawLightningZone(lightningZone);
  for (const cp of checkpointsDrawOrder) {
    if (cp.shouldDrawAfterPlayer()) continue;
    cp.draw();
  }
  for (let s of stars) {
    s.draw();
  }
  player.draw(level.theme.blob);
  for (const cp of checkpointsDrawOrder) {
    if (cp.shouldDrawAfterPlayer()) cp.draw();
  }
  cam.end();

  if (!gameWon && rainAtmosphereBlend > 0.0005) {
    drawRainAtmospherePost(rainAtmosphereBlend, player, cam);
  }

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

  const lowEnergyHud =
    player.maxEnergy > 0 && player.energy <= player.maxEnergy * 0.75;
  let barShakeX = 0;
  let barShakeY = 0;
  if (lowEnergyHud) {
    const t = frameCount;
    barShakeX = sin(t * 0.12) * 1.65 + sin(t * 0.41 + 0.8) * 0.85;
    barShakeY = cos(t * 0.14) * 1.15 + cos(t * 0.33 + 1.1) * 0.7;
  }

  push();
  translate(barShakeX, barShakeY);

  // Background with border
  fill(240, 240, 245);
  stroke(180, 180, 190);
  strokeWeight(2);
  rect(barX, barY, barW, barH, 8);

  // Foreground (Energy)
  const energyW = map(player.energy, 0, player.maxEnergy, 0, barW - 4);
  let energyCol = lerpColor(
    color(255, 70, 70),
    color(255, 190, 55),
    player.energy / player.maxEnergy,
  );
  if (boostActive) {
    energyCol = color(255, 235, 90);
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

  pop();

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

  // World coordinates + toggle (top-right, below star row)
  const coordBtnW = 44;
  const coordBtnH = 22;
  const coordBtnX = width - coordBtnW - 8;
  const coordBtnY = starY + 22;
  textFont("Inter");
  textStyle(NORMAL);
  textSize(11);
  textAlign(CENTER, CENTER);
  noStroke();
  if (
    mouseX >= coordBtnX &&
    mouseX <= coordBtnX + coordBtnW &&
    mouseY >= coordBtnY &&
    mouseY <= coordBtnY + coordBtnH
  ) {
    fill(100, 140, 200);
  } else {
    fill(70, 90, 130);
  }
  stroke(50, 70, 100);
  strokeWeight(1);
  rect(coordBtnX, coordBtnY, coordBtnW, coordBtnH, 6);
  fill(255);
  noStroke();
  text(
    showCoordsHud ? "hide" : "XY",
    coordBtnX + coordBtnW / 2,
    coordBtnY + coordBtnH / 2,
  );

  if (showCoordsHud) {
    textAlign(RIGHT, TOP);
    textSize(12);
    fill(40, 40, 50);
    const cx = nf(player.x, 0, 1);
    const cy = nf(player.y, 0, 1);
    text(`x: ${cx}`, width - 16, coordBtnY + coordBtnH + 6);
    text(`y: ${cy}`, width - 16, coordBtnY + coordBtnH + 22);
    textSize(10);
    fill(100, 100, 115);
    text("C toggles", width - 16, coordBtnY + coordBtnH + 40);
  }

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
      const checkpointMsgGreen = color("#77946A");
      fill(
        red(checkpointMsgGreen),
        green(checkpointMsgGreen),
        blue(checkpointMsgGreen),
        alpha,
      );
      textFont("Poppins");
      textStyle(BOLD);
      textSize(64);
      textAlign(CENTER, CENTER);
      text(checkpointMessage, width / 2, height / 2);
      pop();
    }
  }

  if (gameWon) {
    drawWinScreen();
    const autoMenu =
      winScreenCreditsDoneFrame !== null &&
      winScreenTimer >=
        winScreenCreditsDoneFrame + WIN_AUTO_RETURN_AFTER_CREDITS;
    if (autoMenu && winToMenuBlackoutFramesLeft === null) {
      winToMenuBlackoutFramesLeft = WIN_TO_MENU_FADE_OUT_FRAMES;
    }
    if (
      winToMenuBlackoutFramesLeft !== null &&
      winToMenuBlackoutFramesLeft > 0
    ) {
      const N = WIN_TO_MENU_FADE_OUT_FRAMES;
      const delta = N - winToMenuBlackoutFramesLeft;
      const top = max(N - 1, 1);
      fill(0, 0, 0, map(delta, 0, top, 0, 255));
      noStroke();
      rect(0, 0, VIEW_W, VIEW_H);
      winToMenuBlackoutFramesLeft--;
      if (winToMenuBlackoutFramesLeft === 0) {
        returnToStartScreen();
        winToMenuBlackoutFramesLeft = null;
      }
    } else if (!autoMenu) {
      winScreenTimer++;
    }
  }

  // Reset text settings
  textAlign(LEFT, TOP);
  textFont("Inter");
  textStyle(NORMAL);
  textSize(14);
  noStroke();
}

function drawWinScreen() {
  const t = winScreenTimer;

  drawSplashBackground();

  const scrollOffset = t * WIN_SCROLL_SPEED;
  const reelTop = WIN_CREDITS_REEL_START_Y + scrollOffset;
  if (reelTop > VIEW_H + 24 && winScreenCreditsDoneFrame === null) {
    winScreenCreditsDoneFrame = winScreenTimer;
  }

  let overlayAlpha = WIN_OVERLAY_MAX_ALPHA;
  if (winScreenCreditsDoneFrame !== null) {
    const fadeT = winScreenTimer - winScreenCreditsDoneFrame;
    overlayAlpha = map(
      fadeT,
      0,
      WIN_OVERLAY_FADE_FRAMES,
      WIN_OVERLAY_MAX_ALPHA,
      0,
    );
    overlayAlpha = constrain(overlayAlpha, 0, WIN_OVERLAY_MAX_ALPHA);
  }
  if (overlayAlpha > 0) {
    fill(0, 0, 0, overlayAlpha);
    noStroke();
    rect(0, 0, VIEW_W, VIEW_H);
  }

  // Reel (top → bottom scroll): names → “Created by:” → Daisy logo → “Thank you”
  textAlign(CENTER, TOP);

  if (reelTop <= VIEW_H) {
    let y = reelTop;

    textFont("Inter");
    textStyle(NORMAL);
    textSize(18);
    fill(240, 245, 250);
    for (let i = 0; i < WIN_SCREEN_CREDITS.length; i++) {
      text(WIN_SCREEN_CREDITS[i], VIEW_W / 2, y);
      y += WIN_CREDITS_LINE_GAP;
    }
    y += 10;
    textSize(16);
    fill(200, 210, 225);
    text("Created by:", VIEW_W / 2, y);
    y += 28;
    y += 10;

    if (daisyNameImg && daisyNameImg.width) {
      const maxLogoW = min(VIEW_W * 0.68, 360);
      const sc = min(maxLogoW / daisyNameImg.width, 1);
      const logoW = daisyNameImg.width * sc;
      const logoH = daisyNameImg.height * sc;
      imageMode(CENTER);
      image(daisyNameImg, VIEW_W / 2, y + logoH / 2, logoW, logoH);
      imageMode(CORNER);
      y += logoH + 22;
    } else {
      textFont("Poppins");
      textStyle(BOLD);
      textSize(18);
      fill(255, 220, 235);
      text("Daisy", VIEW_W / 2, y);
      y += 44;
    }

    textFont("Poppins");
    textStyle(BOLD);
    textSize(22);
    fill(255, 252, 254);
    text("Thank you for playing", VIEW_W / 2, y);
  }
}

/** Rain / lightning clouds: `rainycloud.png` centered in world space. */
function drawRainyCloudImage(cx, cy, displayW, flipH, flipV, alpha = 255) {
  if (!rainyCloudImg || rainyCloudImg.width <= 0) return;
  push();
  if (alpha < 255) {
    tint(255, alpha);
  }
  translate(cx, cy);
  scale(flipH ? -1 : 1, flipV ? -1 : 1);
  imageMode(CENTER);
  const displayH = (rainyCloudImg.height / rainyCloudImg.width) * displayW;
  image(rainyCloudImg, 0, 0, displayW, displayH);
  noTint();
  pop();
}

function smoothstep01(x) {
  const t = constrain(x, 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * 0 = fully outside extended band; 1 = inside [startX, endX]. Single trapezoid: ramp in
 * over [startX - fade, startX], flat through the zone, ramp out over [endX, endX + fade]
 * (no separate inner-edge curve — avoids double transitions at each end).
 */
function rainZoneLocalBlend(px, z) {
  if (!z || z.endX <= z.startX) return 0;
  const a = z.startX;
  const b = z.endX;
  const w = b - a;
  const fade = min(RAIN_ATMO_APPROACH, max(100, w * 0.36));

  const lo = a - fade;
  const hi = b + fade;
  if (px <= lo || px >= hi) {
    return 0;
  }

  let raw;
  if (px < a) {
    raw = (px - lo) / (a - lo);
  } else if (px > b) {
    raw = (hi - px) / (hi - b);
  } else {
    raw = 1;
  }

  return smoothstep01(constrain(raw, 0, 1));
}

/** Full-screen rain post (desat / grade / vignette / bloom) in view space after world draw. */
function drawRainAtmospherePost(t, player, cam) {
  if (t < 0.0005 || !player || !cam) return;
  const tt = constrain(t, 0, 1);
  const cx = constrain(player.x - cam.x, -60, VIEW_W + 60);
  const cy = constrain(player.y - cam.y, -60, VIEW_H + 60);

  push();
  rectMode(CORNER);
  noStroke();

  push();
  blendMode(MULTIPLY);
  fill(
    lerp(255, 92, tt),
    lerp(255, 112, tt),
    lerp(255, 138, tt),
    lerp(0, 118, tt),
  );
  rect(0, 0, VIEW_W, VIEW_H);
  pop();

  push();
  blendMode(MULTIPLY);
  fill(172, 176, 190, lerp(0, 88, tt));
  rect(0, 0, VIEW_W, VIEW_H);
  pop();

  const ctx = drawingContext;
  push();
  blendMode(MULTIPLY);
  ctx.save();
  const gx = VIEW_W * 0.5;
  const gy = VIEW_H * 0.49;
  const r0 = VIEW_H * 0.19;
  const r1 = VIEW_H * 0.96;
  const g = ctx.createRadialGradient(gx, gy, r0, gx, gy, r1);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.42, `rgba(0,0,0,${0.15 * tt})`);
  g.addColorStop(1, `rgba(0,0,0,${0.7 * tt})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.restore();
  pop();

  push();
  blendMode(SCREEN);
  const amp = tt * tt;
  const bloomLayers = [
    [26, 20 * amp],
    [54, 15 * amp],
    [92, 10 * amp],
    [130, 6 * amp],
  ];
  for (const [r, a] of bloomLayers) {
    fill(238, 248, 255, a);
    ellipse(cx, cy - 6, r * 1.2, r * 0.92);
  }
  pop();

  pop();
  blendMode(BLEND);
}

/** Stable 0–3 variant from world position (which flips to apply). */
function rainyCloudVariant(cx, zone, salt, index = 0) {
  const z =
    cx * 17.3 +
    zone.startX * 9.1 +
    zone.endX * 2.7 +
    salt * 401.0 +
    index * 179.0;
  return abs(floor(z)) % 4;
}

/**
 * Slow horizontal sway inside the zone. `swayHz` controls how fast each cloud drifts
 * (world-stable; use different values per cloud for variety).
 */
function rainCloudDrawX(baseCx, zone, displayW, index, swayHz = 0.0115) {
  const margin = 14 + displayW * 0.5;
  const roomLeft = max(0, baseCx - zone.startX - margin);
  const roomRight = max(0, zone.endX - baseCx - margin);
  const amp = max(8, min(56, roomLeft, roomRight));
  const t = typeof frameCount !== "undefined" ? frameCount : 0;
  return baseCx + sin(t * swayHz + index * 1.91 + baseCx * 0.0007) * amp;
}

function drawRainZone(zone, zoneBlend = 0) {
  const left = max(zone.startX, cam.x - 50);
  const right = min(zone.endX, cam.x + width + 50);
  if (left >= right) return;

  const zb = constrain(zoneBlend, 0, 1);
  const stormT = smoothstep01(constrain((zb - 0.1) / 0.64, 0, 1));

  noStroke();

  // Several rain clouds spread across the zone, each with its own slow sway speed
  const zw = max(160, zone.endX - zone.startX);
  const cloudCount = constrain(floor(zw / 125), 4, 10);
  const cloudBases = [];
  for (let k = 0; k < cloudCount; k++) {
    const u = (k + 0.5) / cloudCount;
    const spread =
      zone.startX +
      u * zw +
      sin(k * 2.17 + zone.startX * 0.012) * 34 -
      17;
    cloudBases.push(
      constrain(spread, zone.startX + 80, zone.endX - 80),
    );
  }
  const sizeCycle = [1.0, 1.07, 0.93];
  for (let i = 0; i < cloudBases.length; i++) {
    const baseCx = cloudBases[i];
    if (baseCx < left - 140 || baseCx > right + 140) continue;
    const v = rainyCloudVariant(baseCx, zone, 1, i);
    const dw = 130 * sizeCycle[i % sizeCycle.length];
    const cy = 48 + (i % 4) * 2 - 3 + (i % 3 === 1 ? 2 : i % 3 === 2 ? -3 : 0);
    const swayHz =
      0.0059 + (abs(floor(baseCx * 0.079 + i * 101)) % 19) * 0.00072;
    const drawCx = rainCloudDrawX(baseCx, zone, dw, i, swayHz);
    const cloudA = lerp(105, 255, pow(zb, 0.65));
    drawRainyCloudImage(drawCx, cy, dw, v % 2 === 1, v >= 2, cloudA);
  }

  // Rain across the whole zone (world X from zone edge to edge; `left`/`right` are view-culled)
  const rainSpeed = 2.5;
  const cloudBottomY = 82;
  const rainFloorY = 500;
  const rainHeight = rainFloorY - cloudBottomY + 20;
  noStroke();

  // World-anchored columns with irregular spacing + varied drops (still stable when camera pans)
  const grid0 = zone.startX;
  const columnAdvance = (x) => {
    const h = abs(floor(x * 53.127 + grid0 * 0.31)) % 7;
    return 5 + h;
  };
  let wx = grid0;
  while (wx < left - 24) {
    wx += columnAdvance(wx);
  }
  while (wx <= right + 18) {
    if (stormT < 0.52 && (abs(floor(wx * 0.21)) % 2) === 0) {
      wx += columnAdvance(wx);
      continue;
    }
    if (wx >= left - 2 && wx <= right + 2) {
      const colOffset = (wx * 17 + floor(wx * 2.71)) % 100;
      const lanes = 10 + (abs(floor(wx * 0.883)) % 6);
      const maxLanes = max(2, floor(lanes * lerp(0.26, 1, stormT)));
      const wxSkew = (abs(floor(wx)) % 29) * 0.35;
      const dropAlphaMul = lerp(0.18, 1, stormT) * lerp(0.35, 1, zb);
      for (let d = 0; d < maxLanes; d++) {
        const phaseSeed =
          (wx * 29 + d * 53 + colOffset + (d * d * 7) % 101) % 997;
        const spd =
          (rainSpeed + (phaseSeed % 6) * 0.11) *
          lerp(0.55, 1, stormT);
        const phase =
          (frameCount * spd +
            phaseSeed +
            wxSkew +
            (wx % 41) * 0.4 +
            (d * 17) % 43) %
          rainHeight;
        const y = cloudBottomY + phase;
        const xJitter = ((phaseSeed * 11 + d * 23) % 21) - 10;
        const xWobble = ((wx * 3 + phaseSeed * 5) % 9) - 4;
        const x = wx + xJitter + xWobble;
        const dropH =
          (8 + (phaseSeed % 5)) * lerp(0.75, 1, stormT);
        const dropW =
          (1.8 + (phaseSeed % 6) * 0.28) * lerp(0.85, 1, stormT);
        const alpha =
          (108 + ((phaseSeed + floor(wx * 0.12)) % 78)) * dropAlphaMul;
        fill(200, 220, 240, alpha);
        ellipse(x, y, dropW, dropH);
        fill(255, 255, 255, alpha * 0.3);
        ellipse(
          x - dropW * 0.2,
          y - dropH * 0.2,
          dropW * 0.52,
          dropH * 0.42,
        );
      }
    }
    wx += columnAdvance(wx);
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
  const sizeCycle = [1.0, 1.06, 0.94];
  for (let i = 0; i < cloudBases.length; i++) {
    const cx = cloudBases[i];
    if (cx < left - 100 || cx > right + 100) continue;
    const v = rainyCloudVariant(cx, zone, 2, i);
    const dw = 138 * sizeCycle[i % sizeCycle.length];
    const cy = cloudTopY + 12 + (i % 3 === 1 ? 4 : i % 3 === 2 ? -5 : 0);
    drawRainyCloudImage(cx, cy, dw, v % 2 === 1, v >= 2);
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
    unlockAudioAndStartLobbyMusic();
    if (startScreenKeyPressed()) return;
  }
  if (key === " " || key === "W" || key === "w" || keyCode === UP_ARROW) {
    if (gameStarted && !gameWon) {
      player.registerJumpPress();
    }
  }
  if (key === "r" || key === "R") {
    if (gameWon) {
      returnToStartScreen();
      return;
    }
    loadLevel(levelIndex);
  }
  if (key === "c" || key === "C") {
    if (gameStarted) {
      showCoordsHud = !showCoordsHud;
    }
  }
}

function mousePressed() {
  if (!gameStarted) {
    unlockAudioAndStartLobbyMusic();
    startScreenMousePressed();
    return;
  }
  if (gameWon) {
    return;
  }

  const barY = 50;
  const barH = 20;
  const starY = barY + barH / 2;
  const coordBtnW = 44;
  const coordBtnH = 22;
  const coordBtnX = width - coordBtnW - 8;
  const coordBtnY = starY + 22;
  if (
    mouseX >= coordBtnX &&
    mouseX <= coordBtnX + coordBtnW &&
    mouseY >= coordBtnY &&
    mouseY <= coordBtnY + coordBtnH
  ) {
    showCoordsHud = !showCoordsHud;
    return;
  }

  // Debug: teleport to checkpoint (testing only)
  const tpBtnY = height - 44;
  const tpBtnH = 32;
  const tpBtnPad = 8;
  let tpBtnX = 16;
  textFont("Inter");
  textStyle(NORMAL);
  textSize(11);
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

function touchStarted() {
  if (!gameStarted) {
    unlockAudioAndStartLobbyMusic();
  }
}
