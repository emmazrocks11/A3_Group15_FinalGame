class WorldLevel {
  constructor(levelJson) {
    this.name = levelJson.name ?? "Level";

    this.theme = Object.assign(
      { bg: "#F0F0F0", platform: "#C8C8C8", blob: "#1478FF" },
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

drawWorld() {
  background(this.theme.bg);
  push();
  rectMode(CORNER);          // critical: undo any global rectMode(CENTER) [web:230]
  noStroke();

  for (const p of this.platforms) {
    p.update(); // Update moving platforms
    if (p.color) {
      fill(p.color);
    } else {
      fill(this.theme.platform);
    }
    rect(p.x, p.y, p.w, p.h); // x,y = top-left [web:234]
  }
  pop();
}
}
