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
 * Main menu mascot: liedown1 / liedown2 loop (2× the former buddy fit size).
 * Falls back to startScreenBuddy if lie-down frames are missing.
 */
function drawMainMenuLieDown() {
  let img = null;
  if (liedown1Img?.width && liedown2Img?.width) {
    img = floor(frameCount / 10) % 2 === 0 ? liedown1Img : liedown2Img;
  } else if (liedown1Img?.width) {
    img = liedown1Img;
  } else if (liedown2Img?.width) {
    img = liedown2Img;
  }
  if (!img) {
    drawStartScreenBuddy();
    return;
  }
  const maxW = (210 / 3) * 2;
  const maxH = ((VIEW_H * 0.62) / 3) * 2;
  const scale = Math.min(maxW / img.width, maxH / img.height, 1) * 2;
  const bw = img.width * scale;
  const bh = img.height * scale;
  const padX = 0;
  const padY = -60;
  const mountainLift = 108;
  const cx = VIEW_W - padX - bw / 2;
  const cy = VIEW_H - padY - bh / 2 - mountainLift;
  imageMode(CENTER);
  image(img, cx, cy, bw, bh);

  if (hatImg && hatImg.width) {
    const hatTargetH = min(bh * 0.84, 260) * 1.25;
    const hatScale = hatTargetH / hatImg.height;
    const hatW = hatImg.width * hatScale;
    const hatH = hatImg.height * hatScale;
    // Clear space between blob’s right edge and hat’s left edge (px)
    const hatGap = 188;
    let hatCx = cx + bw / 2 + hatGap + hatW / 2;
    const hatCy = cy - bh * 0.08;
    // Allow center past the right edge a little so the hat isn’t stuck when the gap is large
    hatCx = min(VIEW_W - hatW / 2 + 28, hatCx);
    image(hatImg, hatCx, hatCy, hatW, hatH);
  }

  imageMode(CORNER);
}

/** Win screen / fallback: original standing buddy art. */
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
  const playLabel = mainMenuPlayLabelReplay ? "Replay" : "Play";
  return [
    { id: "play", x: btnX, y: startY, w: btnW, h: btnH, label: playLabel },
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
  let y = VIEW_H - 36 - btnH;
  if (typeof menuScreen !== "undefined" && menuScreen === "instructions") {
    y += 18;
  }
  return { x: 28, y, w: btnW, h: btnH };
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

function drawCuteTitle(txt, cx, topY, titleSize = 30) {
  textFont("Poppins");
  textSize(titleSize);
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

/** Width of a key cap (must match drawInstructionKeyCap). */
function measureInstructionKeyCap(label, opts = {}) {
  const size = opts.textSize ?? 14;
  const minW = opts.minW ?? 34;
  textFont("Poppins");
  textStyle(BOLD);
  textSize(size);
  const innerPad = 10;
  return max(minW, textWidth(label) + innerPad * 2);
}

/** Rounded key cap for instruction rows; returns drawn width. */
function drawInstructionKeyCap(label, x, y, opts = {}) {
  const h = opts.h ?? 32;
  const size = opts.textSize ?? 14;
  const rad = 8;
  const w = measureInstructionKeyCap(label, opts);
  textFont("Poppins");
  textStyle(BOLD);
  textSize(size);
  fill(0, 0, 0, 20);
  noStroke();
  rect(x + 1.5, y + 2, w, h, rad);
  fill(255, 252, 254, 235);
  stroke(255, 190, 210, 210);
  strokeWeight(1.5);
  rect(x, y, w, h, rad);
  fill(52, 36, 72);
  noStroke();
  textAlign(CENTER, CENTER);
  text(label, x + w / 2, y + h / 2 + 0.5);
  textAlign(LEFT, TOP);
  textStyle(NORMAL);
  return w;
}

/** Classic WASD layout; returns { w, h } in px. */
function drawWasdKeyCluster(ox, oy, keyW, keyH, gap) {
  const wcx = ox + keyW + gap + keyW / 2;
  drawInstructionKeyCap("W", wcx - keyW / 2, oy, { minW: keyW, h: keyH });
  const y2 = oy + keyH + gap;
  drawInstructionKeyCap("A", ox, y2, { minW: keyW, h: keyH });
  drawInstructionKeyCap("S", ox + keyW + gap, y2, { minW: keyW, h: keyH });
  drawInstructionKeyCap("D", ox + 2 * (keyW + gap), y2, { minW: keyW, h: keyH });
  return { w: 3 * keyW + 2 * gap, h: 2 * keyH + gap };
}

/** Arrow-key diamond; returns { w, h } in px. */
function drawArrowKeyCluster(ox, oy, keyW, keyH, gap) {
  const wcx = ox + keyW + gap + keyW / 2;
  drawInstructionKeyCap("↑", wcx - keyW / 2, oy, {
    minW: keyW,
    h: keyH,
    textSize: 16,
  });
  const y2 = oy + keyH + gap;
  drawInstructionKeyCap("←", ox, y2, { minW: keyW, h: keyH, textSize: 15 });
  drawInstructionKeyCap("↓", ox + keyW + gap, y2, {
    minW: keyW,
    h: keyH,
    textSize: 15,
  });
  drawInstructionKeyCap("→", ox + 2 * (keyW + gap), y2, {
    minW: keyW,
    h: keyH,
    textSize: 15,
  });
  return { w: 3 * keyW + 2 * gap, h: 2 * keyH + gap };
}

/** Layered label matching instruction body style; returns width. */
function drawInstructionInline(txt, x, cy) {
  textFont("Inter");
  textStyle(NORMAL);
  textSize(16);
  textAlign(LEFT, CENTER);
  fill(255, 255, 255, 200);
  text(txt, x + 2, cy + 2);
  fill(255, 255, 255, 95);
  text(txt, x + 1, cy + 1);
  fill(32, 28, 38);
  text(txt, x, cy);
  textAlign(LEFT, TOP);
  return textWidth(txt);
}

function measureInstructionInline(txt) {
  textFont("Inter");
  textStyle(NORMAL);
  textSize(16);
  return textWidth(txt);
}

function measureInstructionEmoji(symbol, textSize) {
  textFont("Inter");
  textStyle(NORMAL);
  textSize(textSize);
  return textWidth(symbol);
}

function drawMainMenu() {
  drawSplashBackground();
  drawMainMenuLieDown();
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
  const panelH = VIEW_H - 74;
  drawCuteGlassPanel(panelX, panelY, panelW, panelH);
  drawCuteSparkles(panelX, panelY, panelW, panelH);

  const innerPad = 18;
  const contentX = panelX + innerPad;
  const contentY = panelY + innerPad;
  const contentW = panelW - innerPad * 2;
  const contentH = panelH - innerPad * 2;

  if (
    typeof instructionsHowToImg !== "undefined" &&
    instructionsHowToImg &&
    instructionsHowToImg.width > 0
  ) {
    push();
    imageMode(CORNER);
    const scale = min(
      contentW / instructionsHowToImg.width,
      contentH / instructionsHowToImg.height
    );
    const dw = instructionsHowToImg.width * scale;
    const dh = instructionsHowToImg.height * scale;
    const ix = contentX + (contentW - dw) / 2;
    const iy = contentY + (contentH - dh) / 2;
    image(instructionsHowToImg, ix, iy, dw, dh);
    pop();
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
  const panelH = VIEW_H - 96;
  drawCuteGlassPanel(panelX, panelY, panelW, panelH);
  drawCuteSparkles(panelX, panelY, panelW, panelH);

  drawCuteTitle("About ABI", VIEW_W / 2, panelY + 18);

  textFont("Inter");
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
  textSize(16);
  textLeading(26);
  const tx = panelX + 28;
  let ty = panelY + 64;
  const bodyW = panelW - 56;
  // README [1] ABI overview; [2][3] community stories context; [5] learning implications
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
  updateStartScreenMenuHoverSound();
}

function startScreenMousePressed() {
  if (menuScreen === "main") {
    for (const b of getMainMenuButtons()) {
      if (pointInRect(mouseX, mouseY, b)) {
        playUiClickSound();
        if (b.id === "play") {
          resetStartMenuHoverSoundState();
          gameStarted = true;
          mainMenuPlayLabelReplay = false;
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
    playUiClickSound();
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
    mainMenuPlayLabelReplay = false;
    checkpointMessage = "Balance";
    checkpointMessageTimer = 0;
    return true;
  }
  return false;
}
