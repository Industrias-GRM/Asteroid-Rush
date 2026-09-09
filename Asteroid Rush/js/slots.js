// ============================================================
// SISTEMA DE GUARDADO (10 SLOTS)
// ============================================================

const MAX_SLOTS = 10;

function getSaveSlots() {
  const slots = [];
  for (let i = 0; i < MAX_SLOTS; i++) {
    try { const d = localStorage.getItem(`dodge_save_slot_${i}`); slots.push(d ? JSON.parse(d) : null); }
    catch (e) { slots.push(null); }
  }
  return slots;
}

function deleteSlot(index, event) {
  if (event) event.stopPropagation();
  localStorage.removeItem(`dodge_save_slot_${index}`);
  playHit();
  renderSlots(saveLoadTitle.dataset.mode === 'save' ? 'save' : 'select'); // Bug #4: usar data-mode en vez de texto hardcodeado
  if (activeSlot === index) { activeSlot = null; updateSlotButtonUI(); updateSlotInfoPanel(); }
}

function renderSlots(mode) {
  slotsContainer.innerHTML = "";
  const slots = getSaveSlots();
  slots.forEach((slot, index) => {
    const el = document.createElement("div");
    el.className = "save-slot";
    if (!slot) el.classList.add("empty");
    if (slot) {
      const date     = new Date(slot.timestamp).toLocaleString();
      const modeLabel = slot.fastModeActive ? i18n.t("mode_fast_short") : (slot.swingcopterModeActive ? i18n.t("mode_zigzag_short") : i18n.t("mode_normal_short"));
      el.innerHTML = `
        <div class="slot-info">
          <span class="slot-title">${i18n.t("label_slot")} ${index + 1} - ${i18n.t("table_header_score")}: ${Math.floor(slot.score)}</span>
          <span class="slot-details">${date} | ${i18n.t("hud_level_prefix")} ${slot.level} | ${modeLabel}</span>
        </div>
        <button class="slot-delete-btn" data-i18n-title="slot_delete_title">🗑️</button>`;
    } else {
      el.innerHTML = `
        <div class="slot-info">
          <span class="slot-title">${i18n.t("label_slot")} ${index + 1}</span>
          <span class="slot-details">${i18n.t("label_empty")}</span>
        </div>`;
    }
    const deleteBtn = el.querySelector('.slot-delete-btn');
    if (deleteBtn) {
      // Traducción dinámica (estos nodos se crean después de i18n.apply()).
      deleteBtn.title = i18n.t("slot_delete_title", "Borrar Slot");
      deleteBtn.addEventListener("click", (e) => deleteSlot(index, e));
    }
    el.addEventListener("click", (e) => {
      if (e.target.closest('.slot-delete-btn')) return;
      if (mode === 'save') saveToSlot(index);
      else if (mode === 'select') selectSlot(index);
    });
    slotsContainer.appendChild(el);
  });
  if (noSlotBtn) {
    if (mode === 'select') noSlotBtn.classList.remove('hidden');
    else noSlotBtn.classList.add('hidden');
  }
}

function updateSlotInfoPanel() {
  const panel = document.getElementById("slot-info-panel");
  const scoreVal = document.getElementById("slot-info-score-val");
  const timeVal = document.getElementById("slot-info-time-val");
  const btn = document.getElementById("slot-select-btn");
  if (!panel || !scoreVal || !timeVal || !btn) return;
  if (activeSlot !== null) {
    let slotData = null; try { const raw = localStorage.getItem(`dodge_save_slot_${activeSlot}`); slotData = raw ? JSON.parse(raw) : null; } catch(e) { slotData = null; }
    if (slotData) {
      const s = slotData.score || 0;
      const d = slotData.gameDuration || 0;
      const totalSec = Math.floor(d / 1000);
      scoreVal.textContent = Math.floor(s).toLocaleString();
      timeVal.textContent = `${Math.floor(totalSec / 60)}:${(totalSec % 60).toString().padStart(2, "0")}`;
    }
    panel.classList.remove("hidden");
    btn.classList.add("slot-btn-raised");
  } else {
    panel.classList.add("hidden");
    btn.classList.remove("slot-btn-raised");
  }
}

function selectSlot(index) {
  let slotData = null; try { const raw = localStorage.getItem(`dodge_save_slot_${index}`); slotData = raw ? JSON.parse(raw) : null; } catch(e) { slotData = null; }
  activeSlot = index;
  if (slotData) {
    fastModeActive = slotData.fastModeActive;
    swingcopterModeActive = slotData.swingcopterModeActive || false;
    broadcastGameStateChange('fastModeActive', fastModeActive);
    broadcastGameStateChange('swingcopterModeActive', swingcopterModeActive);
    updateModeUI();
  }
  updateSlotButtonUI();
  updateSlotInfoPanel();
  saveLoadOverlay.classList.add("hidden");
  playMenuClickSound();
}

let _resumeAutoShootElapsed = 0; // Fix #2: offset de carga del auto-láser al reanudar
let _resumeShieldRemaining = 0;
let _resumeLaserRemaining = 0;
let _resumeSlowActive = false;
let _resumeSlowElapsedTime = 0;

function _buildSaveData() {
  const effectiveNow = (gamePaused && pauseStartTime > 0) ? pauseStartTime : performance.now();
  return {
    score, playerX, level, difficultyFactor, gameDuration,
    fastModeActive, swingcopterModeActive, swingcopterDirection, marsSequenceTriggered,
    betaModeActive: !!betaModeActive,
    shieldActive, shieldRemaining: shieldActive ? Math.max(0, shieldEndTime - effectiveNow) : 0,
    laserActive,  laserRemaining:  laserActive  ? Math.max(0, laserEndTime  - effectiveNow) : 0,
    slowActive, slowElapsedTime,
    autoShootElapsed: Math.max(0, effectiveNow - lastAutoShootTime), // Fix #2: progreso de carga
    sessionPowerupsCollected, sessionShieldsCollected, sessionLasersCollected, sessionSlowsCollected, sessionLaserFiredCount, sessionAsteroidsDestroyed, // Fix #3: contadores de logros
    timestamp: Date.now(),
    meteors:      meteors.map(m => ({ x: m.x, y: m.y, size: m.size, speed: m.speed, speedX: m.speedX })),
    powerups:     powerups.map(p => ({ x: p.x, y: p.y, size: p.size, speed: p.speed, type: p.type })),
    projectiles:  projectiles.map(p => ({ x: p.x, y: p.y, width: p.width, height: p.height })) // Fix #1: proyectiles en vuelo
  };
}

function saveToSlot(index) {
  activeSlot = index;
  updateSlotButtonUI();
  localStorage.setItem(`dodge_save_slot_${index}`, JSON.stringify(_buildSaveData()));
  playMenuClickSound();
  saveLoadOverlay.classList.add("hidden");

  // Volver al menú
  gameRunning = false; gamePaused = false;
  updateTouchControlsVisibility();
  stopBackgroundMusic(); stopSlowSoundEffect();
  if (autosaveInterval) clearInterval(autosaveInterval);

  meteors = [];
  powerups.forEach(p => { if (p.el) p.el.remove(); });           powerups = [];
  projectiles = [];
  FxCanvas.wipe();

  playerX = (GAME_WIDTH - PLAYER_WIDTH) / 2;
  playerEl.style.transform = `translate3d(${playerX}px, 0, 0)`;
  playerEl.style.display = "none";
  playerEl.classList.remove("fast-visual", "landing-sequence", "landing-anim", "takeoff-anim");
  playerEl.style.transition = "";
  marsHorizonEl.style.opacity = "0"; marsHorizonEl.style.transform = "";
  containerEl.style.background = "";
  marsOverlayEl.classList.add("hidden");
  if (earthHorizonEl) { earthHorizonEl.style.display = "none"; earthHorizonEl.style.opacity = "0"; earthHorizonEl.style.transform = "translateY(300px) scale(1.1)"; } // Bug #8: ocultar correctamente

  setOverlayMode("menu");
  overlayModeInfo.style.display = "none";
  overlayLivesInfo.style.display = "none";
  pauseBtn.style.display = "none";
  muteBtn.style.display  = "flex";
  if (skipBtn) skipBtn.classList.add("hidden");
  if (pauseContinueBtn) pauseContinueBtn.classList.add("hidden");
  const savedScore = score; // Bug #5: guardar score antes de resetearlo
  score = 0; updateBestScoreUI(); updateLivesUI();
  loadLeaderboard(savedScore > 0 && fastModeActive ? "fast" : (swingcopterModeActive ? "swingcopter" : "normal"));
}

function performAutosave() {
  if (activeSlot === null || !gameRunning || gamePaused) return;

  // PERF FIX: Evita picos de lag. requestIdleCallback con throttle de 5s (era 1s).
  // La serialización de meteors/powerups/projectiles puede ser costosa con muchas entidades.
  if (performAutosave._scheduled) return;
  performAutosave._scheduled = true;

  const run = () => {
    try {
      localStorage.setItem(`dodge_save_slot_${activeSlot}`, JSON.stringify(_buildSaveData()));
    } finally {
      performAutosave._scheduled = false;
    }
  };

  if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 500 });
  else setTimeout(run, 0);
}


function skipCountdown() {
  const countdownOverlay = document.getElementById('countdown-overlay');
  if (!countdownOverlay || countdownOverlay.classList.contains('hidden')) return;
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
  countdownOverlay.classList.remove('visible');
  setTimeout(() => countdownOverlay.classList.add('hidden'), 200);
  gameRunning = true; gamePaused = false;
  lastFrameTime = null; lastSpawnTime = performance.now();
  lastAutoShootTime = performance.now() - _resumeAutoShootElapsed; 
  if (_resumeShieldRemaining > 0) { shieldEndTime = performance.now() + _resumeShieldRemaining; shieldActive = true; }
  else { shieldActive = false; }
  if (_resumeLaserRemaining > 0)  { laserEndTime  = performance.now() + _resumeLaserRemaining;  laserActive = true; }
  else { laserActive = false; if (laserBeamEl) laserBeamEl.classList.remove("active"); }
  if (_resumeSlowActive)          { slowActive = true; slowElapsedTime = _resumeSlowElapsedTime; }
  else { slowActive = false; slowElapsedTime = 0; }
  _resumeAutoShootElapsed = 0; _resumeShieldRemaining = 0; _resumeLaserRemaining = 0;
  _resumeSlowActive = false; _resumeSlowElapsedTime = 0;
  startBackgroundMusic(); playUnpauseSound();
  // No reiniciar el gameLoop aquí: puede generar bucles duplicados y picos de lag.
}


function startResumeCountdown() {
  const countdownOverlay = document.getElementById('countdown-overlay');
  const countdownText    = document.getElementById('countdown-text');
  if (!countdownOverlay || !countdownText) return;
  let count = 3;
  const updateCountdown = () => {
    countdownText.textContent = count;
    countdownText.style.animation = 'none'; void countdownText.offsetWidth;
    countdownText.style.animation = 'countdown-pop 0.8s cubic-bezier(0.25,0.46,0.45,0.94) forwards';
    playMenuHoverSound();
  };
  countdownOverlay.classList.remove('hidden'); countdownOverlay.classList.add('visible');
  updateCountdown();
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    count--;
    if (count > 0) { updateCountdown(); }
    else if (count === 0) {
      countdownText.textContent = i18n.t("label_go", "¡YA!");
      countdownText.style.animation = 'none'; void countdownText.offsetWidth;
      countdownText.style.animation = 'countdown-pop 0.8s cubic-bezier(0.25,0.46,0.45,0.94) forwards';
      playLevelUp();
    } else {
      clearInterval(countdownInterval); countdownInterval = null;
      countdownOverlay.classList.remove('visible');
      setTimeout(() => countdownOverlay.classList.add('hidden'), 200);
      gameRunning = true; gamePaused = false; stageEl.classList.add("playing"); lastFrameTime = null;
      lastSpawnTime = performance.now();
      lastAutoShootTime = performance.now() - _resumeAutoShootElapsed;
      if (_resumeShieldRemaining > 0) { shieldEndTime = performance.now() + _resumeShieldRemaining; shieldActive = true; }
      else { shieldActive = false; }
      if (_resumeLaserRemaining > 0)  { laserEndTime  = performance.now() + _resumeLaserRemaining;  laserActive = true; }
      else { laserActive = false; if (laserBeamEl) laserBeamEl.classList.remove("active"); }
      if (_resumeSlowActive)          { slowActive = true; slowElapsedTime = _resumeSlowElapsedTime; }
      else { slowActive = false; slowElapsedTime = 0; }
      _resumeAutoShootElapsed = 0; _resumeShieldRemaining = 0; _resumeLaserRemaining = 0;
      _resumeSlowActive = false; _resumeSlowElapsedTime = 0;
      startBackgroundMusic();
      // No reiniciar el gameLoop aquí: puede duplicar loops y causar picos de lag.
    }
  }, 1000);
}


function resumeGameFromLoad(data) {
  keys = { left: false, right: false, up: false, lastDir: null };
  playerVelocity = 0; isDying = false;
  score = data.score; playerX = data.playerX; lastIntScore = Math.floor(score); // Cargar score y playerX antes de colocar elementos
  setNoLivesMessageShown(false);
  updateStageScale();
  playerEl.style.left = "0px";
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

  meteors = [];
  powerups.forEach(p => { try { p.el.remove(); } catch(e) {} });           powerups = [];
  projectiles = [];
  FxCanvas.wipe();
  setGameElementsVisibility(true);

  shieldActive = false; laserActive = false; slowActive = false; slowElapsedTime = 0;
  shieldEl.classList.remove("active");
  if (laserBeamEl) { laserBeamEl.classList.remove("active"); laserBeamEl.style.display = ""; }

  if (data.shieldActive && data.shieldRemaining > 0) {
    _resumeShieldRemaining = data.shieldRemaining;
    shieldActive = true; shieldEndTime = performance.now() + 1000000; // Temporalmente infinito
    shieldEl.classList.add("active");
  }
  if (data.laserActive && data.laserRemaining > 0) {
    _resumeLaserRemaining = data.laserRemaining;
    laserActive = true; laserEndTime = performance.now() + 1000000; // Temporalmente infinito
    if (!laserBeamEl) { laserBeamEl = document.createElement("div"); laserBeamEl.className = "laser-beam"; laserContainerEl.appendChild(laserBeamEl); }
    laserBeamEl.classList.add("active"); laserBeamEl.style.display = "";
    laserBeamEl.style.left = playerX + PLAYER_WIDTH / 2 + "px";
    laserBeamEl.style.height = (GAME_HEIGHT - 30 - PLAYER_HEIGHT) + "px";
  }
  if (data.slowActive && (data.slowElapsedTime || 0) < SLOW_DURATION) {
    _resumeSlowActive = true; _resumeSlowElapsedTime = data.slowElapsedTime || 0;
    slowActive = true; slowElapsedTime = _resumeSlowElapsedTime;
  }

  marsSequenceTriggered = false; cutsceneActive = false; postMarsDeathImmunity = false;
  playerEl.classList.remove("landing-sequence","launch-anim","landing-anim","takeoff-anim");
  playerEl.style.transition = ""; marsHorizonEl.style.opacity = "0"; containerEl.style.background = "";
  if (earthHorizonEl) earthHorizonEl.style.display = "none";

  level = data.level; difficultyFactor = data.difficultyFactor; gameDuration = data.gameDuration;
  fastModeActive = data.fastModeActive;
  swingcopterModeActive = data.swingcopterModeActive || false;
  if (data.swingcopterDirection !== undefined) swingcopterDirection = data.swingcopterDirection;
  if (fastModeActive) swingcopterModeActive = false;
  if (swingcopterModeActive) fastModeActive = false;
  if (data.marsSequenceTriggered) marsSequenceTriggered = true;

  // Fix #3: restaurar contadores de sesión para que los logros no se concedan incorrectamente
  sessionPowerupsCollected  = data.sessionPowerupsCollected  || 0;
  sessionShieldsCollected   = data.sessionShieldsCollected   || 0;
  sessionLasersCollected    = data.sessionLasersCollected    || 0;
  sessionSlowsCollected     = data.sessionSlowsCollected     || 0;
  sessionLaserFiredCount    = data.sessionLaserFiredCount    || 0;
  sessionAsteroidsDestroyed = data.sessionAsteroidsDestroyed || 0;

  if (data.meteors && Array.isArray(data.meteors)) {
    data.meteors.forEach(sm => {
      const trailAngle = -(Math.atan2(sm.speedX || 0, sm.speed) * 180 / Math.PI);
      meteors.push({
        x: sm.x, y: sm.y, size: sm.size, speed: sm.speed, speedX: sm.speedX || 0,
        crater: 1 + Math.floor(Math.random() * 3), trailAngle, sprite: null
      });
    });
  }
  if (data.powerups && Array.isArray(data.powerups)) {
    data.powerups.forEach(p => {
      const powerEl = document.createElement("div");
      powerEl.dataset.type = p.type; powerEl.className = "powerup";
      powerEl.style.width = p.size + "px"; powerEl.style.height = p.size + "px";
      powerEl.style.left = p.x + "px"; powerEl.style.top = p.y + "px";
      stageEl.appendChild(powerEl);
      powerups.push({ x: p.x, y: p.y, size: p.size, speed: p.speed, el: powerEl, type: p.type });
    });
  }
  // Fix #1: restaurar proyectiles auto-láser en vuelo (canvas)
  if (data.projectiles && Array.isArray(data.projectiles)) {
    data.projectiles.forEach(pd => {
      projectiles.push({ x: pd.x, y: pd.y, width: pd.width, height: pd.height, drawHeight: 30, beta: false });
    });
  }

  updateBestScoreUI(); updateLivesUI(); updateModeUI();
  if (fastModeActive) playerEl.classList.add("fast-visual");
  else playerEl.classList.remove("fast-visual");
  lastRenderedLives = -1;
  playerEl.style.transform = `translate3d(${playerX}px, 0, 0)`;
  currentLevelBase = (level - 1) * 1000; nextLevelTarget = level * 1000;
  updateDifficultyByLevel();

  hideOverlay();
  playerEl.style.display = "block";
  pauseBtn.style.display = "flex"; muteBtn.style.display = "flex";
  if (skipBtn) skipBtn.classList.add("hidden");
  if (pauseContinueBtn) pauseContinueBtn.classList.add("hidden");
  updateTouchControlsVisibility();
  _resumeAutoShootElapsed = data.autoShootElapsed || 0; 
  startResumeCountdown();
}

function updateSlotButtonUI() {
  if (slotSelectBtn) {
    slotSelectBtn.textContent = activeSlot !== null
      ? `${i18n.t("label_slot","Slot")} ${activeSlot + 1}`
      : i18n.t("btn_no_slot","Sin Slot");
  }
}

// Eventos
if (slotSelectBtn) {
  slotSelectBtn.addEventListener("click", () => {
    if (!canInteract(slotSelectBtn)) return;
    saveLoadTitle.textContent = i18n.t("label_select_slot", "SELECCIONAR SLOT");
    saveLoadTitle.dataset.mode = 'select'; // Bug #4: marcar modo con data attribute
    renderSlots('select'); saveLoadOverlay.classList.remove("hidden");
  });
}
if (btnSaveQuit) {
  btnSaveQuit.addEventListener("click", () => {
    if (activeSlot !== null) {
      saveToSlot(activeSlot);
      if (typeof updateSlotInfoPanel === 'function') updateSlotInfoPanel();
    } else {
      saveLoadTitle.textContent = i18n.t("label_select_slot", "SELECCIONAR SLOT");
      saveLoadTitle.dataset.mode = 'save';
      renderSlots('save');
      saveLoadOverlay.classList.remove("hidden");
    }
    updateOverlayLivesInfo();
    if (btnFinishRun) btnFinishRun.classList.add("hidden");
  });
}
if (btnFinishRun) {
  btnFinishRun.addEventListener("click", () => {
    if (activeSlot !== null) localStorage.removeItem(`dodge_save_slot_${activeSlot}`);
    gameOver({ manualFinish: true });
  });
}
if (closeSLBtn) closeSLBtn.addEventListener("click", () => saveLoadOverlay.classList.add("hidden"));
if (noSlotBtn)  noSlotBtn.addEventListener("click",  () => { activeSlot = null; updateSlotButtonUI(); updateSlotInfoPanel(); saveLoadOverlay.classList.add("hidden"); playMenuClickSound(); });


