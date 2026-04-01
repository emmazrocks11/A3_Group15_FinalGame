function drawImageCover(img, x, y, w, h) {
  if (!img || !img.width) return;
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  image(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function drawSplashBackground() {
  if (splashScreenImg && splashScreenImg.width) {
    drawImageCover(splashScreenImg, 0, 0, VIEW_W, VIEW_H);
  } else {
    background(200, 220, 255);
  }
}

/**
 * Mascot on the splash mountain (right side of art), scaled to read as standing on the ridge.
 * Size is 2× the previous “one-third” caps (i.e. 2/3 of original 210 / 62% layout).
 */
function drawStartScreenBuddy() {
  if (!startScreenBuddyImg || !startScreenBuddyImg.width) return;
  const maxW = (210 / 3) * 2;
  const maxH = ((VIEW_H * 0.62) / 3) * 2;
  const scale = Math.min(
    maxW / startScreenBuddyImg.width,
    maxH / startScreenBuddyImg.height,
    1
  );
  const bw = startScreenBuddyImg.width * scale;
  const bh = startScreenBuddyImg.height * scale;
  const padX = 52;
  const padY = 18;
  const mountainLift = 108;
  const cx = VIEW_W - padX - bw / 2;
  const cy = VIEW_H - padY - bh / 2 - mountainLift;
  imageMode(CENTER);
  image(startScreenBuddyImg, cx, cy, bw, bh);
  imageMode(CORNER);
}

function drawDaisyNameLogo() {
  if (!daisyNameImg || !daisyNameImg.width) return;
  const maxLogoW = VIEW_W * 0.88;
  const maxLogoH = VIEW_H * 0.35;
  const scale = Math.min(
    maxLogoW / daisyNameImg.width,
    maxLogoH / daisyNameImg.height,
    1
  );
  const logoW = daisyNameImg.width * scale;
  const logoH = daisyNameImg.height * scale;
  const t = frameCount * 0.1;
  const shakeX = sin(t * 1.35) * 2.5 + sin(t * 2.2) * 1.2;
  const shakeY = sin(t * 1.7 + 0.9) * 1.8;
  const shakeR = sin(t * 0.82) * 0.04;
  const cx = VIEW_W / 2 + shakeX;
  const cy = 72 + logoH / 2 + shakeY;
  imageMode(CENTER);
  push();
  translate(cx, cy);
  rotate(shakeR);
  image(daisyNameImg, 0, 0, logoW, logoH);
  pop();
  imageMode(CORNER);
}

function pointInRect(mx, my, r) {
  return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
}

function getMainMenuButtons() {
  const btnW = 280;
  const btnH = 48;
  const gap = 12;
  const totalH = btnH * 3 + gap * 2;
  const startY = VIEW_H - totalH - 40;
  const btnX = VIEW_W / 2 - btnW / 2;
  return [
    { id: "play", x: btnX, y: startY, w: btnW, h: btnH, label: "Play" },
    {
      id: "instructions",
      x: btnX,
      y: startY + btnH + gap,
      w: btnW,
      h: btnH,
      label: "Instructions",
    },
    {
      id: "about",
      x: btnX,
      y: startY + 2 * (btnH + gap),
      w: btnW,
      h: btnH,
      label: "About ABI",
    },
  ];
}

function getBackButtonRect() {
  const btnW = 140;
  const btnH = 48;
  return { x: 28, y: VIEW_H - 36 - btnH, w: btnW, h: btnH };
}

/** Same placement as main menu primary buttons — used on win screen. */
function getWinScreenPlayAgainRect() {
  const btnW = 280;
  const btnH = 48;
  return {
    x: VIEW_W / 2 - btnW / 2,
    y: VIEW_H - 40 - btnH,
    w: btnW,
    h: btnH,
  };
}

/** Frosted pastel button — same look as Instructions / About Back. */
function drawCuteGlassButton(r, label, labelSize) {
  const rad = 16;
  const isHover = pointInRect(mouseX, mouseY, r);
  fill(0, 0, 0, isHover ? 20 : 14);
  noStroke();
  rect(r.x + 3, r.y + 4, r.w, r.h, rad);
  fill(255, 255, 255, isHover ? 128 : 98);
  stroke(255, 190, 210, 240);
  strokeWeight(2);
  rect(r.x, r.y + (isHover ? -2 : 0), r.w, r.h, rad);
  fill(88, 42, 72);
  textAlign(CENTER, CENTER);
  textFont("Poppins");
  textSize(labelSize ?? 18);
  textStyle(BOLD);
  noStroke();
  text(
    label,
    r.x + r.w / 2,
    r.y + r.h / 2 + (isHover ? -1 : 0)
  );
}

/** Frosted glass card — higher opacity behind text for readability. */
function drawCuteGlassPanel(px, py, pw, ph) {
  const rad = 26;
  fill(0, 0, 0, 28);
  noStroke();
  rect(px + 5, py + 7, pw, ph, rad);
  fill(255, 252, 254, 175);
  stroke(255, 195, 215, 220);
  strokeWeight(2);
  rect(px, py, pw, ph, rad);
  noFill();
  stroke(255, 255, 255, 160);
  strokeWeight(1.5);
  rect(px + 3, py + 3, pw - 6, ph - 6, rad - 3);
}

/** Tiny floating sparkles on the panel corners */
function drawCuteSparkles(px, py, pw, ph) {
  const t = frameCount * 0.09;
  const spots = [
    { x: px + 14, y: py + 16 },
    { x: px + pw - 14, y: py + 20 },
    { x: px + 18, y: py + ph - 18 },
    { x: px + pw - 16, y: py + ph - 14 },
  ];
  for (let i = 0; i < spots.length; i++) {
    const s = spots[i];
    const pulse = 0.55 + 0.45 * sin(t + i * 1.1);
    const ox = sin(t * 1.2 + i) * 4;
    const oy = cos(t * 0.85 + i * 0.7) * 3;
    fill(255, 210, 225, 200 * pulse);
    noStroke();
    ellipse(s.x + ox, s.y + oy, 8 * pulse, 8 * pulse);
    fill(255, 255, 255, 150 * pulse);
    ellipse(s.x + ox - 2, s.y + oy - 2, 3, 3);
  }
}

function drawCuteTitle(txt, cx, topY) {
  textFont("Poppins");
  textSize(27);
  textStyle(BOLD);
  textAlign(CENTER, TOP);
  noStroke();
  fill(255, 255, 255, 200);
  text(txt, cx + 2, topY + 2);
  fill(255, 255, 255, 110);
  text(txt, cx + 1, topY + 1);
  fill(78, 38, 88);
  text(txt, cx, topY);
}

function drawCuteBackButton() {
  drawCuteGlassButton(getBackButtonRect(), "← Back", 17);
}

function drawMainMenu() {
  drawSplashBackground();
  drawStartScreenBuddy();
  drawDaisyNameLogo();
  for (const b of getMainMenuButtons()) {
    const { id, label, ...rect } = b;
    drawCuteGlassButton(rect, label, id === "play" ? 22 : 18);
  }
}

function drawInstructionsScreen() {
  drawSplashBackground();
  fill(255, 245, 250, 58);
  noStroke();
  rect(0, 0, VIEW_W, VIEW_H);

  const panelX = 28;
  const panelY = 36;
  const panelW = VIEW_W - 56;
  const panelH = VIEW_H - 110;
  drawCuteGlassPanel(panelX, panelY, panelW, panelH);
  drawCuteSparkles(panelX, panelY, panelW, panelH);

  drawCuteTitle("Instructions", VIEW_W / 2, panelY + 20);

  textFont("Inter");
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
  textSize(15);
  textLeading(24);
  const tx = panelX + 28;
  let ty = panelY + 64;
  const lineGap = 24;
  const lines = [
    "Move with WASD or arrow keys.",
    "Jump with Space, W, or Up Arrow — jumping uses energy.",
    "Hold Shift to sprint (uses energy faster).",
    "When your energy bar is high enough, you can double jump in the air.",
    "Collect stars to raise your maximum energy.",
    "Touch sunflowers to set checkpoints and respawn points.",
    "Rain slows you down; lightning can briefly invert your controls.",
    "Press R to reset the level.",
  ];
  for (const line of lines) {
    fill(236, 130, 165, 240);
    noStroke();
    ellipse(tx - 10, ty + 9, 7, 7);
    fill(255, 255, 255, 200);
    text(line, tx + 2, ty + 2);
    fill(255, 255, 255, 95);
    text(line, tx + 1, ty + 1);
    fill(32, 28, 38);
    text(line, tx, ty);
    ty += lineGap;
  }

  drawCuteBackButton();
}

function drawAboutAbiScreen() {
  drawSplashBackground();
  fill(255, 245, 250, 58);
  noStroke();
  rect(0, 0, VIEW_W, VIEW_H);

  const panelX = 28;
  const panelY = 36;
  const panelW = VIEW_W - 56;
  const panelH = VIEW_H - 110;
  drawCuteGlassPanel(panelX, panelY, panelW, panelH);
  drawCuteSparkles(panelX, panelY, panelW, panelH);

  drawCuteTitle("About ABI", VIEW_W / 2, panelY + 20);

  textFont("Inter");
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
  textSize(16);
  textLeading(26);
  const tx = panelX + 28;
  let ty = panelY + 64;
  const bodyW = panelW - 56;
  const paragraphs = [
    "Acquired brain injury (ABI) affects how people experience energy, focus, and control in everyday life. Symptoms and recovery vary widely from person to person.",
    "This game is not a medical model of ABI. It is a playful way to notice how much cognitive and physical effort simple movement can take when energy and attention feel limited — similar themes to what some people navigate after brain injury.",
  ];
  for (const p of paragraphs) {
    ty = drawWrappedParagraphCute(p, tx, ty, bodyW, 26);
    ty += 18;
  }

  drawCuteBackButton();
}

/** Wrapped body text with layered shadow for contrast on busy backgrounds. */
function drawWrappedParagraphCute(str, x, y, maxW, lineHeight) {
  const words = str.split(" ");
  let line = "";
  let cy = y;
  const ink = [32, 28, 38];
  function drawLineSegment(seg) {
    fill(255, 255, 255, 200);
    text(seg, x + 2, cy + 2);
    fill(255, 255, 255, 100);
    text(seg, x + 1, cy + 1);
    fill(ink[0], ink[1], ink[2]);
    text(seg, x, cy);
  }
  for (let i = 0; i < words.length; i++) {
    const test = line.length ? line + " " + words[i] : words[i];
    if (textWidth(test) > maxW && line.length > 0) {
      drawLineSegment(line);
      cy += lineHeight;
      line = words[i];
    } else {
      line = test;
    }
  }
  if (line.length) {
    drawLineSegment(line);
    cy += lineHeight;
  }
  return cy;
}

function drawStartScreen() {
  if (menuScreen === "instructions") {
    drawInstructionsScreen();
  } else if (menuScreen === "about") {
    drawAboutAbiScreen();
  } else {
    drawMainMenu();
  }
}

function startScreenMousePressed() {
  if (menuScreen === "main") {
    for (const b of getMainMenuButtons()) {
      if (pointInRect(mouseX, mouseY, b)) {
        if (b.id === "play") {
          gameStarted = true;
          checkpointMessage = "Balance";
          checkpointMessageTimer = 0;
        } else if (b.id === "instructions") {
          menuScreen = "instructions";
        } else if (b.id === "about") {
          menuScreen = "about";
        }
        return;
      }
    }
  } else if (pointInRect(mouseX, mouseY, getBackButtonRect())) {
    menuScreen = "main";
  }
}

function startScreenKeyPressed() {
  if (keyCode === 27) {
    if (menuScreen !== "main") {
      menuScreen = "main";
      return true;
    }
  }
  if (
    menuScreen === "main" &&
    (key === " " || key === "W" || key === "w" || keyCode === UP_ARROW)
  ) {
    gameStarted = true;
    checkpointMessage = "Balance";
    checkpointMessageTimer = 0;
    return true;
  }
  return false;
}
