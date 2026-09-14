// ============================================================
// RENDERER CANVAS — Meteoritos, proyectiles, explosiones y debris
// ============================================================
// Migración híbrida: estas entidades dejan de ser nodos DOM (con
// filter: blur(), la operación CSS más cara) y se dibujan en un único
// <canvas>. Los sprites de meteorito se pre-renderizan una vez en un
// canvas offscreen y se cachean por (tamaño, cráter, ángulo de trail),
// de modo que el coste por frame de cada meteoro es un solo drawImage.
// Nave, skins, láser, escudo, horizontes, HUD y power-ups siguen en DOM.
// ============================================================

const FxCanvas = (function () {
  "use strict";

  let canvas = null;
  let ctx = null;
  let hbCanvas = null;
  let hbCtx = null;
  let ready = false;

  // Sprite cache: clave "size|crater|angleQ" -> { canvas, w, h, ox, oy }
  const spriteCache = new Map();
  const SPRITE_CACHE_LIMIT = 500; // PERF FIX: aumentado de 220 → 500 para reducir evicciones

  // Dimensiones del área de dibujo (coordenadas de juego).
  let W = GAME_WIDTH;
  let H = GAME_HEIGHT;

  // Capa de partículas (explosiones + debris de nave) gestionada aquí
  // para evitar miles de setTimeout por partícula.
  const particles = [];

  // Colores de la debris de la nave (igual que createShipDebris original).
  const DEBRIS_COLORS = ["#50e3c2", "#00bcd4", "#ffffff", "#ff4081"];

  // ----------------------------------------------------------
  // Inicialización
  // ----------------------------------------------------------
  function init() {
    if (ready) return;
    const stage = document.getElementById("stage");
    if (!stage) return;
    // Reutilizar el <canvas> declarado en el HTML si existe; si no, crear uno.
    canvas = document.getElementById("fx-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "fx-canvas";
      stage.appendChild(canvas);
    }
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    // Detrás de jugador / power-ups / láser; por delante de starfield y horizontes.
    if (!canvas.parentNode) stage.appendChild(canvas);
    ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    W = GAME_WIDTH;
    H = GAME_HEIGHT;

    // Canvas overlay para hitboxes (encima de jugador, power-ups, etc.)
    hbCanvas = document.getElementById("hitbox-canvas");
    if (!hbCanvas) {
      hbCanvas = document.createElement("canvas");
      hbCanvas.id = "hitbox-canvas";
      stage.appendChild(hbCanvas);
    }
    hbCanvas.width = GAME_WIDTH;
    hbCanvas.height = GAME_HEIGHT;
    hbCanvas.style.cssText = "position:absolute;left:0;top:0;width:430px;height:480px;pointer-events:none;z-index:9999";
    hbCtx = hbCanvas.getContext("2d");
    if (!hbCtx) return;

    ready = true;
  }

  function isReady() { return ready; }

  // ¿Modo "sin luces"? Replicamos .no-lights: sin glow/blur en entidades.
  function lightsOff() {
    return document.body.classList.contains("no-lights");
  }

  // ----------------------------------------------------------
  // Limpieza de frame
  // ----------------------------------------------------------
  function clear() {
    if (!ready) return;
    ctx.clearRect(0, 0, W, H);
    hbCtx.clearRect(0, 0, W, H);
  }

  // Se llama al pausar / ocultar entidades para que no quede "basura".
  function wipe() {
    particles.length = 0;
    _debugRects.length = 0;
    if (ready) {
      ctx.clearRect(0, 0, W, H);
      if (hbCtx) hbCtx.clearRect(0, 0, W, H);
    }
  }

  // ----------------------------------------------------------
  // Sprite de meteoro pre-renderizado (replica popup.css .meteor)
  // ----------------------------------------------------------
  // Cuerpo: 3 radiales
  //   radial(circle at 30% 25%, #fff7e1, transparent 55%)
  //   radial(circle at 70% 75%, #ffb36b, transparent 60%)
  //   radial(circle at 50% 50%, #b15b36, #4b2b24)
  // Glow externo: box-shadow 0 0 13px rgba(255,184,108,.65), 0 0 24px rgba(255,200,140,.75)
  // ::before (highlight superior): radial blanco, blur 1.8, opacidad .85
  // ::after (trail): gradiente vertical naranja, blur 5, opacidad .85, rotado por --trail-angle
  // cráter (crater-1/2/3): radial negro semitransparente en distintas posiciones
  //
  // trailAngle llega en grados. Lo cuantizamos a enteros para agrupar sprites.
  function buildMeteorSprite(size, crater, trailAngleDeg) {
    const s = Math.max(8, Math.round(size / 2) * 2);
    const angleQ = Math.round(trailAngleDeg / 5) * 5;
    const key = `${s}|${crater}|${angleQ}`;
    const cached = spriteCache.get(key);
    if (cached) return cached;

    const trailH = s * 3.0;
    const pad = Math.ceil(s * 0.2);
    const dim = Math.ceil(s * 7 + pad * 2);
    const totalW = dim;
    const totalH = dim;

    const off = document.createElement("canvas");
    off.width = Math.ceil(totalW);
    off.height = Math.ceil(totalH);
    const o = off.getContext("2d");
    const cx = totalW / 2;
    const bodyCx = cx;
    const bodyCy = totalH / 2;
    const bodyTop = bodyCy - s / 2;

    const noLights = lightsOff();

    if (!noLights) {
      // --- Estela exterior: halo que sale desde el centro del meteorito ---
      o.save();
      o.translate(bodyCx, bodyCy);
      o.rotate((angleQ * Math.PI) / 180);
      o.translate(-bodyCx, -bodyCy);
      const eg = o.createRadialGradient(bodyCx, bodyCy, 0, bodyCx, bodyCy, trailH);
      eg.addColorStop(0, "rgba(255,180,60,0.12)");
      eg.addColorStop(0.2, "rgba(255,120,30,0.07)");
      eg.addColorStop(0.4, "rgba(255,60,10,0.03)");
      eg.addColorStop(0.55, "rgba(255,20,0,0)");
      eg.addColorStop(1, "rgba(255,20,0,0)");
      o.fillStyle = eg;
      o.beginPath();
      o.arc(bodyCx, bodyCy - trailH * 0.3, trailH * 0.85, 0, Math.PI * 2);
      o.fill();
      o.restore();

      // --- Estela núcleo: cono desde el centro, termina en 1/4 del ancho ---
      o.save();
      o.translate(bodyCx, bodyCy);
      o.rotate((angleQ * Math.PI) / 180);
      o.translate(-bodyCx, -bodyCy);
      const en = o.createLinearGradient(0, bodyCy, 0, bodyCy - trailH);
      en.addColorStop(0, "rgba(255,255,200,0.35)");
      en.addColorStop(0.2, "rgba(255,220,80,0.25)");
      en.addColorStop(0.4, "rgba(255,140,30,0.15)");
      en.addColorStop(0.6, "rgba(255,70,10,0.08)");
      en.addColorStop(0.8, "rgba(255,30,5,0.03)");
      en.addColorStop(1, "rgba(255,20,0,0)");
      o.fillStyle = en;
      o.beginPath();
      const tipHalf = s / 8;
      o.moveTo(bodyCx - s / 2, bodyCy);
      o.lineTo(bodyCx + s / 2, bodyCy);
      o.lineTo(bodyCx + tipHalf, bodyCy - trailH);
      o.lineTo(bodyCx - tipHalf, bodyCy - trailH);
      o.closePath();
      o.fill();
      o.restore();

      // --- Partículas/Chispas dispersas en la estela ---
      o.save();
      o.translate(bodyCx, bodyCy);
      o.rotate((angleQ * Math.PI) / 180);
      o.translate(-bodyCx, -bodyCy);
      for (let i = 0; i < 5; i++) {
        const t = 0.05 + Math.random() * 0.5;
        const dy = trailH * t;
        const dx = (Math.random() - 0.5) * s * 0.9 * (1 - t * 0.4);
        const rs = 1 + Math.random() * 2;
        o.globalAlpha = 0.3 - t * 0.45;
        o.fillStyle = Math.random() > 0.5 ? "#ffeb3b" : "#ff8c00";
        o.beginPath();
        o.arc(bodyCx + dx, bodyCy - dy, rs, 0, Math.PI * 2);
        o.fill();
      }
      o.restore();
    }

    // --- Cuerpo sólido (3 radiales como original) ---
    o.save();
    o.beginPath();
    o.arc(bodyCx, bodyCy, s / 2, 0, Math.PI * 2);
    o.clip();

    const g0 = o.createRadialGradient(bodyCx, bodyCy, s * 0.05, bodyCx, bodyCy, s / 2);
    g0.addColorStop(0, "#d98a52");
    g0.addColorStop(1, "#8a4631");
    o.fillStyle = g0;
    o.fillRect(bodyCx - s / 2, bodyCy - s / 2, s, s);

    const g1 = o.createRadialGradient(
      bodyCx + s * 0.2, bodyCy + s * 0.25, s * 0.02,
      bodyCx + s * 0.2, bodyCy + s * 0.25, s * 0.5
    );
    g1.addColorStop(0, "rgba(255,200,140,0.95)");
    g1.addColorStop(0.6, "rgba(255,200,140,0)");
    o.fillStyle = g1;
    o.fillRect(bodyCx - s / 2, bodyCy - s / 2, s, s);

    const g2 = o.createRadialGradient(
      bodyCx - s * 0.2, bodyCy - s * 0.25, s * 0.02,
      bodyCx - s * 0.2, bodyCy - s * 0.25, s * 0.45
    );
    g2.addColorStop(0, "rgba(255,247,225,0.95)");
    g2.addColorStop(0.55, "rgba(255,247,225,0)");
    o.fillStyle = g2;
    o.fillRect(bodyCx - s / 2, bodyCy - s / 2, s, s);

    o.restore();

    // --- Highlight superior (blanco difuminado) ---
    if (!noLights) {
      o.save();
      o.filter = "blur(0.6px)";
      const hg = o.createRadialGradient(bodyCx, bodyTop + s * 0.05, 0, bodyCx, bodyTop + s * 0.05, s * 0.35);
      hg.addColorStop(0, "rgba(255,255,200,0.8)");
      hg.addColorStop(1, "rgba(255,255,200,0)");
      o.fillStyle = hg;
      o.globalAlpha = 0.85;
      o.beginPath();
      o.ellipse(bodyCx, bodyTop + s * 0.05, s * 0.32, s * 0.16, 0, 0, Math.PI * 2);
      o.fill();
      o.filter = "none";
      o.restore();
    }

    // --- Cráter ---
    let cCx = bodyCx, cCy = bodyCy, cR = s * 0.15;
    if (crater === 1) { cCx = bodyCx + s * 0.15; cCy = bodyCy - s * 0.05; cR = s * 0.15; }
    else if (crater === 2) { cCx = bodyCx - s * 0.15; cCy = bodyCy + s * 0.05; cR = s * 0.13; }
    else if (crater === 3) { cCx = bodyCx; cCy = bodyCy; cR = s * 0.10; }
    const crg = o.createRadialGradient(cCx, cCy, 0, cCx, cCy, cR);
    crg.addColorStop(0, "rgba(0,0,0,0.6)");
    crg.addColorStop(1, "rgba(0,0,0,0)");
    o.save();
    o.globalAlpha = 0.7;
    o.fillStyle = crg;
    o.beginPath();
    o.arc(cCx, cCy, cR, 0, Math.PI * 2);
    o.fill();
    o.restore();

    const sprite = { canvas: off, w: totalW, h: totalH, ox: cx, oy: bodyCy };
    if (spriteCache.size >= SPRITE_CACHE_LIMIT) {
      const firstKey = spriteCache.keys().next().value;
      spriteCache.delete(firstKey);
    }
    spriteCache.set(key, sprite);
    return sprite;
  }

  // ----------------------------------------------------------
  // Dibujo de entidades
  // ----------------------------------------------------------
  function drawMeteor(m) {
    if (!ready || !m || typeof m.size !== 'number' || typeof m.x !== 'number') return;
    const sprite = m.sprite || (m.sprite = buildMeteorSprite(m.size, m.crater, m.trailAngle));
    // El sprite se ancla por el centro del cuerpo (oy); el trail va debajo.
    const dx = (m.x + m.size / 2) - sprite.ox;
    const dy = (m.y + m.size / 2) - sprite.oy;
    ctx.drawImage(sprite.canvas, dx, dy);
  }

  function drawProjectile(p) {
    if (!ready) return;
    let x = p.x, y = p.y;
    const beta = p.beta;
    // Alto VISUAL (más corto que el hitbox de colisión, que sigue siendo p.height).
    // El proyectil se ancla en la punta (y) y se extiende hacia abajo.
    const visH = p.drawHeight || 30;
    ctx.save();
    // Rotación para proyectiles angulados (multilaser beta)
    if (p.angle !== undefined) {
      const cx = x + p.width / 2;
      const cy = y + visH / 2;
      ctx.translate(cx, cy);
      ctx.rotate(p.angle);
      ctx.translate(-cx, -cy);
    }
    if (!lightsOff()) {
      // Halo de luz que rodea al proyectil (da el aspecto de emitir luz propia).
      // Se dibuja un resplandor radial detrás del cuerpo del láser.
      const glowCx = x + p.width / 2;
      const glowCy = y + visH / 2;
      const glowR = Math.max(p.width, visH) * 0.2 + 2;
      const midColor = beta ? "rgba(186,104,200,0.45)" : "rgba(255,87,34,0.45)";
      const outColor = beta ? "rgba(186,104,200,0)" : "rgba(255,87,34,0)";
      const glowGrad = ctx.createRadialGradient(glowCx, glowCy, 0, glowCx, glowCy, glowR);
      glowGrad.addColorStop(0, midColor);
      glowGrad.addColorStop(1, outColor);
      ctx.save();
      ctx.filter = "blur(2px)";
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.rect(x - glowR, y - glowR, p.width + glowR * 2, visH + glowR * 2);
      ctx.fill();
      ctx.filter = "none";
      ctx.restore();
    }
    const grad = ctx.createLinearGradient(x, y, x, y + visH);
    if (beta) {
      grad.addColorStop(0, "#e1bee7");
      grad.addColorStop(1, "#9c27b0");
    } else {
      grad.addColorStop(0, "#ffff00");
      grad.addColorStop(1, "#ff5722");
    }
    ctx.fillStyle = grad;
    // Esquinas redondeadas como border-radius:4px
    const r = 4;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + p.width - r, y);
    ctx.quadraticCurveTo(x + p.width, y, x + p.width, y + r);
    ctx.lineTo(x + p.width, y + visH - r);
    ctx.quadraticCurveTo(x + p.width, y + visH, x + p.width - r, y + visH);
    ctx.lineTo(x + r, y + visH);
    ctx.quadraticCurveTo(x, y + visH, x, y + visH - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Colores de hitbox por tipo de entidad.
  const HITBOX_COLORS = {
    player:   "rgba(0,180,255,0.95)",
    laser:    "rgba(0,180,255,0.95)",
    meteor:   "rgba(255,40,40,0.95)",
    powerup:  "rgba(0,255,80,0.95)"
  };

  // Hitboxes de depuración (sustituye a los nodos .hitbox-debug).
  function drawDebugRect(x, y, w, h, color) {
    if (!ready) return;
    hbCtx.save();
    hbCtx.strokeStyle = color || "rgba(0,255,0,0.95)";
    hbCtx.lineWidth = 3;
    hbCtx.strokeRect(x, y, w, h);
    hbCtx.restore();
  }

  // ----------------------------------------------------------
  // Cola de hitboxes de depuración (se dibujan encima de todo)
  // ----------------------------------------------------------
  const _debugRects = [];

  function queueDebugRect(x, y, w, h, color) {
    _debugRects.push(x, y, w, h, color);
  }

  function drawDebugRects() {
    if (!ready || _debugRects.length === 0) return;
    for (let i = 0; i < _debugRects.length; i += 5) {
      drawDebugRect(_debugRects[i], _debugRects[i+1], _debugRects[i+2], _debugRects[i+3], _debugRects[i+4]);
    }
    _debugRects.length = 0;
  }

  // ----------------------------------------------------------
  // Partículas: explosiones + debris
  // ----------------------------------------------------------
  function spawnExplosion(x, y, size) {
    // Una explosión = varios anillos concéntricos + chispas.
    const cx = x + size / 2;
    const cy = y + size / 2;
    particles.push({
      type: "ring", x: cx, y: cy, r0: size * 0.15, r1: size * 1.0,
      life: 0, ttl: 500, color0: "#ffffff", color1: "#ffff00", color2: "#ff0000"
    });
    if (!lightsOff()) {
      particles.push({
        type: "ring", x: cx, y: cy, r0: size * 0.1, r1: size * 1.4,
        life: 0, ttl: 500, color0: "#ffd27f", color1: "#ff8c00", color2: "rgba(255,140,0,0)", glow: true
      });
    }
    // Chispas
    const sparks = lightsOff() ? 4 : 8;
    for (let i = 0; i < sparks; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = size * (0.6 + Math.random() * 1.2);
      particles.push({
        type: "spark", x: cx, y: cy,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0, ttl: 400 + Math.random() * 200,
        size: 1 + Math.random() * 2.5,
        color: Math.random() < 0.5 ? "#ffeb3b" : "#ff5722"
      });
    }
  }

  function spawnDebris(x, y) {
    // Más fragmentos (20) y con más alcance (velocidades mayores).
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 90;
      particles.push({
        type: "debris", x, y,
        vx: Math.cos(a) * dist / 0.8, vy: Math.sin(a) * dist / 0.8,
        rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 8,
        size: 4 + Math.random() * 6,
        life: 0, ttl: 800,
        color: DEBRIS_COLORS[Math.floor(Math.random() * DEBRIS_COLORS.length)]
      });
    }
  }

  function spawnLandingDust() {
    for (let i = 0; i < 8; i++) {
      const size = 20 + Math.random() * 30;
      const x = (GAME_WIDTH / 2) - 60 + Math.random() * 120;
      const y = 110 + Math.random() * 20;
      particles.push({
        type: "dust", x, y, r0: size * 0.2, r1: size,
        life: 0, ttl: 500 + Math.random() * 500,
        color0: "rgba(255,255,255,0.5)", color1: "rgba(255,255,255,0)"
      });
    }
  }

  function updateParticles(dtMs) {
    const dt = dtMs / 1000;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dtMs;
      if (p.life >= p.ttl) { particles.splice(i, 1); continue; }
      if (p.type === "spark" || p.type === "debris") {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.type === "debris") {
          // fricción ligera como en la transición CSS original.
          p.vx *= 0.96; p.vy *= 0.96;
          p.rot += p.vr * dt;
        } else {
          p.vy += 60 * dt; // leve gravedad a las chispas
        }
      }
    }
  }

  function drawParticles() {
    if (!ready) return;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const t = p.life / p.ttl; // 0..1
      if (p.type === "ring" || p.type === "dust") {
        const r = p.r0 + (p.r1 - p.r0) * t;
        const alpha = 1 - t;
        ctx.save();
        ctx.globalAlpha = alpha;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        if (p.type === "ring") {
          g.addColorStop(0, p.color0);
          g.addColorStop(0.5, p.color1);
          g.addColorStop(1, p.color2);
        } else {
          g.addColorStop(0, p.color0);
          g.addColorStop(1, p.color1);
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.type === "spark") {
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.restore();
      } else if (p.type === "debris") {
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    }
  }

  function hasParticles() { return particles.length > 0; }

  // ----------------------------------------------------------
  // API pública
  // ----------------------------------------------------------
  return {
    init, isReady,
    clear, wipe,
    drawMeteor, drawProjectile, drawDebugRect,
    queueDebugRect, drawDebugRects,
    spawnExplosion, spawnDebris, spawnLandingDust,
    updateParticles, drawParticles, hasParticles,
    buildMeteorSprite,
    getCtx: () => ctx,
    HITBOX_COLORS,
    // Exposición útil para tests / depuración.
    _spriteCount: () => spriteCache.size
  };
})();
