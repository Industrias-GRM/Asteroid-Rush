// ============================================================
// VALIDACIÓN DE NOMBRE
// ============================================================

function validatePlayerName(name) {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 20) return false;
  return !/[<>"'&]/g.test(trimmed);
}
function showNameError()  { playerNicknameInput.classList.add("error"); nameErrorMessage.classList.add("show"); playerNicknameInput.focus(); }
function clearNameError() { playerNicknameInput.classList.remove("error"); nameErrorMessage.classList.remove("show"); }

function initNameInputListeners() {
  playerNicknameInput.addEventListener("input", clearNameError);
  playerNicknameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter")  { e.preventDefault(); const name = playerNicknameInput.value.trim(); if (!validatePlayerName(name)) { showNameError(); return; } clearNameError(); btnSubmitName.click(); }
    if (e.key === "Escape") { e.preventDefault(); nameInputOverlay.classList.add("hidden"); clearNameError(); }
  });
}

btnSubmitName.addEventListener("click", async () => {
  const name = playerNicknameInput.value.trim();
  if (!validatePlayerName(name)) { showNameError(); return; }
  clearNameError(); nameInputOverlay.classList.add("hidden");
  // Guardar para compartir: si es numérico se usa como nick, si no se guarda tal cual pero al ranking solo van números
  localStorage.setItem("dodgePlayerNickname", name);
  const scoreToAnimate = pendingScore;
  let sendName = name;
  const pid = (typeof pilotIdFromName === 'function' ? pilotIdFromName(name) : null);
  if (pid) sendName = pid;
  else {
    const digits = name.replace(/\D/g, '');
    if (digits) sendName = digits.slice(-6);
    else if (typeof getPilotNumber === 'function' && getPilotNumber()) sendName = getPilotNumber();
  }
  const submitPromise = trySubmitScoreToLeaderboard(pendingMode, scoreToAnimate, sendName, pendingDuration);
  runRankingAnimation(scoreToAnimate, submitPromise);
});
btnCancelName.addEventListener("click", () => { nameInputOverlay.classList.add("hidden"); clearNameError(); });

// ============================================================
// NÚMERO DE PILOTO — Asignación aleatoria única (sin cuentas)
// Lo que se asigna es solo un número, comprobado contra los
// récords del ranking para evitar duplicados. La palabra que va
// delante ("Astronauta") se muestra en el idioma activo del juego.
// El número NO se genera al arrancar: se asigna cuando el jugador
// pulsa el botón de INVITADO en el panel de inicio (tras aceptar
// los términos y completar el tutorial). Los botones de cuenta de
// ese panel quedan desactivados ("Próximamente").
//
// Si la versión del piloto cambia (PILOT_NICK_VERSION), el
// número anterior se descarta y se asigna uno nuevo.
// ============================================================

// Extrae el identificador numérico final de un nombre del ranking
function pilotIdFromName(name) {
  const m = String(name || '').match(/(\d+)\s*$/);
  return m ? m[1] : null;
}

// Compone el nombre visible de una entrada del ranking.
// En la base de datos SOLO se guarda el número ("7575"); la palabra
// localizada ("Astronauta"/"Astronaut"/...) se añade aquí, al mostrar,
// en el idioma activo del juego. Nombres antiguos con texto pasan tal cual.
function formatPilotEntry(entryName) {
  const s = String(entryName ?? '').trim();
  if (!/^\d+$/.test(s)) return entryName;
  const word = (typeof i18n !== 'undefined' && i18n.t) ? (i18n.t('astronaut') || 'Astronauta') : 'Astronauta';
  return word + ' ' + s;
}

// Devuelve el número del piloto SOLO si ya fue asignado (no crea nada)
function getPilotNumber() {
  return localStorage.getItem('dodgeNickNumber');
}

// Genera y persiste el número del piloto (única llamada autorizada).
// Si el nombre guardado no es un número válido (ej. nombre antiguo
// de texto como "Pedro"), genera uno nuevo y avisa al jugador.
function assignPilotNumber() {
  let num = localStorage.getItem('dodgeNickNumber');

  // Si ya hay un número válido, reutilizarlo
  if (num && /^\d{3,6}$/.test(num)) return num;

  // Si hay un nombre guardado pero NO es número → nombre antiguo → descartar
  if (num && !/^\d{3,6}$/.test(num)) {
    localStorage.removeItem('dodgeNickNumber');
    num = null;
  }

  // Comprobar también los campos legacy
  if (!num) {
    const legacy = localStorage.getItem('dodgeUsername') || localStorage.getItem('dodgePlayerNickname') || '';
    if (legacy && !/^\d{3,6}$/.test(legacy.trim())) {
      // Nombre antiguo de texto → borrar y generar nuevo
      localStorage.removeItem('dodgeUsername');
      localStorage.removeItem('dodgePlayerNickname');
    }
  }

  // Generar número nuevo
  num = String(Math.floor(1000 + Math.random() * 9000));
  localStorage.setItem('dodgeNickNumber', num);
  try { localStorage.setItem('dodgeNickToastPending', 'true'); } catch (e) {}
  return num;
}

// Nombre completo del piloto: palabra localizada + número ('' si aún sin asignar)
function getPlayerNickname() {
  const num = getPilotNumber();
  if (!num) return '';
  const word = (typeof i18n !== 'undefined' && i18n.t) ? (i18n.t('astronaut') || 'Astronauta') : 'Astronauta';
  return word + ' ' + num;
}

// Comprueba que el número no esté ya presente en los récords del ranking.
// Solo se llama tras asignar un NUEVO piloto (guest), no en cada recarga.
// Si ya tienes número y aparece en el ranking es tu propio récord → no se cambia.
async function verifyPilotNumberUniqueness(opts = {}) {
  const signal = opts.signal;
  const myNum = getPilotNumber();
  if (!myNum) return;
  const modes = ['normal', 'fast', 'swingcopter'];
  const maxAttempts = 10;
  for (const mode of modes) {
    if (signal?.aborted) return;
    try {
      const res = await sendMessageToSW("getLeaderboard", { mode, forceRefresh: false });
      if (res && res.ok && Array.isArray(res.data) && res.data.some(e => pilotIdFromName(e.name) === myNum)) {
        let attempts = 0;
        while (attempts < maxAttempts) {
          if (signal?.aborted) return;
          try { localStorage.removeItem('dodgeNickNumber'); } catch(e) {}
          let newNum;
          try { newNum = assignPilotNumber(); } catch(e) { break; }
          let collision = false;
          for (const m of modes) {
            if (signal?.aborted) return;
            try {
              const r = await sendMessageToSW("getLeaderboard", { mode: m, forceRefresh: false });
              if (r && r.ok && Array.isArray(r.data) && r.data.some(e => pilotIdFromName(e.name) === newNum)) { collision = true; break; }
            } catch(e) {}
          }
          if (!collision) break;
          attempts++;
        }
        try { showPilotAssignOverlay(); } catch(e) {}
        return;
      }
    } catch (e) {}
  }
}

// Muestra el overlay dedicado con el número asignado y botón de aceptar
function showPilotAssignOverlay() {
  try {
    if (localStorage.getItem('dodgeNickToastPending') !== 'true') return;
    localStorage.removeItem('dodgeNickToastPending');
    const ov = document.getElementById('pilot-assign-overlay');
    const nickEl = document.getElementById('pilot-assign-nick');
    if (!ov || !nickEl || typeof i18n === 'undefined') return;
    nickEl.textContent = getPlayerNickname();
    ov.classList.remove('hidden');
  } catch (e) {}
}

const btnPilotAssignOk = document.getElementById('btn-pilot-assign-ok');
if (btnPilotAssignOk) btnPilotAssignOk.addEventListener('click', () => {
  playMenuClickSound();
  document.getElementById('pilot-assign-overlay')?.classList.add('hidden');
});

// ============================================================
// PANEL DE INICIO (username-overlay) — botones de cuenta
// visibles pero desactivados; solo INVITADO es operativo.
// ============================================================

const usernameOverlayEl = document.getElementById('username-overlay');
const usernameChoiceEl = document.getElementById('username-choice');
const btnPilotLogin = document.getElementById('btn-username-login');
const btnPilotRegister = document.getElementById('btn-username-register');
const btnPilotGuest = document.getElementById('btn-username-guest');

function showUsernamePrompt() {
  // Flujo nuevo: invitado por defecto, panel oculto. Asignar silenciosamente.
  if (getPilotNumber()) return;
  try { assignPilotNumber(); } catch(e) {}
  try { if (typeof updateAccountUI === 'function') updateAccountUI(); } catch(e) {}
  // No mostrar overlay. Solo mostrar el toast de piloto asignado si aún no se vio.
  try { showPilotAssignOverlay(); } catch(e) {}
  // Verificar unicidad en background sin bloquear
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 5000);
    verifyPilotNumberUniqueness({ signal: ctrl.signal }).finally(() => clearTimeout(to));
  } catch(e) {}
  // Nada de usernameOverlay visible: modo invitado default
  if (usernameOverlayEl) usernameOverlayEl.classList.add('hidden');
}

function hideUsernamePrompt() {
  if (usernameOverlayEl) usernameOverlayEl.classList.add('hidden');
}

let _isVerifyingPilot = false;
if (btnPilotGuest) btnPilotGuest.addEventListener('click', async () => {
  if (_isVerifyingPilot) return;
  _isVerifyingPilot = true;
  if (btnPilotGuest) btnPilotGuest.disabled = true;
  playMenuClickSound();
  try { assignPilotNumber(); } catch(e) {}
  if (typeof updateAccountUI === 'function') try { updateAccountUI(); } catch(e) {}
  hideUsernamePrompt();
  try { showPilotAssignOverlay(); } catch(e) {}
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 5000);
    await verifyPilotNumberUniqueness({ signal: ctrl.signal });
    clearTimeout(to);
  } catch(e) {}
  if (typeof updateAccountUI === 'function') try { updateAccountUI(); } catch(e) {}
  try {
    const pending = JSON.parse(localStorage.getItem('dodgeRewardPending'));
    if (pending && !pending.hasBeta && typeof showRewardScreen === 'function') {
      setTimeout(showRewardScreen, 300);
    }
  } catch (e) {}
  _isVerifyingPilot = false;
  if (btnPilotGuest) btnPilotGuest.disabled = false;
});

if (btnPilotLogin) btnPilotLogin.addEventListener('click', () => { /* Cuentas: próximamente */ });
if (btnPilotRegister) btnPilotRegister.addEventListener('click', () => { /* Cuentas: próximamente */ });

// ============================================================
// EVENTOS DE TECLADO
// ============================================================

window.addEventListener("keydown", (e) => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.target && e.target.isContentEditable) return;
  if (e.key === "Escape") {
    const rankingOverlay = document.getElementById("ranking-animation-overlay");
    if (rankingOverlay && !rankingOverlay.classList.contains("hidden")) {
      e.preventDefault();
      rankingOverlay.classList.add("hidden");
      return;
    }
  }
  if (["ArrowLeft","ArrowRight","ArrowUp"," ","Enter","w","W","a","A","d","D"].includes(e.key)) e.preventDefault();
  if (e.key==="ArrowLeft"  || e.key==="a" || e.key==="A") { keys.left  = true; keys.lastDir = "left"; }
  if (e.key==="ArrowRight" || e.key==="d" || e.key==="D") { keys.right = true; keys.lastDir = "right"; }
  if (e.key==="ArrowUp"    || e.key==="w" || e.key==="W") keys.up = true;
  if ((e.key===" " || e.key==="Enter") && !e.repeat) {
    // Durante tutorial guiado el espacio no hace nada
    if (typeof tutorialGameActive !== 'undefined' && tutorialGameActive) return;
    const countdownOverlay = document.getElementById('countdown-overlay');
    if (countdownOverlay && !countdownOverlay.classList.contains('hidden')) { skipCountdown(); return; }

    const anyBlockingOverlay = () => {
      const legalOverlay = document.getElementById('legal-overlay');
      const termsUpdateOverlay = document.getElementById('terms-update-overlay');
      const instrOverlay = document.getElementById('instructions-overlay');
      const leaderOverlay = document.getElementById('leaderboard-overlay');
      const shopOverlay = document.getElementById('shop-overlay');
      const newsOverlay = document.getElementById('news-overlay');
      const achOverlay = document.getElementById('achievements-overlay');
      const rankAnimOverlay = document.getElementById('ranking-animation-overlay');
      const skinOverlay = document.getElementById('skin-customize-overlay');
      return !nameInputOverlay.classList.contains("hidden")
        || (typeof usernameOverlayEl !== 'undefined' && usernameOverlayEl && !usernameOverlayEl.classList.contains("hidden"))
        || (typeof document !== 'undefined' && (() => { const pa = document.getElementById('pilot-assign-overlay'); return pa && !pa.classList.contains('hidden'); })())
        || (legalOverlay    && !legalOverlay.classList.contains("hidden"))
        || (termsUpdateOverlay && !termsUpdateOverlay.classList.contains("hidden"))
        || (instrOverlay    && !instrOverlay.classList.contains("hidden"))
        || (leaderOverlay   && !leaderOverlay.classList.contains("hidden"))
        || (shopOverlay     && !shopOverlay.classList.contains("hidden"))
        || (newsOverlay     && !newsOverlay.classList.contains("hidden"))
        || (achOverlay      && !achOverlay.classList.contains("hidden"))
        || (rankAnimOverlay && !rankAnimOverlay.classList.contains("hidden"))
        || (skinOverlay     && !skinOverlay.classList.contains("hidden"))
        || (confirmOverlay  && !confirmOverlay.classList.contains("hidden"))
        || !settingsOverlay.classList.contains("hidden")
        || !saveLoadOverlay.classList.contains("hidden");
    };

    if (gameRunning) {
      if (document.getElementById('tutorial-overlay') && !document.getElementById('tutorial-overlay').classList.contains("hidden")) return;
      if (anyBlockingOverlay()) return;
      togglePause();
    } else if (!anyBlockingOverlay()) {
      startGame();
    }
  }
});

window.addEventListener("keyup", (e) => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.key==="ArrowLeft"  || e.key==="a" || e.key==="A") { keys.left  = false; if (keys.right) keys.lastDir = "right"; }
  if (e.key==="ArrowRight" || e.key==="d" || e.key==="D") { keys.right = false; if (keys.left)  keys.lastDir = "left"; }
  if (e.key==="ArrowUp"    || e.key==="w" || e.key==="W") keys.up = false;
});

window.addEventListener("blur", () => {
  keys = { left: false, right: false, up: false, lastDir: null };
  if (!gameRunning) return;
  if (cutsceneActive) {
    if      (activeCutsceneName === 'earthLaunch') skipEarthLaunch();
    else if (activeCutsceneName === 'marsLanding') skipMarsLanding();
    else if (activeCutsceneName === 'marsTakeoff') skipMarsTakeoff();
    else if (activeCutsceneName === 'death') skipDeathSequence();
  }
  if (gameRunning && !gamePaused) togglePause();
});

restartBtn.addEventListener("click", startGame);
const menuPlayBtn = document.getElementById("menu-play-btn");
if (menuPlayBtn) menuPlayBtn.addEventListener("click", startGame);
const gameoverCloseBtn = document.getElementById("gameover-close-btn");
if (gameoverCloseBtn) gameoverCloseBtn.addEventListener("click", () => {
  document.getElementById("gameover-overlay").classList.add("hidden");
  setOverlayMode("menu");
  updateOverlayLivesInfo();
  if (btnFinishRun) btnFinishRun.classList.add("hidden");
  if (btnSaveQuit) btnSaveQuit.classList.add("hidden");
});

// ============================================================
// CERRAR OVERLAYS AL HACER CLIC FUERA
// ============================================================

document.addEventListener("click", (e) => {
  if (!overlayEl.classList.contains("hidden") && !gameRunning && e.target === stageEl) {
    hideOverlay();
  }
});
document.addEventListener("click", (e) => {
  const ic = document.getElementById("instructions-content");
  if (!instructionsOverlay.classList.contains("hidden") && e.target === instructionsOverlay && !ic.contains(e.target)) instructionsOverlay.classList.add("hidden");
});
document.addEventListener("click", (e) => {
  const lc = document.getElementById("leaderboard-content");
  if (!leaderboardOverlay.classList.contains("hidden") && e.target === leaderboardOverlay && !lc.contains(e.target)) leaderboardOverlay.classList.add("hidden");
});
document.addEventListener("click", (e) => {
  const isc = document.getElementById("import-status-card");
  if (importStatusOverlay && !importStatusOverlay.classList.contains("hidden") && e.target === importStatusOverlay && !isc.contains(e.target)) hideImportStatus();
});
document.addEventListener("click", (e) => {
  const nc = document.getElementById("news-content");
  if (newsOverlay && !newsOverlay.classList.contains("hidden") && e.target === newsOverlay && !nc.contains(e.target)) newsOverlay.classList.add("hidden");
});
document.addEventListener("click", (e) => {
  const slCard = document.getElementById("save-load-card");
  if (!saveLoadOverlay.classList.contains("hidden") && e.target === saveLoadOverlay && !slCard.contains(e.target)) saveLoadOverlay.classList.add("hidden");
});
document.addEventListener("click", (e) => {
  const cc = document.getElementById("confirm-card");
  if (!confirmOverlay.classList.contains("hidden") && e.target === confirmOverlay && !cc.contains(e.target)) {
    confirmOverlay.classList.add("hidden"); confirmOverlay.style.zIndex = ""; settingsOverlay.classList.add("hidden");
  }
});
document.addEventListener("click", (e) => {
  const nic = document.getElementById("name-input-card");
  if (!nameInputOverlay.classList.contains("hidden") && e.target === nameInputOverlay && !nic.contains(e.target)) { nameInputOverlay.classList.add("hidden"); clearNameError(); }
});
