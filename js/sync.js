// ============================================================
// MENSAJERÍA CON SERVICE WORKER
// ============================================================

function hasValidTermsForServer() {
  try {
    if (localStorage.getItem('dodgeLegalAccepted') !== 'true') return false;
    const cur = (typeof getCurrentAppVersion === 'function') ? getCurrentAppVersion() : ((typeof Platform !== 'undefined' && Platform.manifest && Platform.manifest.version) ? Platform.manifest.version : '1.0.0.2');
    const stored = localStorage.getItem('dodgeVersion');
    if (stored && stored !== cur) return false;
    if (!stored && localStorage.getItem('dodgeLegalAccepted') === 'true') {
      const upd = document.getElementById('terms-update-overlay');
      if (upd && !upd.classList.contains('hidden')) return false;
    }
    const upd2 = document.getElementById('terms-update-overlay');
    if (upd2 && !upd2.classList.contains('hidden')) return false;
    const legalOv = document.getElementById('legal-overlay');
    if (legalOv && !legalOv.classList.contains('hidden')) return false;
    return true;
  } catch(e) { return false; }
}
// Bloquear guardado local hasta aceptar términos (excepto claves legales y pending de bienvenida)
try {
  const _origLSSet = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(k, v) {
    const allow = ['dodgeLegalAccepted','dodgeVersion','dodgeRewardPending'];
    if (typeof k === 'string' && k.startsWith('dodge') && !allow.includes(k) && !hasValidTermsForServer()) return;
    return _origLSSet(k, v);
  };
} catch(e) {}
function sendMessageToSW(type, payload) {
  const serverTypes = ['submitScore','getLeaderboard','isScoreInTop100','checkAndRefreshCaches','getNews','getNewsWithCooldown','syncServerTime','getSyncData'];
  if (serverTypes.includes(type) && !hasValidTermsForServer()) {
    return Promise.resolve({ ok: false, error: 'terms_not_accepted' });
  }
  return new Promise((resolve) => {
    if (!Platform.isExtension) {
      // Modo web: ejecutar directamente la lógica del service-worker
      if (serverTypes.includes(type) && !hasValidTermsForServer()) { resolve({ ok: false, error: 'terms_not_accepted' }); return; }
      SWFallback.handle(type, payload).then(resolve).catch(() => resolve({ ok: false, error: "web_mode" }));
      return;
    }
    if (!chrome?.runtime?.sendMessage) { resolve({ ok: false, error: "chrome.runtime no disponible." }); return; }
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) resolve({ ok: false, error: `Error SW: ${chrome.runtime.lastError.message}` });
      else resolve(response || { ok: false, error: "Sin respuesta del SW." });
    });
  });
}

function broadcastGameStateChange(key, value) {
  try { localStorage.setItem(`dodge${key}`, value); } catch (e) {}
  try { Platform.sendMessage({ type: 'broadcastGameState', key, value }); } catch (e) {}
}

function applyGameStateChange(key, value) {
  const numValue = parseInt(value, 10);
  switch (key) {
    case 'bestScoreNormal':      bestScoreNormal = numValue; break;
    case 'bestScoreFast':        bestScoreFast   = numValue; break;
    case 'bestScoreSwingcopter': bestScoreSwingcopter = numValue; break;
    case 'livesNormal':          livesNormal  = Math.min(MAX_LIVES, Math.max(0, numValue)); break;
    case 'livesFast':            livesFast    = Math.min(MAX_LIVES, Math.max(0, numValue)); break;
    case 'livesSwingcopter':     livesSwingcopter = Math.min(MAX_LIVES, Math.max(0, numValue)); break;
    case 'accumulatedLifeTimeNormal':      accumulatedLifeTimeNormal = numValue; break;
    case 'accumulatedLifeTimeFast':        accumulatedLifeTimeFast   = numValue; break;
    case 'accumulatedLifeTimeSwingcopter': accumulatedLifeTimeSwingcopter = numValue; break;
    case 'currentSkin':   currentSkin   = Math.min(TOTAL_SKINS, Math.max(1, numValue)); updateShipVisuals(); break;
    case 'unlockedSkins': unlockedSkins = Math.min(TOTAL_SKINS, Math.max(1, numValue)); break;
    case 'fastModeActive':
      fastModeActive = value === 'true' || value === true;
      if (fastModeActive) swingcopterModeActive = false;
      break;
    case 'swingcopterModeActive':
      swingcopterModeActive = value === 'true' || value === true;
      if (swingcopterModeActive) fastModeActive = false;
      break;
  }
  if (key === 'fastModeActive' || key === 'swingcopterModeActive') updateModeUI();
}

window.addEventListener('storage', (e) => {
  if (!e.key || !e.key.startsWith('dodge')) return;
  const val = e.newValue;
  const num = parseInt(val, 10);
  switch (e.key) {
    case 'dodgeLivesNormal':          livesNormal = num; break;
    case 'dodgeLivesFast':            livesFast   = num; break;
    case 'dodgeLivesSwingcopter':     livesSwingcopter = num; break;
    case 'dodgeLifeAccumNormal':      accumulatedLifeTimeNormal = num; break;
    case 'dodgeLifeAccumFast':        accumulatedLifeTimeFast   = num; break;
    case 'dodgeLifeAccumSwingcopter': accumulatedLifeTimeSwingcopter = num; break;
    case 'dodgeBestScoreNormal':      bestScoreNormal = num; break;
    case 'dodgeBestScoreFast':        bestScoreFast   = num; break;
    case 'dodgeBestScoreSwingcopter': bestScoreSwingcopter = num; break;
    case 'dodgeUnlockedSkins':        unlockedSkins = num; break;
    case 'dodgeCurrentSkin':          currentSkin = num; updateShipVisuals(); break;
    case 'dodgeFastModeActive':
      fastModeActive = (val === 'true');
      if (fastModeActive) swingcopterModeActive = false;
      updateModeUI(); break;
    case 'dodgeSwingcopterModeActive':
      swingcopterModeActive = (val === 'true');
      if (swingcopterModeActive) fastModeActive = false;
      updateModeUI(); break;
  }
  updateLivesUI(); updateOverlayLivesInfo(); updateBestScoreUI(); generateSkinSelector();
});

Platform.onMessage((request, sender, sendResponse) => {
  if (request.type === 'broadcastGameState') {
    try {
      applyGameStateChange(request.key, request.value);
      updateBestScoreUI(); updateLivesUI(); updateOverlayLivesInfo(); generateSkinSelector();
      sendResponse({ ok: true });
    } catch (e) { sendResponse({ ok: false, error: e.message }); }
  }
  if (request.type === 'updateLivesRealtime') {
    try {
      const { mode, lives, accumulatedTime } = request;
      if (mode === 'normal')           { livesNormal      = Math.min(MAX_LIVES, Math.max(0, lives)); accumulatedLifeTimeNormal      = accumulatedTime; }
      else if (mode === 'fast')        { livesFast         = Math.min(MAX_LIVES, Math.max(0, lives)); accumulatedLifeTimeFast        = accumulatedTime; }
      else if (mode === 'swingcopter') { livesSwingcopter  = Math.min(MAX_LIVES, Math.max(0, lives)); accumulatedLifeTimeSwingcopter = accumulatedTime; }
      try { localStorage.setItem("dodgeLivesNormal", livesNormal); } catch(e) {}
      try { localStorage.setItem("dodgeLifeAccumNormal", accumulatedLifeTimeNormal); } catch(e) {}
      try { localStorage.setItem("dodgeLivesFast", livesFast); } catch(e) {}
      try { localStorage.setItem("dodgeLifeAccumFast", accumulatedLifeTimeFast); } catch(e) {}
      try { localStorage.setItem("dodgeLivesSwingcopter", livesSwingcopter); } catch(e) {}
      try { localStorage.setItem("dodgeLifeAccumSwingcopter", accumulatedLifeTimeSwingcopter); } catch(e) {}
      try { localStorage.setItem("dodgeLastLifeUpdateTime", Date.now()); } catch(e) {}
      updateLivesUI(); updateOverlayLivesInfo();
      sendResponse({ ok: true });
    } catch (e) { sendResponse({ ok: false, error: e.message }); }
  }
});
