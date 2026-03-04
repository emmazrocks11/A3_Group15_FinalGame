function drawStartScreen() {
  // Panel background with shadow
  fill(0, 0, 0, 30);
  noStroke();
  const panelW = 560;
  const panelH = 380;
  const panelX = (VIEW_W - panelW) / 2;
  const panelY = (VIEW_H - panelH) / 2;
  rect(panelX + 8, panelY + 8, panelW, panelH, 20);

  // Main panel
  fill(255, 255, 255, 250);
  stroke(220, 220, 220);
  strokeWeight(1);
  rect(panelX, panelY, panelW, panelH, 20);

  // Title
  fill(40, 40, 50);
  textAlign(CENTER, TOP);
  textFont('Poppins');
  textSize(36);
  textStyle(BOLD);
  text("Platformer Playtest", VIEW_W / 2, panelY + 32);

  // Subtitle line
  stroke(100, 150, 255);
  strokeWeight(2);
  line(panelX + 80, panelY + 80, panelX + panelW - 80, panelY + 80);
  noStroke();

  // Instructions
  textFont('Inter');
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
  textSize(15);
  const tx = panelX + 48;
  let ty = panelY + 100;
  const lineH = 28;

  fill(60, 60, 70);
  text("Use WASD or arrow keys to move", tx, ty);
  ty += lineH;
  
  fill(80, 80, 90);
  textSize(14);
  text("• Jumping costs energy", tx + 20, ty);
  ty += lineH + 4;
  text("• Double jump requires at least half energy bar", tx + 20, ty);

  // Play button
  drawPlayButton(panelX, panelY, panelW, panelH);
}

function drawPlayButton(panelX, panelY, panelW, panelH) {
  const btnW = 180;
  const btnH = 52;
  const btnX = VIEW_W / 2 - btnW / 2;
  const btnY = panelY + panelH - btnH - 28;

   const isHover =
    mouseX >= btnX &&
    mouseX <= btnX + btnW &&
    mouseY >= btnY &&
    mouseY <= btnY + btnH;

  // Button shadow
  fill(100, 150, 255, isHover ? 70 : 40);
  noStroke();
  rect(btnX, btnY + (isHover ? 6 : 4), btnW, btnH, 12);

  // Button background
  if (isHover) {
    fill(130, 185, 255);
    stroke(80, 140, 240);
  } else {
    fill(100, 160, 255);
    stroke(80, 140, 240);
  }
  strokeWeight(2);
  rect(btnX, btnY + (isHover ? -2 : 0), btnW, btnH, 12);

  // Button text
  fill(255);
  textAlign(CENTER, CENTER);
  textFont('Poppins');
  textSize(22);
  textStyle(BOLD);
  noStroke();
  text("Play", VIEW_W / 2, btnY + (isHover ? btnH / 2 - 2 : btnH / 2));
}

function isPlayButtonClicked(mx, my) {
  const panelW = 560;
  const panelH = 380;
  const panelX = (VIEW_W - panelW) / 2;
  const panelY = (VIEW_H - panelH) / 2;

  const btnW = 180;
  const btnH = 52;
  const btnX = VIEW_W / 2 - btnW / 2;
  const btnY = panelY + panelH - btnH - 28;

  return mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH;
}

