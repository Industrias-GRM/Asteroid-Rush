// ============================================================
// INICIALIZACIÓN FINAL
// ============================================================

function addMenuSounds() {
  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('mouseenter', () => { if (!btn.classList.contains('glow-btn')) playMenuHoverSound(); });
    btn.addEventListener('click', () => playMenuClickSound());
  });
}

function lazyLoadImages() {
  if (!('IntersectionObserver' in window)) return;
  const imgs = Array.from(document.querySelectorAll('img[data-src]'));
  if (imgs.length === 0) return;
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { const img = entry.target; img.src = img.dataset.src || img.src; observer.unobserve(img); }
    });
  });
  imgs.forEach(img => imageObserver.observe(img));
}

// Botón pantalla completa
if (fullscreenBtn) {
  fullscreenBtn.addEventListener('click', () => {
    playMenuClickSound();
    Platform.openTab('popup.html?fullscreen=true');
    if (Platform.isExtension) window.close();
  });
}

// Botones legales en ajustes e instrucciones
document.querySelectorAll('.legal-link-btn').forEach(btn => {
  btn.addEventListener('click', () => { const url = btn.getAttribute('data-link'); if (url) window.open(url, '_blank'); });
});

// Resize con debounce
let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(updateStageScale, 250);
});

// Limpieza al cerrar
window.addEventListener("beforeunload", () => {
  stopBackgroundMusic();
  if (autosaveInterval) clearInterval(autosaveInterval);
  stopSlowSoundEffect();
  meteors = [];
  powerups.forEach(p => { try { if (p.el) p.el.remove(); p.el = null; } catch(e) {} }); powerups = [];
  if (audioCtx && audioCtx.state !== "closed") { try { audioCtx.close(); } catch(e) {} }
});

// ============================================================
// ARRANQUE
// ============================================================

i18n.init();
updateStageScale();

const VERSION_KEY = 'dodgeVersion';
const CURRENT_VERSION = (typeof Platform !== 'undefined' && Platform.manifest && Platform.manifest.version) ? Platform.manifest.version : '1.0.0.1';

// Comprobar versión guardada: si no existe o no coincide con la actual,
// y el usuario ya había aceptado términos, mostrar popup de actualización
// (como el legal inicial pero sin idiomas). La clave se actualiza al aceptar.
function getCurrentAppVersion() {
  try {
    if (typeof Platform !== 'undefined' && Platform.manifest && Platform.manifest.version) return Platform.manifest.version;
  } catch (e) {}
  return CURRENT_VERSION;
}
function checkTermsVersionAndShowPopup() {
  try {
    const cur = getCurrentAppVersion();
    const stored = localStorage.getItem(VERSION_KEY);
    const needsUpdate = !stored || stored !== cur;
    if (!needsUpdate) return;
    const legalAccepted = localStorage.getItem('dodgeLegalAccepted') === 'true';
    if (!legalAccepted) return; // lo gestionará legal-overlay; versión se guardará al aceptar ahí
    const updOverlay = document.getElementById('terms-update-overlay');
    if (updOverlay) updOverlay.classList.remove('hidden');
  } catch (e) {}
}

// Preparar recompensa de bienvenida para instalaciones nuevas (sin versión previa)
// No guardamos VERSION_KEY aún si falta aceptación legal; se guardará al aceptar.
try {
  const storedInit = localStorage.getItem(VERSION_KEY);
  if (!storedInit) {
    const legalAcceptedInit = localStorage.getItem('dodgeLegalAccepted') === 'true';
    if (!legalAcceptedInit) {
      if (!localStorage.getItem('dodgeNickNumber') && !localStorage.getItem('dodgeUsername') && !localStorage.getItem('dodgeRewardPending')) {
        const hasBeta = localStorage.getItem('dodgeBetaMode') !== null;
        const reward = hasBeta ? 5000 : 1000;
        localStorage.setItem('dodgeRewardPending', JSON.stringify({ amount: reward, hasBeta }));
      }
    }
  } else if (storedInit !== CURRENT_VERSION) {
    // mismatch -> popup se mostrará tras i18n; no sobrescribir aún
  }
  // Repair para instalaciones afectadas por bloqueo previo (1.0): si ya aceptó pero nunca se creó el pending
  try {
    if (localStorage.getItem('dodgeLegalAccepted') === 'true' && !localStorage.getItem('dodgeRewardPending') && !localStorage.getItem('dodgeNickNumber') && !localStorage.getItem('dodgeUsername') && !localStorage.getItem('dodgePlayerNickname') && localStorage.getItem('dodgeFirstGameDone') !== 'true') {
      const hasBeta2 = localStorage.getItem('dodgeBetaMode') !== null;
      const reward2 = hasBeta2 ? 5000 : 1000;
      // solo si nunca recibió polvo inicial (evitar duplicar)
      try { const d = parseInt(localStorage.getItem('dodgeDust')||'0',10); if (d===0) localStorage.setItem('dodgeRewardPending', JSON.stringify({ amount: reward2, hasBeta: hasBeta2 })); } catch(e){ localStorage.setItem('dodgeRewardPending', JSON.stringify({ amount: reward2, hasBeta: hasBeta2 })); }
    }
  } catch(e){}
} catch (e) {}

function showRewardScreen() {
  const ov = document.getElementById('reward-overlay');
  const desc = document.getElementById('reward-desc');
  const btn = document.getElementById('reward-collect-btn');
  if (!ov || !desc || !btn) return;

  let pending;
  try {
    pending = JSON.parse(localStorage.getItem('dodgeRewardPending'));
  } catch (e) { return; }
  if (!pending) return;

  const rewardKey = pending.hasBeta ? 'reward_beta_desc' : 'reward_welcome_desc';
  const fallback = 'Has recibido ' + pending.amount.toLocaleString() + ' 💨 de regalo por ' + (pending.hasBeta ? 'ser jugador BETA' : 'unirte a Asteroid Rush') + '!';
  desc.textContent = i18n.t(rewardKey, fallback).replace('{amount}', pending.amount.toLocaleString());
  ov.classList.remove('hidden');

  btn.onclick = () => {
    _dust += pending.amount;
    saveEconomy();
    updateDustUI();
    localStorage.removeItem('dodgeRewardPending');
    ov.classList.add('hidden');
    playLevelUp();
    checkOldSkinsReward();
    showSkinRewardScreen();
  };
}

// Cargar estado de skins en memoria (sistema PNG apiladas)
activeParts = loadActiveParts();
looks = loadLooks();

// Crítico para LCP: solo HUD esencial síncrono
updateBestScoreUI();
updateLivesUI();
updateSkinClass();
updateOverlayLivesInfo();
updateProgressBar(0, 1);

// No crítico para LCP: diferir a idle para reducir Max Task 123ms y Script Compilation 91ms
const _idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
_idle(() => {
  if (typeof updateSlotInfoPanel === 'function') updateSlotInfoPanel();
  checkSkinUnlocksFromBest();
});
_idle(() => generateSkinSelector());
_idle(() => {
  initGameControls();
  initLegalTerms();
  if (typeof initTermsUpdateOverlay === 'function') initTermsUpdateOverlay();
  initSettingsPanel();
  initNameInputListeners();
  addMenuSounds();
  initMenuModeTabs();
  addModeSelectorListeners();
  lazyLoadImages();
  loadSettingsFromStorage();
  initShopPanel();
  initSkinCustomizer();
  updateShopUI();
  updateDustUI();
  // Tras inicializar overlays, comprobar si hay que mostrar popup de términos actualizados
  try { if (typeof checkTermsVersionAndShowPopup === 'function') checkTermsVersionAndShowPopup(); } catch (e) {}
});

// También comprobar de forma síncrona por si i18n ya está listo (fallback)
setTimeout(() => { try { if (typeof checkTermsVersionAndShowPopup === 'function') checkTermsVersionAndShowPopup(); } catch (e) {} }, 500);

// Jugadores que ya vieron el tutorial antes de esta versión y aún
// no tienen número de piloto: mostrar panel de asignación
if (localStorage.getItem('dodgeLegalAccepted') === 'true' &&
    localStorage.getItem('dodgeTutorialSeen') === 'true' &&
    !localStorage.getItem('dodgeNickNumber')) {
  setTimeout(() => { if (typeof showUsernamePrompt === 'function') showUsernamePrompt(); }, 2000);
}

// Botón de skins en functions-panel
const skinBtn = document.getElementById('skin-btn');
if (skinBtn) {
  skinBtn.addEventListener('click', () => {
    if (!canInteract(skinBtn)) return;
    if (gameRunning && !gamePaused) togglePause();
    closeAllModals();
    openSkinCustomizer();
  });
}

// Version mostrada en el panel de ajustes (evita hardcode en HTML)
try {
  const vEl = document.getElementById("app-version");
  if (vEl) vEl.textContent = Platform.manifest.version || "";

  // Trigger secreto: 7 clics en la versión activan el modo BETA
  if (vEl) {
    vEl.addEventListener("click", () => {
      if (betaModeActive) return; // ya activo
      betaVersionClickCount++;
      if (betaVersionClickTimer) clearTimeout(betaVersionClickTimer);
      betaVersionClickTimer = setTimeout(() => { betaVersionClickCount = 0; }, 1500);
      if (betaVersionClickCount >= BETA_VERSION_CLICKS) {
        betaVersionClickCount = 0;
        activateBetaMode();
      }
    });
  }
} catch (e) {}

// Refrescar cachés del SW al entrar (solo si términos aceptados y versión vigente)
if (typeof hasValidTermsForServer === 'function' && hasValidTermsForServer()) {
  sendMessageToSW("checkAndRefreshCaches", {}).catch(() => {});
}

// --- Sincronización horaria (1 vez al día + carga de sync data) ---
(function _syncTimeOnStartup() {
  if (typeof hasValidTermsForServer === 'function' && !hasValidTermsForServer()) return;
  const today = new Date(Date.now()).toISOString().slice(0, 10);
  const lastSync = localStorage.getItem('dodgeLastSyncDate') || '';
  if (typeof _loadSyncData === 'function') _loadSyncData();
  if (lastSync !== today) {
    if (typeof requestSyncServerTime === 'function') requestSyncServerTime();
  }
  if (typeof _checkPromoTransition === 'function') _checkPromoTransition();
})();

// Actualizar indicador de noticias al abrir el juego (solo si términos aceptados)
try {
  if (typeof hasValidTermsForServer === 'function' && !hasValidTermsForServer()) {} else if (typeof updateNewsIndicator === 'function') {
    void updateNewsIndicator();
  }
} catch (e) {}
try {
  if (typeof hasValidTermsForServer === 'function' && !hasValidTermsForServer()) {} else if (typeof renderNews === 'function') void renderNews();
} catch (e) {}


// Cuentas desactivadas temporalmente ("Próximamente"):
// limpia restos de sesiones antiguas y pinta el panel en modo bloqueado
initAuthUI();

// Ocultar nave en menú
if (!gameRunning) playerEl.style.display = "none";

// Inicializar el renderer canvas de meteoritos/proyectiles/explosiones.
try { if (typeof FxCanvas !== "undefined") FxCanvas.init(); } catch (e) {}

// Arrancar loop global (FPS en standby + vidas)
requestGameLoopFrame();

// Recompensa de skins antiguas: diferida si es primera vez (se da tras tutorial 10k)
setTimeout(function() {
  const isFirstGame = localStorage.getItem('dodgeFirstGameDone') !== 'true';
  if (!localStorage.getItem('dodgeRewardPending') && !isFirstGame) {
    checkOldSkinsReward();
    showSkinRewardScreen();
  } else if (isFirstGame) {
    // No mostrar nada aún, se entregará al completar la partida tutorial
  }
  // Recompensas llaveros + logro Marte trío
  try { if (typeof checkBeta10ShipsKeychainReward === 'function') checkBeta10ShipsKeychainReward(); } catch(e) {}
  try { if (typeof checkMarsKeychainReward === 'function') checkMarsKeychainReward(); } catch(e) {}
  try { if (typeof checkAchievements === 'function' && !betaModeActive) checkAchievements(); } catch(e) {}
}, 2000);

// Comprobar notificación de promo cada 5 minutos (solo si términos aceptados)
setInterval(() => {
  if (typeof hasValidTermsForServer === 'function' && !hasValidTermsForServer()) return;
  if (typeof _checkPromoTransition === 'function') _checkPromoTransition();
  if (typeof checkPromoNotification === 'function') checkPromoNotification();
}, 5 * 60 * 1000);
