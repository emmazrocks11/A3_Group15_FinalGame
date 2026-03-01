class Platform {
  constructor(x, y, w, h, color = null, options = {}) {
    this.baseX = x;
    this.baseY = y;
    this.x = x; 
    this.y = y;
    this.w = w; 
    this.h = h;
    this.color = color;
    
    // Movement options
    this.isMoving = options.isMoving || false;
    this.rangeX = options.rangeX || 0;
    this.rangeY = options.rangeY || 0;
    this.speed = options.speed || 0.02;
    this.offset = options.offset || 0;
  }

  update() {
    if (this.isMoving) {
      let t = frameCount * this.speed + this.offset;
      this.x = this.baseX + cos(t) * this.rangeX;
      this.y = this.baseY + sin(t) * this.rangeY;
    }
  }
}
