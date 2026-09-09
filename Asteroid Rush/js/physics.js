// ============================================================
// COLISIÓN DEL JUGADOR
// ============================================================

let _cachedPlayerX = null;
function getPlayerCollisionRect() {
  const now = performance.now();
  if (cachedPlayerCollisionRectTime && now - cachedPlayerCollisionRectTime < 8 && _cachedPlayerX !== null && Math.abs(playerX - _cachedPlayerX) < 0.5) return cachedPlayerCollisionRect;
  const width  = PLAYER_WIDTH  * PLAYER_COLLISION_WIDTH_FACTOR;
  const height = PLAYER_HEIGHT * PLAYER_COLLISION_HEIGHT_FACTOR;
  const left   = playerX + (PLAYER_WIDTH - width) / 2;
  cachedPlayerCollisionRect = { left, right: left + width, top: (GAME_HEIGHT - 30) - height, bottom: GAME_HEIGHT - 30 };
  cachedPlayerCollisionRectTime = now; _cachedPlayerX = playerX;
  return cachedPlayerCollisionRect;
}

// ============================================================
// MOVIMIENTO DEL JUGADOR
// ============================================================

function updatePlayer(delta) {
  if (betaFreezeEndTime && performance.now() < betaFreezeEndTime) return;
  const dt = delta / 1000;

  const hitboxWidth = PLAYER_WIDTH * PLAYER_COLLISION_WIDTH_FACTOR;
  const hitboxOffset = (PLAYER_WIDTH - hitboxWidth) / 2;

  const _isTut = (typeof tutorialGameActive !== 'undefined' && tutorialGameActive);
  const _fast = !_isTut && fastModeActive;
  const _swing = !_isTut && swingcopterModeActive;

  if (_swing) {
    if (keys.left && keys.right) swingcopterDirection = (keys.lastDir === 'left') ? -1 : 1;
    else if (keys.left)  swingcopterDirection = -1;
    else if (keys.right) swingcopterDirection =  1;

    const accel  = PLAYER_ACCEL;
    const maxX   = GAME_WIDTH - hitboxWidth - EDGE_MARGIN - hitboxOffset;
    const minX   = EDGE_MARGIN - hitboxOffset;
    const brakingDist = (playerVelocity * playerVelocity) / (2 * accel);

    if (!keys.left  && playerVelocity > 0 && swingcopterDirection ===  1 && playerX + brakingDist >= maxX - 2) swingcopterDirection = -1;
    if (!keys.right && playerVelocity < 0 && swingcopterDirection === -1 && playerX - brakingDist <= minX + 2) swingcopterDirection =  1;

    playerVelocity += swingcopterDirection * accel * dt;
    playerVelocity  = Math.max(-PLAYER_MAX_SPEED, Math.min(PLAYER_MAX_SPEED, playerVelocity));
    playerX += playerVelocity * dt;

    if (playerX > maxX) { playerX = maxX; if (playerVelocity > 0) playerVelocity = 0; swingcopterDirection = -1; }
    else if (playerX < minX) { playerX = minX; if (playerVelocity < 0) playerVelocity = 0; swingcopterDirection =  1; }
    playerEl.style.transform = `translate3d(${playerX}px, 0, 0)`;

  } else {
    const speedMultiplier = _fast ? 2.5 : 1;
    let dir = 0;
    if (keys.left && keys.right) dir = (keys.lastDir === 'left') ? -1 : 1;
    else if (keys.left)  dir = -1;
    else if (keys.right) dir =  1;

    const accel    = PLAYER_ACCEL * speedMultiplier;
    const friction = PLAYER_FRICTION * (_fast ? 3 : speedMultiplier);
    const maxSpeed = PLAYER_MAX_SPEED * speedMultiplier;

    if (dir !== 0) playerVelocity += dir * accel * dt;
    else {
      if (playerVelocity > 0) playerVelocity = Math.max(0, playerVelocity - friction * dt);
      else if (playerVelocity < 0) playerVelocity = Math.min(0, playerVelocity + friction * dt);
    }
    playerVelocity = Math.max(-maxSpeed, Math.min(maxSpeed, playerVelocity));
    playerX += playerVelocity * dt;

    const minX = EDGE_MARGIN - hitboxOffset, maxX = GAME_WIDTH - hitboxWidth - EDGE_MARGIN - hitboxOffset;
    if (playerX < minX) { playerX = minX; if (playerVelocity < 0) playerVelocity = 0; }
    else if (playerX > maxX) { playerX = maxX; if (playerVelocity > 0) playerVelocity = 0; }

    let tilt = "";
    if (_fast) {
      if (dir < 0) tilt = " rotateZ(-5deg)";
      else if (dir > 0) tilt = " rotateZ(5deg)";
    }
    playerEl.style.transform = `translate3d(${playerX}px, 0, 0)${tilt}`;
  }

  if (showHitboxes) {
    // Hitbox del jugador en el canvas (azul), encima de todo.
    const rect = getPlayerCollisionRect();
    FxCanvas.queueDebugRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top, FxCanvas.HITBOX_COLORS.player);
  }

  if (laserBeamEl && laserActive) laserBeamEl.style.left = playerX + PLAYER_WIDTH / 2 + "px";
}
