// ============================================================
// EFECTOS VISUALES
// ============================================================

function triggerScreenShake() {
  if (document.body.classList.contains("no-smooth")) return;
  containerEl.classList.remove("screen-shake");
  void containerEl.offsetWidth;
  containerEl.classList.add("screen-shake");
  setTimeout(() => containerEl.classList.remove("screen-shake"), 400);
}

function createExplosion(x, y, size) {
  // Delega al renderer canvas (gestiona sus propias partículas y TTL).
  if (FxCanvas.isReady()) FxCanvas.spawnExplosion(x, y, size);
}

function createShipDebris(x, y) {
  // Delega al renderer canvas (12 fragmentos con física, como antes).
  if (FxCanvas.isReady()) FxCanvas.spawnDebris(x, y);
}

// ============================================================
// FLOTING TEXT — pooling para evitar picos de GC
// ============================================================
// Pool simple para reutilizar nodos y reducir presión de GC.
// (Se inicializa aquí para no depender del orden de carga de módulos.)
let _floatingTextPool = [];


function spawnFloatingText(x, y, text, color = "#fff", size = "16px") {
  // Reutilizamos nodos en vez de crear/destruir cada vez.
  if (document.body.classList.contains("no-lights")) return;

  const el = _floatingTextPool.pop() || document.createElement("div");
  if (!el.classList.contains("floating-text")) el.className = "floating-text";

  el.textContent = text;
  el.style.left = x + "px";
  el.style.top = y + "px";
  el.style.color = color;
  el.style.fontSize = size;
  el.style.display = "block";

  // Si estaba en DOM (semanalmente), lo quitamos antes de re-append.
  if (el.parentNode !== stageEl) stageEl.appendChild(el);

  // Devolvemos al pool: ocultar + quitar del DOM para que no pinte.
  // (No guardamos timers por elemento para no complicar.)
  setTimeout(() => {
    el.style.display = "none";
    if (el.parentNode) el.parentNode.removeChild(el);
    _floatingTextPool.push(el);
  }, 800);

}


// ============================================================
// CINEMÁTICAS
// ============================================================

function clearCutsceneTimeouts() {
  cutsceneTimeouts.forEach(clearTimeout);
  cutsceneTimeouts = [];
  if (marsLandingTimeout) clearTimeout(marsLandingTimeout);
}

function skipEarthLaunch() {
  clearCutsceneTimeouts();
  if (!cutsceneActive || activeCutsceneName !== 'earthLaunch') return;
  cutsceneActive = false; activeCutsceneName = null;
  updateTouchControlsVisibility();
  pauseBtn.style.display = "flex";
  playerEl.classList.remove("launch-anim");
  if (skipBtn) skipBtn.classList.add("hidden");
  const centerX = (GAME_WIDTH - PLAYER_WIDTH) / 2;
  playerX = centerX;
  playerEl.style.transform = `translate3d(${playerX}px, 0, 0)`;
  if (earthHorizonEl) {
    earthHorizonEl.style.display = "none";
    earthHorizonEl.style.transform = "translateY(300px) scale(1.1)";
    earthHorizonEl.style.opacity = "0";
  }
  lastSpawnTime = performance.now(); lastAutoShootTime = performance.now();
  lastFrameTime = performance.now();
  immunityEndTime = performance.now() + 250;

  _resetKeychainAfterCutscene();
}

function _resetKeychainAfterCutscene() {
  if (keychain) keychain.initialized = false;
}

function skipMarsLanding() {
  clearCutsceneTimeouts();
  if (!cutsceneActive || activeCutsceneName !== 'marsLanding') return;
  _resetKeychainAfterCutscene();
  activeCutsceneName = null;
  playerEl.classList.remove("landing-anim");
  playerEl.classList.add("landing-sequence");
  const centerX = (GAME_WIDTH - PLAYER_WIDTH) / 2;
  playerX = centerX;
  playerEl.style.transform = `translate3d(${centerX}px, -260px, 0) rotateZ(180deg)`;
  marsOverlayEl.classList.remove("hidden");
  if (skipBtn) skipBtn.classList.add("hidden");
  playLevelUp();
}

function skipMarsTakeoff() {
  clearCutsceneTimeouts();
  if (!cutsceneActive || activeCutsceneName !== 'marsTakeoff') return;
  _resetKeychainAfterCutscene();
  const flame = playerEl.querySelector('.flame');
  if (flame) flame.style.transform = "";
  playerEl.classList.remove("takeoff-anim","landing-sequence");
  cutsceneActive = false; activeCutsceneName = null;
  pauseBtn.style.display = "flex";
  playerEl.style.transition = "";
  if (skipBtn) skipBtn.classList.add("hidden");
  const centerX = (GAME_WIDTH - PLAYER_WIDTH) / 2;
  playerX = centerX;
  playerEl.style.transform = `translate3d(${centerX}px, 0, 0)`;
  if (marsHorizonEl) { marsHorizonEl.style.opacity = "0"; marsHorizonEl.style.transform = ""; }
  if (containerEl) containerEl.style.background = "";
  lastFrameTime = performance.now(); lastSpawnTime = performance.now(); lastAutoShootTime = performance.now();
}

function skipDeathSequence() {
  clearCutsceneTimeouts();
  if (!cutsceneActive || activeCutsceneName !== 'death') return;
  cutsceneActive = false; activeCutsceneName = null;
  finalizeGameOver();
}

function triggerEarthLaunch() {
  if (document.body.classList.contains("no-smooth")) { skipEarthLaunch(); return; }
  cutsceneActive = true; activeCutsceneName = 'earthLaunch';
  clearCutsceneTimeouts();
  pauseBtn.style.display = "none";
  if (skipBtn) skipBtn.classList.remove("hidden");
  const centerX = (GAME_WIDTH - PLAYER_WIDTH) / 2;
  playerEl.style.setProperty('--center-x', centerX + 'px');
  playerX = centerX;
  if (containerEl) containerEl.style.background = "linear-gradient(to bottom, rgb(50,100,140) 0%, rgb(40,90,40) 100%)";
  if (earthHorizonEl) {
    earthHorizonEl.style.display = "";
    earthHorizonEl.style.transition = "none";
    earthHorizonEl.style.opacity = "1";
    earthHorizonEl.style.transform = "translateY(0)";
    // Evitar forced reflow: dejamos que el navegador aplique/batchee los cambios.
    // 1) Reflow-free: primero aseguramos el estado “sin transición” en este frame.
    earthHorizonEl.style.transition = "none";

    // 2) En el siguiente frame activamos la transición.
    requestAnimationFrame(() => {
      if (!earthHorizonEl) return;
      requestAnimationFrame(() => {
        if (!earthHorizonEl) return;
        earthHorizonEl.style.transition = "transform 2.5s ease-in, opacity 2.5s ease-in";
        earthHorizonEl.style.transform = "translateY(0)";
        earthHorizonEl.style.opacity = "1";
      });
    });
  }
  playerEl.classList.add("launch-anim");
  triggerScreenShake();
  playerEl.style.transform = '';
  cutsceneTimeouts.push(setTimeout(() => {
    if (earthHorizonEl) { earthHorizonEl.style.transform = "translateY(300px) scale(1.1)"; earthHorizonEl.style.opacity = "0"; }
  }, 200));
  cutsceneTimeouts.push(setTimeout(skipEarthLaunch, 2500));
}

function triggerMarsLanding() {
  cutsceneActive = true; activeCutsceneName = 'marsLanding';
  clearCutsceneTimeouts();
  marsSequenceTriggered = true;
  try { if (typeof markMarsReachedForCurrentMode === 'function') markMarsReachedForCurrentMode(); } catch(e) {}
  checkAchievements();
  pauseBtn.style.display = "none";
  if (skipBtn) skipBtn.classList.remove("hidden");
  if (containerEl) containerEl.style.background = "";
  meteors.forEach((m, index) => {
    const tId = setTimeout(() => { createExplosion(m.x, m.y, m.size); playHit(); }, index * 30);
    cutsceneTimeouts.push(tId);
  });
  meteors = [];
  projectiles = [];
  powerups.forEach(p => { try { p.el.remove(); } catch(e) {} });    powerups = [];
  laserActive = false;
  if (laserBeamEl) laserBeamEl.classList.remove("active");
  const centerX = (GAME_WIDTH - PLAYER_WIDTH) / 2;
  playerEl.style.setProperty('--start-x', playerX + 'px');
  playerEl.style.setProperty('--center-x', centerX + 'px');
  playerX = centerX;
  playerEl.style.transition = "";
  playerEl.classList.add("landing-anim","landing-sequence");
  playerEl.style.transform = '';
  marsLandingTimeout = setTimeout(skipMarsLanding, 3000);
  cutsceneTimeouts.push(marsLandingTimeout);
}

// ============================================================
// FONDO HISTORIA
// ============================================================

let lastStoryUpdateScore = -9999;

function updateStoryBackground() {
  if (marsSequenceTriggered && !cutsceneActive) {
    if (containerEl.style.background !== "" || marsHorizonEl.style.opacity !== "0") {
      containerEl.style.background = ""; marsHorizonEl.style.opacity = "0"; marsHorizonEl.style.transform = "";
    }
    return;
  }
  if (Math.abs(score - lastStoryUpdateScore) < 200 && !cutsceneActive) return;
  lastStoryUpdateScore = score;

  if (score < 100000) {
    const easedProgress = Math.pow(score / 100000, 0.25);
    const r1 = Math.round(50  + (27  - 50)  * easedProgress);
    const g1 = Math.round(100 + (50  - 100) * easedProgress);
    const b1 = Math.round(140 + (88  - 140) * easedProgress);
    const r2 = Math.round(40  + (5   - 40)  * easedProgress);
    const g2 = Math.round(90  + (8   - 90)  * easedProgress);
    const b2 = Math.round(40  + (18  - 40)  * easedProgress);
    containerEl.style.background = `linear-gradient(to bottom, rgb(${r1},${g1},${b1}) 0%, rgb(${r2},${g2},${b2}) 100%)`;
  } else if (score < 200000) {
    containerEl.style.background = ""; marsHorizonEl.style.opacity = "0";
  } else if (score >= 240000) {
    const progress = Math.min(1, (score - 240000) / 10000);
    const easedProgress = Math.pow(progress, 2);
    const r1 = Math.round(27 + (216 - 27) * easedProgress);
    const g1 = Math.round(50 + (67  - 50) * easedProgress);
    const b1 = Math.round(88 + (21  - 88) * easedProgress);
    containerEl.style.background = `linear-gradient(to bottom, rgb(${r1},${g1},${b1}) 0%, rgb(5,8,18) 80%)`;
    if (marsHorizonEl) {
      marsHorizonEl.style.opacity = easedProgress;
      marsHorizonEl.style.transform = `translateY(${100 * easedProgress}px)`;
    }
  }
}

// Botones Marte
btnMarsContinue.addEventListener("click", () => {
  marsOverlayEl.classList.add("hidden");
  postMarsDeathImmunity = true;
  if (document.body.classList.contains("no-smooth")) {
    cutsceneActive = true; activeCutsceneName = 'marsTakeoff';
    skipMarsTakeoff(); applyPowerUp("shield"); return;
  }
  cutsceneActive = true; activeCutsceneName = 'marsTakeoff';
  clearCutsceneTimeouts();
  if (skipBtn) skipBtn.classList.remove("hidden");
  applyPowerUp("shield");
  triggerScreenShake();
  const flame = playerEl.querySelector('.flame');
  if (flame) flame.style.transform = "scale(3) translateY(5px)";
  playerEl.classList.remove("landing-anim");
  playerEl.classList.add("takeoff-anim");
  cutsceneTimeouts.push(setTimeout(skipMarsTakeoff, 3000));
});

btnMarsFinish.addEventListener("click", () => {
  marsOverlayEl.classList.add("hidden");
  gameOver({ noLifeLoss: true });
});

if (skipBtn) {
  skipBtn.addEventListener("click", () => {
    if      (activeCutsceneName === 'earthLaunch') skipEarthLaunch();
    else if (activeCutsceneName === 'marsLanding') skipMarsLanding();
    else if (activeCutsceneName === 'marsTakeoff') skipMarsTakeoff();
    else if (activeCutsceneName === 'death')       skipDeathSequence();
  });
}
