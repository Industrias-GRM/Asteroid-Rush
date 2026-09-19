// ============================================================
// FUNCIONES DE ACTUALIZACIÓN DE UI
// ============================================================

function canInteract(btn) {
  try {
    const tu = document.getElementById('terms-update-overlay');
    const lo = document.getElementById('legal-overlay');
    if ((tu && !tu.classList.contains('hidden')) || (lo && !lo.classList.contains('hidden'))) return false;
  } catch (e) {}
  if (typeof isTutorialLocked === 'function' && isTutorialLocked()) {
    const playBtn = document.getElementById('menu-play-btn');
    if (playBtn && !playBtn.classList.contains('glow-btn')) playBtn.classList.add('glow-btn');
    if (btn && btn.classList.contains('glow-btn')) return true;
    const glowing = document.querySelectorAll('.glow-btn');
    if (glowing.length > 0) {
      glowing.forEach(b => {
        b.classList.remove('attention-shake');
        void b.offsetWidth;
        b.classList.add('attention-shake');
        setTimeout(() => b.classList.remove('attention-shake'), 600);
      });
      return false;
    }
    // Fallback: bloquear igualmente si es lock sin glow
    if (playBtn) {
      playBtn.classList.remove('attention-shake');
      void playBtn.offsetWidth;
      playBtn.classList.add('attention-shake');
      setTimeout(() => playBtn.classList.remove('attention-shake'), 600);
    }
    return false;
  }
  const glowingButtons = document.querySelectorAll('.glow-btn');
  if (glowingButtons.length > 0) {
    if (btn && btn.classList.contains('glow-btn')) return true;
    glowingButtons.forEach(b => {
      b.classList.remove('attention-shake');
      void b.offsetWidth;
      b.classList.add('attention-shake');
      setTimeout(() => b.classList.remove('attention-shake'), 600);
    });
    return false;
  }
  return true;
}

function updateGraphicsClasses() {
  const smooth = localStorage.getItem(SETTINGS_KEYS.smoothAnimations) !== "false";
  const lights  = localStorage.getItem(SETTINGS_KEYS.lightEffects)    !== "false";
  document.body.classList.toggle("no-smooth", !smooth);
  document.body.classList.toggle("no-lights", !lights);
  document.body.classList.toggle("safe-mode-active", safeModeOn);
}

function updateProgressBar(percent, currentLevel) {
  const now = Date.now();
  if (now - lastProgressBarUpdate < 100) return;
  lastProgressBarUpdate = now;
  if (progressBarFillEl) progressBarFillEl.style.width = Math.max(0, Math.min(100, percent)) + "%";
  if (progressBarTextEl && currentLevel !== undefined)
    progressBarTextEl.textContent = `${i18n.t("hud_level_prefix")} ${currentLevel}`;
}

function updateModeIndicator() {
  const tabs = document.querySelectorAll("#menu-section .mode-tab");
  const indicator = document.querySelector(".mode-indicator");
  if (!indicator || tabs.length === 0) return;
  // Batch DOM READ phase: encontrar índice activo sin forzar reflow extra
  let activeIdx = 0;
  for (let i = 0; i < tabs.length; i++) {
    if (tabs[i].classList.contains("active")) { activeIdx = i; break; }
  }
  const activeTab = tabs[activeIdx];
  if (!activeTab) {
    const tabWidth = 100 / tabs.length;
    // Batch WRITE phase en rAF para separar reads/writes (evita layout thrashing)
    requestAnimationFrame(() => {
      indicator.style.left = `${activeIdx * tabWidth}%`;
      indicator.style.width = `calc(${tabWidth}% - 3px)`;
    });
    return;
  }
  // Usar rAF para agrupar lecturas (offsetLeft/offsetWidth) y escrituras
  requestAnimationFrame(() => {
    // READ agrupado
    const left = activeTab.offsetLeft;
    const width = activeTab.offsetWidth;
    // WRITE agrupado
    indicator.style.left = `${left}px`;
    indicator.style.width = `${width}px`;
  });
}

function updatePlayButtonState(){
  try {
    const pb = document.getElementById("menu-play-btn");
    if (!pb) return;
    const hasLives = getCurrentLives() > 0;
    const isShowingNoLives = pb.innerHTML.includes("RECARGANDO") || pb.textContent.includes("RECARGANDO") || pb.textContent.includes("Sin vidas") || pb.textContent.includes("¡Sin vidas");
    if (!hasLives) {
      if (!isShowingNoLives) {
        const noLivesHtml = i18n.t('btn_no_lives_shop', '¡RECARGANDO! COMPRAR VIDAS');
        // Soporta valor con o sin <br> (si el mensaje no trae <br>, lo insertamos tras ¡RECARGANDO! / RECHARGING!)
        pb.innerHTML = noLivesHtml.includes('<br>') ? noLivesHtml : noLivesHtml.replace('! ', '!<br>').replace('!','!<br>');
        pb.classList.remove("glow-btn");
        pb.style.fontSize = "15px";
        pb.style.lineHeight = "1.1";
        pb.style.whiteSpace = "normal";
        pb.style.padding = "10px 14px";
        pb.style.width = "250px";
        pb.style.height = "62px";
        pb.style.flex = "0 0 250px";
        pb.style.display = "flex";
        pb.style.alignItems = "center";
        pb.style.justifyContent = "center";
        pb.style.textAlign = "center";
        pb.style.transition = "none";
        pb.style.background = "rgba(80, 227, 194, 0.2)";
        pb.style.borderColor = "#50e3c2";
        pb.style.color = "#50e3c2";
        pb.style.transform = "none";
      }
    } else {
      if (isShowingNoLives) {
        pb.textContent = i18n.t("btn_start", "JUGAR");
        pb.classList.remove("glow-btn");
        pb.style.fontSize = "";
        pb.style.lineHeight = "";
        pb.style.whiteSpace = "";
        pb.style.padding = "";
        pb.style.width = "250px";
        pb.style.height = "62px";
        pb.style.flex = "0 0 250px";
        pb.style.display = "flex";
        pb.style.alignItems = "center";
        pb.style.justifyContent = "center";
        pb.style.textAlign = "center";
        pb.style.transition = "none";
        pb.style.background = "";
        pb.style.borderColor = "";
        pb.style.color = "";
        pb.style.transform = "";
        setTimeout(()=>{ if(pb) pb.style.transition = ""; }, 50);
      }
    }
  } catch(e) {}
}
function updateModeUI() {
  // READ phase: calcular modo antes de mutar DOM
  const newMode = fastModeActive ? 'fast' : swingcopterModeActive ? 'swingcopter' : 'normal';
  const prevMode = document.querySelector("#menu-section .mode-tab.active")?.dataset.mode || null;
  const modeTextKey = fastModeActive ? "mode_fast" : swingcopterModeActive ? "mode_zigzag" : "mode_normal";
  const overlayKey = fastModeActive ? "overlay_mode_fast" : swingcopterModeActive ? "overlay_mode_zigzag" : "overlay_mode_normal";

  // WRITE phase: agrupar todas las mutaciones DOM juntas
  if (currentModeText) currentModeText.textContent = i18n.t(modeTextKey);
  overlayModeInfo.textContent = i18n.t(overlayKey);
  document.querySelectorAll("#menu-section .mode-tab").forEach(tab => {
    const m = tab.dataset.mode;
    tab.classList.toggle("active", m === newMode);
  });
  if (prevMode && prevMode !== newMode && typeof playModeSound === 'function') playModeSound(newMode);
  // Deferir medición (read) + posicionamiento (write) al siguiente frame
  updateModeIndicator();
  // Resto de actualizaciones (ya están throttled internamente)
  updateBestScoreUI();
  updateLivesUI();
  updateOverlayLivesInfo();
  syncLeaderboardWithGameMode();
  updatePlayButtonState();
}

let _scoreSpansInitialized = false;
let _scoreSpans = [];
let _bestScoreSpans = [];
let _scoreDigitCount = 6;

function updateBestScoreUI() {
  const scoreDisplay = document.getElementById("score-display");
  if (!scoreDisplay) return;
  const intRaw  = Math.floor(score).toString();
  const bestRaw = Math.floor(getCurrentBestScore()).toString();
  const digits = Math.max(6, intRaw.length, bestRaw.length);
  const intScore  = intRaw.padStart(digits, '0');
  const bestScore = bestRaw.padStart(digits, '0');
  const lines = scoreDisplay.querySelectorAll(".score-line");
  if (!_scoreSpansInitialized || digits !== _scoreDigitCount) {
    [lines[0], lines[1]].forEach((line, idx) => {
      if (!line) return;
      line.innerHTML = '';
      const spans = [];
      for (let i = 0; i < digits; i++) {
        const s = document.createElement('span');
        line.appendChild(s);
        spans.push(s);
      }
      if (idx === 0) _scoreSpans = spans;
      else _bestScoreSpans = spans;
    });
    _scoreSpansInitialized = true;
    _scoreDigitCount = digits;
  }
  for (let i = 0; i < digits; i++) {
    if (_scoreSpans[i] && _scoreSpans[i].textContent !== intScore[i])
      _scoreSpans[i].textContent = intScore[i];
    if (_bestScoreSpans[i] && _bestScoreSpans[i].textContent !== bestScore[i])
      _bestScoreSpans[i].textContent = bestScore[i];
  }
}

function updateLivesHearts(lives, maxLives = 10) {
  if (!livesHeartsEl) return;
  let html = '';
  const fullHearts   = Math.floor(lives / 2);
  const hasHalfHeart = lives % 2 === 1;
  for (let i = 0; i < fullHearts; i++) html += '<img src="images/Full.png" class="heart-img" alt="corazón lleno">';
  if (hasHalfHeart) html += '<img src="images/Half.png" class="heart-img" alt="medio corazón">';
  const emptyHearts = maxLives / 2 - fullHearts - (hasHalfHeart ? 1 : 0);
  for (let i = 0; i < emptyHearts; i++) html += '<img src="images/Empty.png" class="heart-img" alt="corazón vacío">';
  livesHeartsEl.innerHTML = html;
}

function updateLivesUI() {
  const now = Date.now();
  if (now - lastLivesUIUpdate < 200) return;
  lastLivesUIUpdate = now;
  const currentLives = getCurrentLives();
  const currentAccumulatedTime = getCurrentAccumulatedLifeTime();
  updateLivesHearts(currentLives, MAX_LIVES);
  updateRechargeUI(currentLives, currentAccumulatedTime);
}

function updateRechargeUI(currentLives, currentAccumulatedTime) {
  const totalInterval = fastModeActive ? FAST_MODE_LIFE_INTERVAL_MS : (swingcopterModeActive ? SWINGCOPTER_LIFE_INTERVAL_MS : LIFE_INTERVAL_MS);
  const timeRemaining = Math.max(0, totalInterval - currentAccumulatedTime);
  const seconds = Math.ceil(timeRemaining / 1000);
  const newText = currentLives >= MAX_LIVES ? "MAX" : `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
  document.querySelectorAll(".otr").forEach(el => {
    if (el.textContent !== newText) { el.textContent = newText; el.style.color = currentLives >= MAX_LIVES ? "#4caf50" : "#ffd700"; }
  });
  const percent = currentLives >= MAX_LIVES ? 100 : Math.min(100, (currentAccumulatedTime / totalInterval) * 100);
  const newWidth = percent.toFixed(1) + "%";
  document.querySelectorAll(".overlay-recharge-fill").forEach(el => { if (el.style.width !== newWidth) el.style.width = newWidth; });
}

function updateOverlayLivesInfo() {
  const currentLives = getCurrentLives();
  const currentAccumulatedTime = getCurrentAccumulatedLifeTime();
  const heartsContainers = document.querySelectorAll('.hearts-row');
  if (heartsContainers.length > 0 && currentLives !== lastHeartsLives) {
    let html = '';
    const fullHearts   = Math.floor(currentLives / 2);
    const hasHalfHeart = currentLives % 2 === 1;
    for (let i = 0; i < fullHearts; i++)  html += '<img src="images/Full.png" class="heart-img" alt="corazón lleno">';
    if (hasHalfHeart)                      html += '<img src="images/Half.png" class="heart-img" alt="medio corazón">';
    const pairCount = Math.ceil(MAX_LIVES / 2);
    const filled = fullHearts + (hasHalfHeart ? 1 : 0);
    for (let i = filled; i < pairCount; i++) html += '<img src="images/Empty.png" class="heart-img" alt="corazón vacío">';
    heartsContainers.forEach(el => el.innerHTML = html);
    lastHeartsLives = currentLives;
  }
  updateRechargeUI(currentLives, currentAccumulatedTime);
}

function updateLivesInGameRealtime() {
  const currentLives = getCurrentLives();
  if (currentLives !== lastRenderedLives) {
    updateLivesHearts(currentLives, MAX_LIVES);
    updateOverlayLivesInfo();
    lastRenderedLives = currentLives;
  }
}

function updateGlobalLives(timestamp) {
  // Usamos reloj real (Date.now) para que pausas largas / suspensiÃ³n del sistema
  // no rompan el cÃ¡lculo al comparar timestamps de distintos orÃ­genes.
  const now = Date.now();
  if (!lastLifeUpdateTime) lastLifeUpdateTime = now;
  const delta = now - lastLifeUpdateTime;
  lastLifeUpdateTime = now;
  if (delta <= 0) return;
  let livesChanged = false;

  if (livesNormal < MAX_LIVES) {
    accumulatedLifeTimeNormal += delta;
    if (accumulatedLifeTimeNormal >= LIFE_INTERVAL_MS) {
      const toAdd = Math.floor(accumulatedLifeTimeNormal / LIFE_INTERVAL_MS);
      accumulatedLifeTimeNormal %= LIFE_INTERVAL_MS;
      const before = livesNormal;
      livesNormal = Math.min(MAX_LIVES, livesNormal + toAdd);
      if (livesNormal > before && !gamePaused && !overlayEl.classList.contains("hidden")) { playLifeUp(); livesChanged = true; }
    }
  } else { accumulatedLifeTimeNormal = 0; }

  if (livesFast < MAX_LIVES) {
    accumulatedLifeTimeFast += delta;
    if (accumulatedLifeTimeFast >= FAST_MODE_LIFE_INTERVAL_MS) {
      const toAdd = Math.floor(accumulatedLifeTimeFast / FAST_MODE_LIFE_INTERVAL_MS);
      accumulatedLifeTimeFast %= FAST_MODE_LIFE_INTERVAL_MS;
      const before = livesFast;
      livesFast = Math.min(MAX_LIVES, livesFast + toAdd);
      if (livesFast > before && !gamePaused && !overlayEl.classList.contains("hidden")) { playLifeUp(); livesChanged = true; }
    }
  } else { accumulatedLifeTimeFast = 0; }

  if (livesSwingcopter < MAX_LIVES) {
    accumulatedLifeTimeSwingcopter += delta;
    if (accumulatedLifeTimeSwingcopter >= SWINGCOPTER_LIFE_INTERVAL_MS) {
      const toAdd = Math.floor(accumulatedLifeTimeSwingcopter / SWINGCOPTER_LIFE_INTERVAL_MS);
      accumulatedLifeTimeSwingcopter %= SWINGCOPTER_LIFE_INTERVAL_MS;
      const before = livesSwingcopter;
      livesSwingcopter = Math.min(MAX_LIVES, livesSwingcopter + toAdd);
      if (livesSwingcopter > before && !gamePaused && !overlayEl.classList.contains("hidden")) { playLifeUp(); livesChanged = true; }
    }
  } else { accumulatedLifeTimeSwingcopter = 0; }

  if (livesChanged) {
    saveLives();
    if (typeof updatePlayButtonState === 'function') updatePlayButtonState();
    try {
      const shopOv = document.getElementById('shop-overlay');
      if (shopOv && !shopOv.classList.contains('hidden') && typeof _renderTab === 'function' && typeof _currentTab !== 'undefined') {
        _renderTab(_currentTab);
      }
    } catch(e) {}
  }
  updateOverlayLivesInfo();
  if (typeof refreshLivesShopLiveCounters === 'function') refreshLivesShopLiveCounters();
}

// syncSoundToggleUI está definida en settings.js (Bug #1 corregido: eliminada definición duplicada)

// ============================================================
// ECONOMÍA — actualizaciones de UI
// ============================================================
let _lastDustHud = -1;

function updateDustUI() {
  const el = document.getElementById("dust-hud");
  if (!el) return;
  const d = getDust();
  if (d !== _lastDustHud) {
    el.textContent = `💨 ${d.toLocaleString()}`;
    _lastDustHud = d;
  }
}

function closeAllModals() {
  settingsOverlay.classList.add("hidden");
  instructionsOverlay.classList.add("hidden");
  leaderboardOverlay.classList.add("hidden");
  saveLoadOverlay.classList.add("hidden");
  if (importStatusOverlay) importStatusOverlay.classList.add("hidden");
  if (newsOverlay) newsOverlay.classList.add("hidden");
  confirmOverlay.classList.add("hidden");
  confirmOverlay.style.zIndex = "";
  settingsOverlay.style.zIndex = "";
  nameInputOverlay.classList.add("hidden");
  if (typeof achievementsOverlay !== 'undefined') achievementsOverlay.classList.add("hidden");
  const shopOverlayEl = document.getElementById("shop-overlay");
  if (shopOverlayEl) shopOverlayEl.classList.add("hidden");
  const rankingOverlay = document.getElementById("ranking-animation-overlay");
  if (rankingOverlay) {
    rankingOverlay.classList.add("hidden");
    // Limpiar estado de error de ranking al cerrar cualquier modal
    rankingOverlay.querySelectorAll('.rank-error-text, .explosion, .rank-error-flash, .rank-error-close-btn').forEach(el => el.remove());
    document.querySelectorAll('[data-diploma-clone]').forEach(el => el.remove());
    document.querySelectorAll('[data-diploma-parent-pos]').forEach(el => { el.style.position = ''; el.style.overflow = ''; el.removeAttribute('data-diploma-parent-pos'); el.removeAttribute('data-diploma-parent-overflow'); });
    const shipC = document.getElementById('rank-ship-container'); if (shipC) shipC.style.background = '';
    const diploma = document.getElementById('diploma-mini-preview'); if (diploma) diploma.style.opacity = '';
    const btns = document.getElementById('rank-anim-btns'); if (btns) { btns.style.display = ''; btns.classList.remove('show'); }
  }
  const livesShopOv = document.getElementById('lives-shop-overlay');
  if (livesShopOv) livesShopOv.classList.add('hidden');
  if (typeof _livesShopRefreshInterval !== 'undefined' && _livesShopRefreshInterval) { clearInterval(_livesShopRefreshInterval); _livesShopRefreshInterval = null; }
  const superOfferOv = document.getElementById('super-offer-overlay');
  if (superOfferOv) superOfferOv.classList.add('hidden');
  if (modeSelectorWrapper) modeSelectorWrapper.classList.remove("open");
  if (modeOptions) modeOptions.classList.add("hidden");
  if (skinCustomizeOverlay) skinCustomizeOverlay.classList.add("hidden");
  // Limpiar texto de error del ranking en cualquier cierre
  try { if (typeof worldRecordStatusEl !== 'undefined' && worldRecordStatusEl) worldRecordStatusEl.textContent = ''; } catch(e) {}
  try { window.__submitError = ''; } catch(e) {}
}
