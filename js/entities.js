// ============================================================
// POWER-UPS
// ============================================================

function spawnPowerUp() {
  powerUpPityCounter = 0;
  const powerEl = document.createElement("div");
  const currentLevel = Math.floor(score / 1000) + 1;

  // --- Potenciadores BETA elegibles (vacío si el modo beta está apagado) ---
  let betaEligible = null;
  if (betaModeActive && betaPowerupsEnabled) {
    betaEligible = BETA_POWERUPS.filter(p => betaFlags[p.state] && currentLevel >= p.unlockLevel);
    if (!betaEligible.length) betaEligible = null;
  }

  // --- Selección de tipo por peso ---
  let wShield = 0.4, wLaser = 0.4, wSlow = 0.2;
  if (meteors.length > 5)    { wShield = 0.15; wLaser = 0.55; wSlow = 0.3; }
  if (currentLevel > 200)    { wShield = 0.45; wLaser = 0.05; wSlow = 0.5; }
  if (shieldActive) wShield *= 0.5;
  else              wShield *= 2.0;

  // Cada beta elegible aporta su peso (mismo que un powerup normal).
  const betaWeight = betaEligible ? betaEligible.length * 0.4 : 0;
  const total = wShield + wLaser + wSlow + betaWeight;
  const r = Math.random() * total;
  let type;
  let betaDef = null;

  if (currentLevel < LASER_UNLOCK_LEVEL) {
    // Laser aún no desbloqueado: el hueco del laser va al beta (si hay) o al shield.
    if (betaEligible && r < betaWeight) {
      betaDef = betaEligible[Math.floor(Math.random() * betaEligible.length)];
    } else {
      type = "shield";
    }
  } else if (betaEligible && r < betaWeight) {
    // Toca un potenciador beta.
    betaDef = betaEligible[Math.floor(Math.random() * betaEligible.length)];
  } else {
    // Powerup normal (mismas probabilidades relativas que siempre).
    let rr = betaEligible ? (r - betaWeight) : r;
    type = rr < wShield ? "shield" : rr < wShield + wLaser ? "laser" : (currentLevel >= SLOW_UNLOCK_LEVEL ? "slow" : "shield");
  }

  if (betaDef) {
    powerEl.classList.add("powerup", "beta-powerup", "beta-" + betaDef.id);
    powerEl.textContent = betaDef.icon;
    type = betaDef.id;
  } else {
    powerEl.classList.add("powerup");
  }

  powerEl.dataset.type = type;
  const size = POWERUP_SIZE;
  const x = Math.random() * (GAME_WIDTH - size);
  powerEl.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${-size-10}px;`;
  stageEl.appendChild(powerEl);
  powerups.push({ x, y: -size - 10, size, speed: BASE_METEOR_SPEED * 0.7 * difficultyFactor, el: powerEl, type });
}

function applyPowerUp(type) {
  sessionPowerupsCollected++;
  const fx = playerX + PLAYER_WIDTH / 2, fy = GAME_HEIGHT - 80;
  if (type === "shield") {
    sessionShieldsCollected++;
    shieldActive = true; shieldEndTime = performance.now() + SHIELD_DURATION;
    shieldEl.classList.add("active"); playShieldActivated();
    spawnFloatingText(fx, fy, i18n.t("powerup_shield"), "#4caf50", "18px");
  } else if (type === "laser") {
    sessionLasersCollected++;
    laserActive = true; laserEndTime = performance.now() + LASER_DURATION;
    if (!laserBeamEl) { laserBeamEl = document.createElement("div"); laserBeamEl.className = "laser-beam"; laserContainerEl.appendChild(laserBeamEl); }
    laserBeamEl.style.left   = playerX + PLAYER_WIDTH / 2 + "px";
    laserBeamEl.style.height = (GAME_HEIGHT - 30 - PLAYER_HEIGHT) + "px";
    laserBeamEl.classList.add("active"); playLaser();
    spawnFloatingText(fx, fy, i18n.t("powerup_laser"), "#f44336", "18px");
  } else if (type === "slow") {
    sessionSlowsCollected++;
    if (typeof tutorialGameActive !== 'undefined' && tutorialGameActive) {
      // No relentizar durante tutorial powerups, solo marcar para avanzar
      try { tutorialSlowCollected = true; } catch(e) {}
      spawnFloatingText(fx, fy, i18n.t("powerup_slow"), "#2196f3", "18px");
    } else {
      slowSkipIntro = slowActive; slowActive = true; slowElapsedTime = 0;
      playSlowActivated();
      spawnFloatingText(fx, fy, i18n.t("powerup_slow"), "#2196f3", "18px");
    }
  } else {
    // --- Potenciadores experimentales BETA ---
    applyBetaPowerUp(type, fx, fy);
  }
}

// Efectos de los 5 potenciadores experimentales.
function applyBetaPowerUp(type, fx, fy) {
  const def = BETA_POWERUPS.find(p => p.id === type);
  if (!def) return;
  const now = performance.now();
  const cx = playerX + PLAYER_WIDTH / 2;
  switch (type) {
    case "bomb": {
      let destroyed = 0;
      let bonusScore = 0;
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        createExplosion(m.x, m.y, m.size);
        bonusScore += 50;
        spawnFloatingText(m.x + m.size / 2, m.y, "+50", "#ffeb3b", "12px");
        meteors.splice(i, 1);
        destroyed++;
      }
      if (bonusScore > 0) addScorePoints(bonusScore);
      sessionAsteroidsDestroyed += destroyed;
      spawnFloatingText(cx, fy, i18n.t(def.i18n) + " (" + destroyed + ")", def.color, "18px");
      break;
    }
    case "multilaser": {
      const baseX = playerX + PLAYER_WIDTH / 2;
      const baseY = GAME_HEIGHT - 30 - PLAYER_HEIGHT;
      const angles = [40, 20, 0, -20, -40];
      const speed = PROJECTILE_SPEED;
      for (let k = 0; k < angles.length; k++) {
        const rad = angles[k] * Math.PI / 180;
        const vx = Math.sin(rad) * speed;
        const vy = -Math.cos(rad) * speed;
        projectiles.push({ x: baseX, y: baseY, width: 8, height: 80, drawHeight: 38, beta: true, vx, vy, angle: rad });
      }
      playLaser();
      spawnFloatingText(cx, fy, i18n.t(def.i18n), def.color, "18px");
      break;
    }
    case "freeze": {
      betaFreezeEndTime = now + BETA_FREEZE_DURATION;
      let overlay = document.getElementById("beta-freeze-overlay");
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "beta-freeze-overlay";
        overlay.style.cssText = "position:absolute;inset:0;background:rgba(0,100,255,0.35);pointer-events:none;z-index:1000;";
        containerEl?.appendChild(overlay);
      }
      overlay.style.display = "block";
      playSlowActivated();
      spawnFloatingText(cx, fy, i18n.t(def.i18n), def.color, "18px");
      break;
    }
    case "ghost": {
      betaGhostEndTime = now + BETA_GHOST_DURATION;
      immunityEndTime = Math.max(immunityEndTime, now + BETA_GHOST_DURATION);
      if (playerEl) {
        playerEl.style.opacity = "0.35";
        playerEl.classList.remove("flashing");
      }
      spawnFloatingText(cx, fy, i18n.t(def.i18n), def.color, "18px");
      break;
    }
    case "magnet": {
      betaMagnetEndTime = now + BETA_MAGNET_DURATION;
      spawnFloatingText(cx, fy, i18n.t(def.i18n), def.color, "18px");
      break;
    }
  }
}

function updatePowerUps(effectiveDelta) {
  const dt        = effectiveDelta / 1000;
  const speedFactor = calculateSlowSpeedFactor();
  const shipRect  = getPlayerCollisionRect();
  const now = performance.now();
  const magnetActive = betaModeActive && now < betaMagnetEndTime;
  const playerCx = playerX + PLAYER_WIDTH / 2;
  const playerCy = GAME_HEIGHT - 30 - PLAYER_HEIGHT / 2;
  const toRemove  = [];
  powerups.forEach((p, i) => {
    p.y += p.speed * speedFactor * dt;
    // Imán BETA: atrae los potenciadores hacia la nave.
    if (magnetActive) {
      const dx = playerCx - (p.x + p.size / 2);
      const dy = playerCy - (p.y + p.size / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const pull = 600 * dt;
      p.x += (dx / dist) * pull;
      p.y += (dy / dist) * pull;
    }
    if (p.y > GAME_HEIGHT + p.size) { try { p.el.remove(); } catch(e) {} toRemove.push(i); return; }
    p.el.style.top = p.y + "px";
    if (magnetActive) p.el.style.left = p.x + "px";
    const pSize = p.size * POWERUP_COLLISION_FACTOR;
    const pLeft = p.x + (p.size - pSize) / 2;
    const pTop  = p.y + (p.size - pSize) / 2;
    if (showHitboxes) {
      FxCanvas.queueDebugRect(pLeft, pTop, pSize, pSize, FxCanvas.HITBOX_COLORS.powerup);
    }
    const overlap = !isDying && !(pLeft+pSize<=shipRect.left || pLeft>=shipRect.right || pTop+pSize<=shipRect.top || pTop>=shipRect.bottom);
    if (overlap) { applyPowerUp(p.type); try { p.el.remove(); } catch(e) {} toRemove.push(i); }
  });
  for (let i = toRemove.length - 1; i >= 0; i--) powerups.splice(toRemove[i], 1);
  if (shieldActive && now > shieldEndTime) { shieldActive = false; shieldEl.classList.remove("active"); }
  if (laserActive  && now > laserEndTime)  { laserActive  = false; if (laserBeamEl) laserBeamEl.classList.remove("active"); }
  // Freeze expiry
  if (betaFreezeEndTime && now >= betaFreezeEndTime) {
    betaFreezeEndTime = 0;
    const overlay = document.getElementById("beta-freeze-overlay");
    if (overlay) overlay.style.display = "none";
  }
  // Ghost expiry
  if (betaGhostEndTime && now >= betaGhostEndTime) {
    betaGhostEndTime = 0;
    if (playerEl) playerEl.style.opacity = "";
  }
}

// ============================================================
// PROYECTILES (AUTO-LASER)
// ============================================================

let lastAutoChargePercent = -1;

function spawnAutoLaser() {
  sessionLaserFiredCount++;
  const width = 8;
  const x = playerX + PLAYER_WIDTH / 2 - width / 2;
  const y = GAME_HEIGHT - 30 - PLAYER_HEIGHT;
  // Sin nodo DOM: el proyectil se dibuja en el canvas.
  // width = ancho visual y de colisión; height = alto de colisión (80);
  // drawHeight = alto visual (38px, un pelín más largo que el CSS original de 30px).
  projectiles.push({ x, y, width, height: 80, drawHeight: 38, beta: false });
}

function updateProjectiles(effectiveDelta) {
  const dt = effectiveDelta / 1000;
  const toRemoveProj = [];
  if (betaFreezeEndTime && performance.now() < betaFreezeEndTime) return;
  projectiles.forEach((p, pIndex) => {
    if (p.vx !== undefined) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    } else {
      p.y -= PROJECTILE_SPEED * dt;
    }
    if (p.y < -80 || p.y > GAME_HEIGHT + 80 || p.x < -80 || p.x > GAME_WIDTH + 80) { toRemoveProj.push(pIndex); return; }
    if (showHitboxes) {
      const relativeStep = (PROJECTILE_SPEED + (BASE_METEOR_SPEED * difficultyFactor)) * dt;
      FxCanvas.queueDebugRect(p.x, p.y, p.width, p.height + relativeStep, FxCanvas.HITBOX_COLORS.laser);
    }
    for (let mIndex = 0; mIndex < meteors.length; mIndex++) {
      const m = meteors[mIndex];
      const relativeStep = (PROJECTILE_SPEED + (m.speed || 0)) * dt;
      if (p.x < m.x+m.size && p.x+p.width > m.x && p.y < m.y+m.size && p.y+p.height+relativeStep > m.y) {
        sessionAsteroidsDestroyed++;
        createExplosion(m.x, m.y, m.size);
        meteors.splice(mIndex, 1);
        toRemoveProj.push(pIndex);
        mIndex--;
        spawnFloatingText(m.x + m.size/2, m.y, "+50", "#ffeb3b");
        addScorePoints(50);
        playLaser(); break;
      }
    }
  });
  // Fix #10: deduplicar índices para no borrar proyectil equivocado
  const uniq = [...new Set(toRemoveProj)].sort((a,b)=>b-a);
  for (let i = 0; i < uniq.length; i++) projectiles.splice(uniq[i], 1);
}

function updateAutoShootProgress(timestamp) {
  if (!autoChargeFillEl) return;
  const shootInterval = fastModeActive ? AUTO_SHOOT_INTERVAL_FAST : AUTO_SHOOT_INTERVAL_NORMAL;
  const percent = Math.floor(Math.min(100, ((timestamp - lastAutoShootTime) / shootInterval) * 100));
  if (percent !== lastAutoChargePercent) {
    autoChargeFillEl.style.width = percent + "%";
    autoChargeFillEl.style.background = percent >= 100 ? "#ffffff" : "linear-gradient(90deg,#ffc107,#ff5722)";
    lastAutoChargePercent = percent;
  }
}

// ============================================================
// METEORITOS Y DIFICULTAD
// ============================================================

function calculateSlowSpeedFactor() {
  if (betaFreezeEndTime && performance.now() < betaFreezeEndTime) return 0;
  if (!slowActive) return 1;
  const progress = slowElapsedTime / SLOW_DURATION;
  if (slowSkipIntro && progress < 0.4) return SLOW_FACTOR;
  if (progress < 0.4)  return 1 - (1 - SLOW_FACTOR) * (progress / 0.4);
  if (progress < 0.75) return SLOW_FACTOR;
  return Math.min(1, SLOW_FACTOR + (1 - SLOW_FACTOR) * (1 - Math.pow(1 - (progress - 0.75) / 0.25, 3)));
}

function spawnPowerUpForced(type, xPos) {
  powerUpPityCounter = 0;
  const powerEl = document.createElement('div');
  powerEl.classList.add('powerup');
  if (type === 'shield') powerEl.style.background = '#4caf50';
  if (type === 'laser') powerEl.style.background = '#f44336';
  if (type === 'slow') powerEl.style.background = '#2196f3';
  powerEl.dataset.type = type;
  const size = POWERUP_SIZE;
  const x = (typeof xPos === 'number') ? xPos : (GAME_WIDTH - size)/2;
  powerEl.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${-size-10}px;`;
  stageEl.appendChild(powerEl);
  powerups.push({ x, y: -size - 10, size, speed: BASE_METEOR_SPEED * 0.6, el: powerEl, type });
  lastSpawnTime = performance.now();
}

function spawnMeteor(timestamp) {
  // Modo tutorial: RNG sembrado -> misma aleatoriedad siempre, pero no "lógica" fija
  if (typeof tutorialGameActive !== 'undefined' && tutorialGameActive) {
    // No spawnear automáticamente durante pasos guiados 0-1-3-4-5 (se controlan manualmente)
    if (tutorialGameStep >= 0 && tutorialGameStep <= 5 && tutorialGameStep !== 2 && tutorialGameStep !== 6) {
      return;
    }
    const rnd = (typeof tutorialRandom === 'function') ? tutorialRandom : Math.random;
    const crater = 1 + Math.floor(rnd() * 3);
    const size = 30 + rnd() * 20;
    const x = rnd() * (GAME_WIDTH - size);
    const y = -size - 20;
    const speed = BASE_METEOR_SPEED * (0.9 + rnd() * 0.4);
    meteorSpawnCount++;
    if (typeof tutorialDeterministicIndex !== 'undefined') tutorialDeterministicIndex++;
    const speedX = 0;
    const trailAngle = 0;
    meteors.push({ x, y, size, speed, speedX, crater, trailAngle, sprite: null });
    lastSpawnTime = timestamp;
    return;
  }
  const crater = 1 + Math.floor(Math.random() * 3);
  const size  = 28 + Math.random() * 26;
  const x     = Math.random() * (GAME_WIDTH - size);
  const y     = -size - 20;
  const speed = BASE_METEOR_SPEED * difficultyFactor * (0.8 + Math.random() * 0.6);
  meteorSpawnCount++;
  let speedX = 0;
  if (meteorSpawnCount % 5 === 0) { const b = 20 + Math.random() * 40; speedX = Math.random() > 0.5 ? b : -b; }
  const trailAngle = -Math.atan2(speedX, speed) * 180 / Math.PI;
  // Sin nodo DOM: el meteoro se dibuja en el canvas. El sprite se cachea por
  // (tamaño, cráter, ángulo) y se resuelve perezosamente en FxCanvas.drawMeteor.
  meteors.push({ x, y, size, speed, speedX, crater, trailAngle, sprite: null });
  lastSpawnTime = timestamp;
}

function updateDifficultyByLevel() {
  const newLevel = Math.floor(score / 1000) + 1;
  if (newLevel !== level) {
    level = newLevel;
    currentLevelBase = Math.floor(score / 1000) * 1000;
    nextLevelTarget  = currentLevelBase + 1000;
    playLevelUp(); checkAchievements();
  } else {
    const span = nextLevelTarget - currentLevelBase;
    levelProgress = span > 0 ? (Math.max(0, Math.min(score - currentLevelBase, span)) / span) : 1;
  }
  difficultyFactor = 1 + (Math.min(score, 500000) / 500000) * (MAX_DIFFICULTY - 1);
  updateProgressBar(levelProgress * 100, level);
}

function updateMeteors(effectiveDelta) {
  const dt = effectiveDelta / 1000;
  let currentSpeedFactor = calculateSlowSpeedFactor();
  if (slowActive) {
    const realDelta = fastModeActive ? (effectiveDelta / FAST_MODE_MULTIPLIER) : effectiveDelta;
    slowElapsedTime += realDelta;
    if (slowElapsedTime >= SLOW_DURATION) { slowActive = false; slowElapsedTime = 0; currentSpeedFactor = 1; }
  } else { slowElapsedTime = 0; currentSpeedFactor = 1; }

  const shipRect = getPlayerCollisionRect();
  const playerBottomY = (GAME_HEIGHT - 30);
  const collisionH = PLAYER_HEIGHT * PLAYER_COLLISION_HEIGHT_FACTOR;
  const playerCenterY = (playerBottomY - collisionH) + collisionH / 2;
  let writeIdx = 0;

  for (let i = 0; i < meteors.length; i++) {
    const m = meteors[i];
    if (!m || typeof m.size !== 'number') continue;
    if (!gameRunning) break;
    m.y += m.speed * currentSpeedFactor * dt;
    if (m.speedX) m.x += m.speedX * currentSpeedFactor * dt;
    const mSize = m.size * METEOR_COLLISION_FACTOR;
    const mLeft = m.x + (m.size - mSize) / 2;
    const mTop  = m.y + (m.size - mSize) / 2;
    let keepMeteor = true;

    // (El dibujo se hace ahora en el canvas desde el game loop.)
    if (showHitboxes) FxCanvas.queueDebugRect(mLeft, mTop, mSize, mSize, FxCanvas.HITBOX_COLORS.meteor);

    if (m.y > GAME_HEIGHT + 60 || m.x > GAME_WIDTH || m.x + m.size < 0) {
      keepMeteor = false;
    }

    if (keepMeteor) {
      if (laserActive && laserBeamEl && laserBeamEl.classList.contains("active")) {
        const laserX = playerX + PLAYER_WIDTH / 2, laserW = 20;
        const laserLeft = laserX - laserW / 2, laserRight = laserX + laserW / 2;
        if (mLeft < laserRight && mLeft + mSize > laserLeft && (mTop + mSize / 2) < playerCenterY) {
          sessionAsteroidsDestroyed++;
          playLaser(); createExplosion(m.x, m.y, m.size);
          spawnFloatingText(m.x + m.size/2, m.y, "+10", "#fff7e1", "12px");
          addScorePoints(10);
          keepMeteor = false;
        }
      }
    }

    if (keepMeteor) {
      const overlap = !(mLeft+mSize<=shipRect.left || mLeft>=shipRect.right || mTop+mSize<=shipRect.top || mTop>=shipRect.bottom);
      if (overlap) {
        if (performance.now() < immunityEndTime || isDying) { /* inmunidad activa */ }
        else if (shieldActive) {
          shieldActive = false; shieldEl.classList.remove("active");
          createExplosion(m.x, m.y, m.size);
          if (!safeModeOn) playerEl.classList.add("flashing");
          setTimeout(() => playerEl.classList.remove("flashing"), 300);
          playHit(); keepMeteor = false;
        } else {
          createExplosion(m.x, m.y, m.size);
          if (!safeModeOn) playerEl.classList.add("flashing");
          setTimeout(() => playerEl.classList.remove("flashing"), 300);
          gameOver(); keepMeteor = false;
        }
      }
    }

    if (keepMeteor) { if (i !== writeIdx) meteors[writeIdx] = m; writeIdx++; }
  }
  if (gameRunning || isDying) {
    // Evita huecos si meteors fue reasignado dentro de gameOver() durante el bucle
    if (meteors.length !== writeIdx) {
      // Si hubo reasignación (new array con huecos), compacta filtrando válidos
      let j = 0;
      for (let k = 0; k < meteors.length; k++) {
        const mm = meteors[k];
        if (mm && typeof mm.size === 'number') {
          if (k !== j) meteors[j] = mm;
          j++;
        }
      }
      meteors.length = Math.min(j, writeIdx);
      // Si writeIdx es 0 tras vaciado, asegura array vacío denso
      if (writeIdx === 0) meteors.length = 0;
    } else {
      meteors.length = writeIdx;
    }
  }
}
