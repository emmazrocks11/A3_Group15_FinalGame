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
  return { x: 28, y: VIEW_H - 36 - btnH, w: btnW, h: btnH };
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

  drawCuteTitle("Instructions", VIEW_W / 2, panelY + 18);

  const panelCenterX = panelX + panelW / 2;
  let ty = panelY + 54;
  const keyW = 33;
  const keyH = 30;
  const keyG = 4;
  const gapBlock = 10;
  const gapWord = 8;
  const rowStep = 18;

  function rowCenterY(clusterH) {
    return ty + clusterH / 2;
  }

  // — Move: WASD + arrows + “to move”
  {
    const c = { w: 3 * keyW + 2 * keyG, h: 2 * keyH + keyG };
    const ar = { w: 3 * keyW + 2 * keyG, h: c.h };
    const rowW =
      c.w +
      gapBlock +
      measureInstructionInline("or") +
      gapWord +
      ar.w +
      gapBlock +
      measureInstructionInline("to move");
    let tx = panelCenterX - rowW / 2;
    drawWasdKeyCluster(tx, ty, keyW, keyH, keyG);
    const midY = rowCenterY(c.h);
    let cx = tx + c.w + gapBlock;
    cx += drawInstructionInline("or", cx, midY) + gapWord;
    drawArrowKeyCluster(cx, ty, keyW, keyH, keyG);
    cx += ar.w + gapBlock;
    drawInstructionInline("to move", cx, midY);
    ty += c.h + rowStep;
  }

  // — Jump: keys + short note
  {
    const rowH = keyH;
    const midY = ty + rowH / 2;
    const wSpace = measureInstructionKeyCap("Space", { minW: 80, textSize: 13 });
    const wW = measureInstructionKeyCap("W", { minW: keyW });
    const wUp = measureInstructionKeyCap("↑", { minW: keyW, textSize: 16 });
    const rowW =
      wSpace +
      gapBlock +
      wW +
      gapBlock +
      wUp +
      gapBlock +
      measureInstructionInline("to jump, but it uses energy");
    let tx = panelCenterX - rowW / 2;
    let cx = tx;
    cx += drawInstructionKeyCap("Space", cx, ty, { minW: 80, h: keyH, textSize: 13 }) + gapBlock;
    cx += drawInstructionKeyCap("W", cx, ty, { minW: keyW, h: keyH }) + gapBlock;
    cx += drawInstructionKeyCap("↑", cx, ty, { minW: keyW, h: keyH, textSize: 16 }) + gapBlock;
    drawInstructionInline("to jump, but it uses energy", cx, midY);
    ty += rowH + rowStep;
  }

  // — Double jump: if high energy use jump keys again in the air
  {
    const rowH = keyH + 2;
    const midY = ty + rowH / 2;
    const wSpace = measureInstructionKeyCap("Space", { minW: 64, textSize: 12 });
    const wW = measureInstructionKeyCap("W", { minW: keyW });
    const wUp = measureInstructionKeyCap("↑", { minW: keyW, textSize: 15 });
    const rowW =
      measureInstructionInline("If energy is up, use") +
      gapBlock +
      wSpace +
      4 +
      wW +
      4 +
      wUp +
      gapBlock +
      measureInstructionInline("to double jump");
    let tx = panelCenterX - rowW / 2;
    let cx = tx;
    cx += drawInstructionInline("if energy is up, use", cx, midY) + gapBlock;
    cx += drawInstructionKeyCap("Space", cx, ty, { minW: 64, h: keyH + 2, textSize: 12 }) + 4;
    cx += drawInstructionKeyCap("W", cx, ty, { minW: keyW, h: keyH + 2 }) + 4;
    cx += drawInstructionKeyCap("↑", cx, ty, { minW: keyW, h: keyH + 2, textSize: 15 }) + gapBlock;
    drawInstructionInline("to double jump", cx, midY);
    ty += rowH + rowStep;
  }

  // — Stars
  {
    const rowH = 28;
    const midY = ty + rowH / 2;
    const em = 21;
    const wStar = measureInstructionEmoji("⭐", em);
    const rowW = wStar + gapBlock + measureInstructionInline("raises your max energy");
    let tx = panelCenterX - rowW / 2;
    let cx = tx;
    textFont("Inter");
    textSize(em);
    textAlign(LEFT, CENTER);
    fill(255, 215, 0);
    textStyle(NORMAL);
    text("⭐", cx, midY + 1);
    cx += wStar + gapBlock;
    textAlign(LEFT, TOP);
    drawInstructionInline("raises your max energy", cx, midY);
    ty += rowH + rowStep;
  }

  // — Sunflowers
  {
    const rowH = 28;
    const midY = ty + rowH / 2;
    const em = 20;
    const wFlower = measureInstructionEmoji("🌻", em);
    const rowW = wFlower + gapBlock + measureInstructionInline("checkpoint · respawn here");
    let tx = panelCenterX - rowW / 2;
    let cx = tx;
    textFont("Inter");
    textSize(em);
    textAlign(LEFT, CENTER);
    fill(32, 28, 38);
    text("🌻", cx, midY + 1);
    cx += wFlower + gapBlock;
    textAlign(LEFT, TOP);
    drawInstructionInline("checkpoint · respawn here", cx, midY);
    ty += rowH + rowStep;
  }

  // — Weather
  {
    const rowH = 28;
    const midY = ty + rowH / 2;
    const em = 19;
    const wRain = measureInstructionEmoji("🌧️", em);
    const wBolt = measureInstructionEmoji("⚡", em);
    const rowW =
      wRain +
      4 +
      measureInstructionInline("slows you") +
      gapBlock * 1.5 +
      wBolt +
      4 +
      measureInstructionInline("inverts controls briefly");
    let tx = panelCenterX - rowW / 2;
    let cx = tx;
    textFont("Inter");
    textSize(em);
    textAlign(LEFT, CENTER);
    fill(32, 28, 38);
    text("🌧️", cx, midY + 1);
    cx += wRain + 4;
    textAlign(LEFT, TOP);
    cx += drawInstructionInline("slows you", cx, midY) + gapBlock * 1.5;
    textFont("Inter");
    textSize(em);
    textAlign(LEFT, CENTER);
    text("⚡", cx, midY + 1);
    cx += wBolt + 4;
    textAlign(LEFT, TOP);
    drawInstructionInline("inverts controls briefly", cx, midY);
    ty += rowH + rowStep;
  }

  // — Reset
  {
    const rowH = keyH;
    const midY = ty + rowH / 2;
    const wR = measureInstructionKeyCap("R", { minW: keyW });
    const rowW = wR + gapBlock + measureInstructionInline("reset level");
    let tx = panelCenterX - rowW / 2;
    let cx = tx;
    cx += drawInstructionKeyCap("R", cx, ty, { minW: keyW, h: keyH }) + gapBlock;
    drawInstructionInline("reset level", cx, midY);
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
