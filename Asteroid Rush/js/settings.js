// ============================================================
// PANEL DE CONFIGURACIÓN
// ============================================================

function saveSetting(key, value) {
  try { localStorage.setItem(key, value); } catch (e) {}
}

function syncSoundToggleUI() {
  if (!soundToggle) return;
  soundOn = localStorage.getItem("dodgeSoundOn") !== "false";
  soundToggle.checked = soundOn;
}

function updateSubSoundToggles(enabled) {
  if (musicToggle) {
    musicToggle.disabled = !enabled;
    musicToggle.checked = enabled ? musicOn : false;
    if (musicToggle.parentElement) {
      musicToggle.parentElement.style.opacity = enabled ? "1" : "0.5";
      musicToggle.parentElement.style.pointerEvents = enabled ? "auto" : "none";
    }
  }
  if (sfxToggle) {
    sfxToggle.disabled = !enabled;
    sfxToggle.checked = enabled ? sfxOn : false;
    if (sfxToggle.parentElement) {
      sfxToggle.parentElement.style.opacity = enabled ? "1" : "0.5";
      sfxToggle.parentElement.style.pointerEvents = enabled ? "auto" : "none";
    }
  }
}

function syncSettingsUI() {
  if (rememberModeToggle) rememberModeToggle.checked = localStorage.getItem(SETTINGS_KEYS.rememberMode) === "true";
  if (showFpsToggle)      showFpsToggle.checked = showFPS;
  if (smoothAnimationsToggle) smoothAnimationsToggle.checked = localStorage.getItem(SETTINGS_KEYS.smoothAnimations) !== "false";
  if (lightEffectsToggle)     lightEffectsToggle.checked     = localStorage.getItem(SETTINGS_KEYS.lightEffects)    !== "false";
  const hbToggle = document.getElementById("show-hitboxes-toggle");
  if (hbToggle) hbToggle.checked = showHitboxes;
  if (safeModeToggle) safeModeToggle.checked = safeModeOn;
  updateSubSoundToggles(soundOn);
  if (touchControlsToggle) touchControlsToggle.checked = touchControlsOn;
}

function loadSettingsFromStorage() {
  try {
    const rememberMode = localStorage.getItem(SETTINGS_KEYS.rememberMode) === "true";
    showFPS     = localStorage.getItem(SETTINGS_KEYS.showFPS)   === "true";
    safeModeOn  = localStorage.getItem(SETTINGS_KEYS.safeMode)  === "true";
    showHitboxes= localStorage.getItem(SETTINGS_KEYS.showHitboxes) === "true";
    touchControlsOn = localStorage.getItem(SETTINGS_KEYS.touchControls) === "true";
    const masterVolStored = parseInt(localStorage.getItem(SETTINGS_KEYS.masterVolume), 10);
    if (!isNaN(masterVolStored)) AUDIO_CONFIG.masterVolume = Math.max(0, Math.min(1, masterVolStored / 100));
    musicOn = localStorage.getItem(SETTINGS_KEYS.musicOn) !== "false";
    sfxOn   = localStorage.getItem(SETTINGS_KEYS.sfxOn)   !== "false";
    if (rememberModeToggle)      rememberModeToggle.checked      = rememberMode;
    if (showFpsToggle)           showFpsToggle.checked           = showFPS;
    if (smoothAnimationsToggle)  smoothAnimationsToggle.checked  = localStorage.getItem(SETTINGS_KEYS.smoothAnimations) !== "false";
    if (lightEffectsToggle)      lightEffectsToggle.checked      = localStorage.getItem(SETTINGS_KEYS.lightEffects)     !== "false";
    if (safeModeToggle)          safeModeToggle.checked          = safeModeOn;
    if (document.getElementById("show-hitboxes-toggle")) document.getElementById("show-hitboxes-toggle").checked = showHitboxes;
    if (musicToggle)             musicToggle.checked             = musicOn;
    if (touchControlsToggle)     touchControlsToggle.checked     = touchControlsOn;
    if (sfxToggle)               sfxToggle.checked               = sfxOn;
    const lastMode = localStorage.getItem(SETTINGS_KEYS.lastMode);
    if (rememberMode && lastMode) {
      fastModeActive        = (lastMode === "fast");
      swingcopterModeActive = (lastMode === "swingcopter");
    }
    updateModeUI();
    updateGraphicsClasses();
    updateTouchControlsVisibility();
  } catch (e) {}
}

function openSettings() {
  if (!canInteract(settingsBtn)) return;
  if (gameRunning && !gamePaused) togglePause();
  closeAllModals();
  settingsOverlay.classList.remove("hidden");
  syncSoundToggleUI();
  syncSettingsUI();
  document.getElementById("settings-panel").scrollTop = 0;
}

function closeSettings() {
  settingsOverlay.classList.add("hidden");
}

function initSettingsPanel() {
  const saved = localStorage.getItem("dodgeWorldRecordEnabled");
  worldRecordEnabled = saved !== "false";
  if (worldRecordToggle) {
    worldRecordToggle.checked = worldRecordEnabled;
    if (!worldRecordEnabled) worldRecordNote.classList.add("show");
    else worldRecordNote.classList.remove("show");
    worldRecordToggle.addEventListener("change", (e) => {
      worldRecordEnabled = e.target.checked;
      localStorage.setItem("dodgeWorldRecordEnabled", worldRecordEnabled);
      if (!worldRecordEnabled) { worldRecordNote.classList.add("show"); playSound('pause'); }
      else                     { worldRecordNote.classList.remove("show"); playSound('unpause'); }
    });
  }
  if (promoNotifToggle) {
    promoNotifToggle.checked = localStorage.getItem(SETTINGS_KEYS.promoNotifications) !== "false";
    promoNotifToggle.addEventListener("change", () => {
      saveSetting(SETTINGS_KEYS.promoNotifications, promoNotifToggle.checked);
    });
  }
  if (soundToggle) {
    soundOn = localStorage.getItem("dodgeSoundOn") !== "false";
    soundToggle.checked = soundOn;
    soundToggle.addEventListener("change", (e) => {
      soundOn = e.target.checked;
      localStorage.setItem("dodgeSoundOn", soundOn);
      updateMuteButtonUI();
      updateSubSoundToggles(soundOn);
      if (soundOn && gameRunning && !gamePaused && musicOn) startBackgroundMusic();
      else if (!soundOn) stopBackgroundMusic();
    });
  }
  if (rememberModeToggle) {
    rememberModeToggle.addEventListener("change", () => {
      saveSetting(SETTINGS_KEYS.rememberMode, rememberModeToggle.checked);
      if (!rememberModeToggle.checked) saveSetting(SETTINGS_KEYS.lastMode, "");
    });
  }
  if (showFpsToggle) {
    showFpsToggle.addEventListener("change", () => { showFPS = showFpsToggle.checked; saveSetting(SETTINGS_KEYS.showFPS, showFPS); });
  }
  if (smoothAnimationsToggle) {
    smoothAnimationsToggle.addEventListener("change", () => { saveSetting(SETTINGS_KEYS.smoothAnimations, smoothAnimationsToggle.checked); updateGraphicsClasses(); });
  }
  if (lightEffectsToggle) {
    lightEffectsToggle.addEventListener("change", () => { saveSetting(SETTINGS_KEYS.lightEffects, lightEffectsToggle.checked); updateGraphicsClasses(); });
  }
  const hbToggle = document.getElementById("show-hitboxes-toggle");
  if (hbToggle) {
    hbToggle.addEventListener("change", () => {
      showHitboxes = hbToggle.checked;
      saveSetting(SETTINGS_KEYS.showHitboxes, showHitboxes);
      if (!showHitboxes) document.querySelectorAll('.hitbox-debug').forEach(el => el.remove());
    });
  }
  if (safeModeToggle) {
    safeModeToggle.addEventListener("change", () => { safeModeOn = safeModeToggle.checked; saveSetting(SETTINGS_KEYS.safeMode, safeModeOn); updateGraphicsClasses(); });
  }
  if (touchControlsToggle) {
    touchControlsToggle.addEventListener("change", () => { touchControlsOn = touchControlsToggle.checked; saveSetting(SETTINGS_KEYS.touchControls, touchControlsOn); updateTouchControlsVisibility(); });
  }
  if (musicToggle) {
    musicToggle.addEventListener("change", () => {
      musicOn = musicToggle.checked; saveSetting(SETTINGS_KEYS.musicOn, musicOn);
      if (!musicOn) stopBackgroundMusic();
      else if (soundOn && gameRunning && !gamePaused) startBackgroundMusic();
    });
  }
  if (sfxToggle) {
    sfxToggle.addEventListener("change", () => { sfxOn = sfxToggle.checked; saveSetting(SETTINGS_KEYS.sfxOn, sfxOn); AUDIO_CONFIG.sfxVolume = sfxOn ? 0.4 : 0; });
  }
  // initPromoCodes(); // ocultado
  initBetaPanel();
}

// ============================================================
// MODO BETA
// ============================================================

// Construye dinámicamente las 7 filas de potenciadores experimentales.
function buildBetaPowerupRows() {
  const container = document.getElementById("beta-powerups-list");
  if (!container) return;
  container.innerHTML = ""; // Limpiar siempre para asegurar consistencia
  BETA_POWERUPS.forEach(p => {
    const unlockedLabel = i18n.t("beta_unlocked_at_level", "").replace("{n}", p.unlockLevel);
    const row = document.createElement("div");
    row.className = "settings-toggle-group beta-powerup-row";
    row.innerHTML = `
      <label class="settings-toggle">
        <input type="checkbox" data-beta-powerup="${p.id}">
        <span class="toggle-slider"></span>
        <span class="toggle-label"><span class="beta-powerup-icon">${p.icon}</span> ${i18n.t(p.i18n)} <span class="beta-powerup-lvl">${unlockedLabel}</span></span>
      </label>`;
    container.appendChild(row);
  });
}

// Muestra u oculta la sección beta según el estado del modo.
function applyBetaVisibility() {
  const section = document.getElementById("beta-section");
  if (!section) return;
  if (betaModeActive) section.classList.remove("hidden");
  else section.classList.add("hidden");
}

// Colapsa/expande el subgrupo de potenciadores (estilo updateSubSoundToggles).
function updateBetaPowerupsSubgroup(enabled) {
  const subgroup = document.getElementById("beta-powerups-subgroup");
  if (!subgroup) return;
  subgroup.style.opacity = enabled ? "1" : "0.5";
  subgroup.style.pointerEvents = enabled ? "auto" : "none";
  subgroup.classList.toggle("collapsed", !enabled);
}

// Activa el modo BETA (llamada desde init.js tras 7 clics en la versión).
function activateBetaMode() {
  if (betaModeActive) return;
  betaModeActive = true;
  saveSetting(SETTINGS_KEYS.betaMode, true);
  // Guardamos el estado previo del ranking y lo desactivamos mientras dure el modo beta.
  localStorage.setItem("dodgeBetaPrevWorldRecord", worldRecordEnabled ? "true" : "false");
  worldRecordEnabled = false;
  localStorage.setItem("dodgeWorldRecordEnabled", "false");
  if (worldRecordToggle) {
    worldRecordToggle.checked = false;
    worldRecordToggle.disabled = true;
    if (worldRecordToggle.parentElement) { worldRecordToggle.parentElement.style.opacity = "0.5"; worldRecordToggle.parentElement.style.pointerEvents = "none"; }
  }
  if (worldRecordNote) worldRecordNote.classList.add("show");
  applyBetaVisibility();
  // Toast reutilizando el sistema de logros.
  try {
    const toast = document.getElementById("achievement-toast");
    if (toast) {
      toast.innerHTML = `
        <div class="ach-icon" style="font-size:26px;">🧪</div>
        <div class="ach-info">
          <div class="ach-title">${i18n.t("beta_section_title")}</div>
          <div class="ach-name">${i18n.t("beta_enabled_toast")}</div>
        </div>`;
      toast.classList.add("active");
      setTimeout(() => toast.classList.remove("active"), 3500);
    }
  } catch (e) {}
  playShieldActivated();
}

// Desactiva el modo BETA y restaura el ranking a su estado previo.
function deactivateBetaMode() {
  betaModeActive = false;
  saveSetting(SETTINGS_KEYS.betaMode, false);
  const prev = localStorage.getItem("dodgeBetaPrevWorldRecord");
  worldRecordEnabled = prev !== "false"; // por defecto reactiva
  localStorage.setItem("dodgeWorldRecordEnabled", worldRecordEnabled);
  localStorage.removeItem("dodgeBetaPrevWorldRecord");
  if (worldRecordToggle) {
    worldRecordToggle.disabled = false;
    worldRecordToggle.checked = worldRecordEnabled;
    if (worldRecordToggle.parentElement) { worldRecordToggle.parentElement.style.opacity = "1"; worldRecordToggle.parentElement.style.pointerEvents = "auto"; }
  }
  if (worldRecordNote) { if (!worldRecordEnabled) worldRecordNote.classList.add("show"); else worldRecordNote.classList.remove("show"); }
  applyBetaVisibility();
  playSound("unpause");
}



function initBetaPanel() {
  // Recargar desde localStorage por si el estado global no se sincronizó correctamente
  betaModeActive = localStorage.getItem(SETTINGS_KEYS.betaMode) === "true";
  betaPowerupsEnabled = localStorage.getItem(SETTINGS_KEYS.betaPowerups) === "true";
  const storedStart = parseInt(localStorage.getItem(SETTINGS_KEYS.betaStartScore), 10);
  betaStartingScore = (!isNaN(storedStart) && storedStart >= 0) ? storedStart : 0;
  betaFlags.betaBomb        = localStorage.getItem(SETTINGS_KEYS.betaBomb) === "true";
  betaFlags.betaMultiLaser  = localStorage.getItem(SETTINGS_KEYS.betaMultiLaser) === "true";
  betaFlags.betaFreeze      = localStorage.getItem(SETTINGS_KEYS.betaFreeze) === "true";
  betaFlags.betaGhost       = localStorage.getItem(SETTINGS_KEYS.betaGhost) === "true";
  betaFlags.betaMagnet      = localStorage.getItem(SETTINGS_KEYS.betaMagnet) === "true";

  buildBetaPowerupRows();
  applyBetaVisibility();

  // Si al cargar ya estaba activo el modo beta, forzamos ranking desactivado.
  if (betaModeActive) {
    worldRecordEnabled = false;
    if (worldRecordToggle) {
      worldRecordToggle.checked = false;
      worldRecordToggle.disabled = true;
      if (worldRecordToggle.parentElement) { worldRecordToggle.parentElement.style.opacity = "0.5"; worldRecordToggle.parentElement.style.pointerEvents = "none"; }
    }
    if (worldRecordNote) worldRecordNote.classList.add("show");
  }

  const toggle = document.getElementById("beta-powerups-toggle");
  const input  = document.getElementById("beta-start-score-input");
  const disableBtn = document.getElementById("beta-disable-btn");

  if (toggle) {
    toggle.checked = betaPowerupsEnabled;
    updateBetaPowerupsSubgroup(betaPowerupsEnabled);
    toggle.addEventListener("change", () => {
      betaPowerupsEnabled = toggle.checked;
      saveSetting(SETTINGS_KEYS.betaPowerups, betaPowerupsEnabled);
      updateBetaPowerupsSubgroup(betaPowerupsEnabled);
      playMenuClickSound();
    });
  }
  if (input) {
    input.value = betaStartingScore;
    input.addEventListener("change", () => {
      const val = parseInt(input.value, 10);
      betaStartingScore = (!isNaN(val) && val >= 0) ? val : 0;
      if (isNaN(val) || val < 0) input.value = 0;
      saveSetting(SETTINGS_KEYS.betaStartScore, betaStartingScore);
    });
  }
  if (disableBtn) {
    disableBtn.addEventListener("click", () => {
      if (!canInteract(disableBtn)) return;
      deactivateBetaMode();
    });
  }
  // Toggle dual mode
  const dualToggle = document.getElementById("beta-dual-toggle");
  if (dualToggle) {
    dualToggle.checked = localStorage.getItem(SETTINGS_KEYS.dualMode) === "true";
    dualToggle.addEventListener("change", () => {
      saveSetting(SETTINGS_KEYS.dualMode, dualToggle.checked);
      _dualEnabled = dualToggle.checked;
      playMenuClickSound();
    });
  }

  // Sub-toggles individuales de cada potenciador.
  document.querySelectorAll("[data-beta-powerup]").forEach(el => {
    const def = BETA_POWERUPS.find(p => p.id === el.dataset.betaPowerup);
    if (!def) return;
    el.checked = !!betaFlags[def.state];
    el.addEventListener("change", () => {
      betaFlags[def.state] = el.checked;
      saveSetting(def.key, el.checked);
    });
  });
}

// Eventos del panel
settingsBtn.addEventListener("click", openSettings);
settingsCloseBtn.addEventListener("click", closeSettings);
document.addEventListener("click", (e) => {
  const panel = document.getElementById("settings-panel");
  if (!settingsOverlay.classList.contains("hidden") && e.target === settingsOverlay && !panel.contains(e.target)) closeSettings();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !settingsOverlay.classList.contains("hidden")) closeSettings();
});

// Borrar datos
deleteDataBtn.addEventListener("click", () => {
  if (!canInteract(deleteDataBtn)) return;
  settingsOverlay.classList.remove("hidden");
  confirmOverlay.classList.remove("hidden");
  confirmOverlay.style.zIndex = "4000";
  settingsOverlay.style.zIndex = "3500";
  playMenuClickSound();
});
btnConfirmNo.addEventListener("click", () => {
  confirmOverlay.classList.add("hidden");
  confirmOverlay.style.zIndex = "";
  settingsOverlay.classList.add("hidden");
});
btnConfirmYes.addEventListener("click", () => {
  settingsOverlay.classList.add("hidden");
  confirmOverlay.classList.add("hidden");
  confirmOverlay.style.zIndex = "";
  settingsOverlay.style.zIndex = "";
  // Intentar borrar puntuaciones del ranking asociadas a este piloto (fire-and-forget)
  try {
    const rawName = (typeof getPilotNumber === 'function' ? getPilotNumber() : localStorage.getItem('dodgeNickNumber')) || localStorage.getItem('dodgeUsername') || localStorage.getItem('dodgePlayerNickname') || '';
    let safeName = String(rawName || '').trim();
    if (safeName) {
      if (typeof pilotIdFromName === 'function') { const pid = pilotIdFromName(safeName); if (pid) safeName = pid; }
      const digits = safeName.replace(/\D/g,'');
      if (digits) safeName = digits.slice(-6);
      safeName = safeName.slice(0,20);
      if (safeName && safeName !== '---') {
        try { sendMessageToSW("deleteRankingScores", { name: safeName }); } catch(e){}
      }
    }
  } catch(e) {}
  isDeletingData = true;
  meteors = [];
  powerups.forEach(p => { try { if (p.el) p.el.remove(); } catch(e) {} });
  powerups = [];
  projectiles = [];
  FxCanvas.wipe();
  stopSlowSoundEffect();
  localStorage.clear();
  resetEconomy();
  livesNormal = INITIAL_LIVES; livesFast = INITIAL_LIVES; livesSwingcopter = INITIAL_LIVES;
  accumulatedLifeTimeNormal = 0; accumulatedLifeTimeFast = 0; accumulatedLifeTimeSwingcopter = 0;
  bestScoreNormal = 0; bestScoreFast = 0; bestScoreSwingcopter = 0;
  unlockedSkins = 1; currentSkin = 1;
  confirmOverlay.style.background = "#ff4081";
  confirmOverlay.style.backdropFilter = "none";
  playHit();
  setTimeout(() => location.reload(), 500);
});
