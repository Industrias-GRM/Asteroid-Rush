// ============================================================
// KEYCHAIN — Físicas Verlet + renderizado Canvas (7 segmentos)
// ============================================================
// Cortes Y: 41, 57, 73, 88, 102, 113 | Fixation: Y=15
// 8 puntos Verlet: [0]=ancla, [1-5]=cadena, [6-7]=anillo rígido

class Keychain {
  constructor() {
    this.numPoints = 8;
    this.gravity = 1.2;
    this.friction = 0.91;
    this.iterations = 15;
    this.fixationY = 15;

    // Cortes en Y de la imagen (define bordes de segmentos)
    this.cuts = [0, 41, 57, 73, 88, 102, 113];

    this.segmentHeights = [];
    this.segmentYStart = [];

    // Puntos Verlet
    this.points = [];
    for (let i = 0; i < this.numPoints; i++) {
      this.points.push({
        x: 0, y: i * 10,
        oldX: 0, oldY: i * 10
      });
    }

    this.imageWidth = 150;
    this.imageHeight = 195;
    this.lastShipX = 0;
    this.holdTimer = 0;
    this.gravityRamp = 1;
    this.initialized = false;
    this.image = null;
    this.imageLoaded = false;
    this.segmentDistances = [];

    // Distancia fija del anillo (puntos 6-7)
    this.ringDist = 10;
  }

  loadImage(src) {
    this.imageLoaded = false;
    this.image = new Image();
    this.image.onload = () => {
      this.imageLoaded = true;
      this.imageWidth = this.image.naturalWidth || 150;
      this.imageHeight = this.image.naturalHeight || 195;
      this._computeSegments();
    };
    this.image.src = src;
  }

  _computeSegments() {
    const bounds = this.cuts.concat([this.imageHeight]);
    const scale = 33 / this.imageWidth;
    this.segmentHeights = [];
    this.segmentYStart = [];
    this.segmentDistances = [];
    for (let i = 0; i < bounds.length - 1; i++) {
      this.segmentYStart.push(bounds[i]);
      const h = (bounds[i + 1] - bounds[i]) * scale;
      this.segmentHeights.push(h);
      this.segmentDistances.push(h);
    }
    // Anillo usa la última distancia escalada
    this.ringDist = this.segmentDistances[this.segmentDistances.length - 1];
    // Reposicionar puntos según nuevas distancias
    for (let i = 1; i < this.points.length; i++) {
      const d = this.segmentDistances[Math.min(i - 1, this.segmentDistances.length - 1)];
      this.points[i].y = this.points[0].y + d;
      this.points[i].oldY = this.points[i].y;
    }
  }

  setAnchor(shipX, shipY) {
    this.points[0].x = shipX;
    this.points[0].y = shipY;
    this.points[0].oldX = shipX;
    this.points[0].oldY = shipY;
  }

  update(shipX) {
    const staticPos = (i) => {
      const d = this.segmentDistances[Math.min(i - 1, this.segmentDistances.length - 1)] || 10;
      this.points[i].x = this.points[i - 1].x;
      this.points[i].y = this.points[i - 1].y + d;
      this.points[i].oldX = this.points[i].x;
      this.points[i].oldY = this.points[i].y;
    };

    const noSmooth = document.body.classList.contains("no-smooth");
    if (noSmooth) {
      for (let i = 1; i < this.points.length; i++) staticPos(i);
      this.initialized = false;
      return;
    }

    // Hold period: keep chain static for ~0.1s after physics starts
    if (this.holdTimer > 0) {
      for (let i = 1; i < this.points.length; i++) staticPos(i);
      this.holdTimer--;
      this.lastShipX = shipX;
      return;
    }

    if (!this.initialized) {
      this.lastShipX = shipX;
      this.initialized = true;
      this.holdTimer = 6;
      this.gravityRamp = 0;
      for (let i = 1; i < this.points.length; i++) staticPos(i);
      return;
    }

    const dx = shipX - this.lastShipX;
    this.lastShipX = shipX;

    const baseGravity = fastModeActive ? this.gravity * 2.2 : this.gravity;
    this.gravityRamp = Math.min(this.gravityRamp + 0.15, 1);

    // Verlet integration
    for (let i = 1; i < this.points.length; i++) {
      const p = this.points[i];
      const vx = (p.x - p.oldX) * this.friction;
      const vy = (p.y - p.oldY) * this.friction;

      p.oldX = p.x;
      p.oldY = p.y;

      p.x += vx;
      p.y += vy;
      p.y += baseGravity * this.gravityRamp;
      p.x += dx * 0.08;
    }

    // Restricciones de distancia
    for (let n = 0; n < this.iterations; n++) {
      for (let i = 0; i < this.points.length - 1; i++) {
        const p1 = this.points[i];
        const p2 = this.points[i + 1];

        const ddx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(ddx * ddx + dy * dy);
        if (dist === 0) continue;

        const target = this.segmentDistances
          ? (this.segmentDistances[Math.min(i, this.segmentDistances.length - 1)] || 10)
          : 10;
        const error = (dist - target) / dist;

        if (i === 0) {
          p2.x -= ddx * error;
          p2.y -= dy * error;
        } else {
          p1.x += ddx * error * 0.5;
          p1.y += dy * error * 0.5;
          p2.x -= ddx * error * 0.5;
          p2.y -= dy * error * 0.5;
        }
      }
    }

    // Clamp de distancia máxima: los puntos no pueden separarse más allá del objetivo
    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      const ddx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(ddx * ddx + dy * dy);
      const target = this.segmentDistances
        ? (this.segmentDistances[Math.min(i, this.segmentDistances.length - 1)] || 10)
        : 10;
      if (dist > target) {
        const nx = ddx / dist;
        const ny = dy / dist;
        if (i === 0) {
          p2.x = p1.x + nx * target;
          p2.y = p1.y + ny * target;
        } else {
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          p1.x = midX - nx * target / 2;
          p1.y = midY - ny * target / 2;
          p2.x = midX + nx * target / 2;
          p2.y = midY + ny * target / 2;
        }
      }
    }

    // Anillo rígido: mantener distancia entre 6-7 pero permitir rotación
    if (this.points.length >= 8 && this.ringDist) {
      const p6 = this.points[6];
      const p7 = this.points[7];
      const ddx = p7.x - p6.x;
      const dy = p7.y - p6.y;
      const dist = Math.sqrt(ddx * ddx + dy * dy);
      if (dist > 0) {
        const midX = (p6.x + p7.x) / 2;
        const midY = (p6.y + p7.y) / 2;
        const half = this.ringDist / 2;
        const nx = ddx / dist;
        const ny = dy / dist;
        p6.x = midX - nx * half;
        p6.y = midY - ny * half;
        p7.x = midX + nx * half;
        p7.y = midY + ny * half;
      }
    }
  }

  draw(ctx) {
    if (!this.imageLoaded || !this.image) return;
    if (!this.segmentHeights.length) this._computeSegments();

    const total = this.segmentHeights.length;
    const scale = 33 / this.imageWidth;
    const drawW = 33;

    // Asegurar render nítido sin parpadeo por gaps entre segmentos
    const prevSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;

    for (let i = 0; i < total; i++) {
      const idx1 = Math.min(i, this.points.length - 1);
      const idx2 = Math.min(i + 1, this.points.length - 1);
      const p1 = this.points[idx1];
      const p2 = this.points[idx2];

      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) - Math.PI / 2;
      const segH = this.segmentHeights[i];
      const srcY = this.segmentYStart[i];

      ctx.save();
      ctx.translate(p1.x, p1.y);
      ctx.rotate(angle);

      // +1px de solape vertical para tapar huecos por errores de coma flotante/rotación
      ctx.drawImage(
        this.image,
        0, srcY,
        this.imageWidth, segH / scale + 0.8,
        -drawW / 2, -0.5,
        drawW, segH + 1
      );

      ctx.restore();
    }
    ctx.imageSmoothingEnabled = prevSmoothing;
  }

  reset() {
    for (let i = 0; i < this.numPoints; i++) {
      const d = (this.segmentDistances && this.segmentDistances[i - 1]) || 10;
      this.points[i].x = 0;
      this.points[i].y = i * d;
      this.points[i].oldX = 0;
      this.points[i].oldY = i * d;
    }
    this.initialized = false;
  }

  destroy() {
    this.image = null;
    this.imageLoaded = false;
    this.reset();
  }
}

let keychain = null;
