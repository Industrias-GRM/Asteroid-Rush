// ============================================================
// CACHÉ DE ELEMENTOS DOM
// ============================================================

const playerEl = document.getElementById("player");
const shieldEl = playerEl.querySelector(".shield");
const laserContainerEl = document.getElementById("laser-container");
let laserBeamEl = null;
const autoChargeFillEl = document.querySelector(".auto-charge-fill");
const autoChargeBarEl = document.querySelector(".auto-charge-bar");

const containerEl = document.getElementById("game-container");
const stageEl = document.getElementById("stage");

const overlayEl = document.getElementById("center-overlay");
const overlayTitleEl = document.getElementById("overlay-title");
const overlayTextEl = document.getElementById("overlay-text");
const overlayModeInfo = document.getElementById("overlay-mode-info");
const restartBtn = document.getElementById("restart-btn");
const overlayLivesInfo = document.querySelector("#center-overlay .overlay-lives-info");

const modeSelectorWrapper = document.querySelector(".mode-selector-wrapper");
const modeSelectBtn = document.getElementById("mode-select-btn");
const modeOptions = document.getElementById("mode-options");
const currentModeText = document.getElementById("current-mode-text");

const deleteDataBtn = document.getElementById("delete-data-btn");
const confirmOverlay = document.getElementById("confirm-overlay");
const btnConfirmYes = document.getElementById("btn-confirm-yes");
const btnConfirmNo = document.getElementById("btn-confirm-no");

const nameInputOverlay = document.getElementById("name-input-overlay");
const playerNicknameInput = document.getElementById("player-nickname");
const btnSubmitName = document.getElementById("btn-submit-name");
const btnCancelName = document.getElementById("btn-cancel-name");
const nameErrorMessage = document.getElementById("name-error-message");

const btnReviewRate = document.getElementById("btn-review-rate");
const btnReviewLater = document.getElementById("btn-review-later");
const btnReviewNever = document.getElementById("btn-review-never");

const importStatusOverlay = document.getElementById("import-status-overlay");
const importStatusCard = document.getElementById("import-status-card");
const importStatusTitle = document.getElementById("import-status-title");
const importStatusMessage = document.getElementById("import-status-message");
const importStatusCloseBtn = document.getElementById("import-status-close-btn");

const livesHeartsEl = document.getElementById("lives-hearts");
const progressBarFillEl = document.getElementById("progress-bar-fill");
const progressBarTextEl = document.getElementById("progress-text");

const skinSelectorEl = document.getElementById("skin-selector");

// ---- Skins avanzado (PNG apiladas) ----
const skinCustomizeOverlay = document.getElementById("skin-customize-overlay");
const skinCustomizeCloseBtn = document.getElementById("skin-customize-close-btn");
const skinPreviewShip = document.getElementById("preview-ship");
const lookNameInput = document.getElementById("look-name-input");
const saveLookBtn = document.getElementById("save-look-btn");
const toggleFavoriteBtn = document.getElementById("toggle-favorite-btn");

const achievementsBtn = document.getElementById("achievements-btn");
const achievementsOverlay = document.getElementById("achievements-overlay");
const achievementsCloseBtn = document.getElementById("achievements-close-btn");
const achievementsListEl = document.getElementById("achievements-list");

const newsBtn = document.getElementById("news-btn");
const newsOverlay = document.getElementById("news-overlay");
const newsCloseBtn = document.getElementById("news-close-btn");

const instructionsBtn = document.getElementById("instructions-btn");
const instructionsOverlay = document.getElementById("instructions-overlay");
const closeInstructionsBtn = document.getElementById("close-instructions-btn");

const leaderboardTabs = document.querySelectorAll(".leaderboard-tab");
const leaderboardListEl = document.getElementById("leaderboard-list");
const worldRecordStatusEl = document.getElementById("world-record-status");
const worldRecordTop3El = document.getElementById("world-record-top3");
const refreshLeaderboardBtn = document.getElementById("refresh-leaderboard-btn");
const leaderboardRefreshBtn = document.getElementById("leaderboard-refresh-btn");

const leaderboardOverlay = document.getElementById("leaderboard-overlay");
const leaderboardTitleEl = document.getElementById("leaderboard-title");
const leaderboardTabsOverlay = document.querySelectorAll(".leaderboard-tab-overlay");
const leaderboardCloseBtn = document.getElementById("leaderboard-close-btn");

const muteBtn = document.getElementById("mute-btn");
const pauseBtn = document.getElementById("pause-btn");
const skipBtn = document.getElementById("skip-btn");
const pauseContinueBtn = document.getElementById("pause-continue-btn");

const earthHorizonEl = document.getElementById("earth-horizon");
const marsHorizonEl = document.getElementById("mars-horizon");
const marsOverlayEl = document.getElementById("mars-mission-overlay");
const btnMarsContinue = document.getElementById("btn-mars-continue");
const btnMarsFinish = document.getElementById("btn-mars-finish");

const fullscreenBtn = document.getElementById('fullscreen-btn');

const settingsBtn = document.getElementById("settings-btn");
const settingsOverlay = document.getElementById("settings-overlay");
const settingsCloseBtn = document.getElementById("settings-close-btn");

// 1.0.0.4: elementos externos que entran en el recálculo del popup.
const topBarEl = document.getElementById("top-bar");
const topBarTitleEl = topBarEl ? topBarEl.querySelector("h1") : null;
const gameFooterEl = document.getElementById("game-footer");
const gameWrapperEl = document.getElementById("game-wrapper");

const slotSelectBtn = document.getElementById("slot-select-btn");
const btnSaveQuit = document.getElementById("btn-save-quit");
const btnFinishRun = document.getElementById("btn-finish-run");
const saveLoadOverlay = document.getElementById("save-load-overlay");
const slotsContainer = document.getElementById("slots-container");
const closeSLBtn = document.getElementById("close-sl-btn");
const noSlotBtn = document.getElementById("no-slot-btn");
const saveLoadTitle = document.getElementById("save-load-title");

const rememberModeToggle = document.getElementById("remember-mode-toggle");
const showFpsToggle = document.getElementById("show-fps-toggle");
const smoothAnimationsToggle = document.getElementById("smooth-animations-toggle");
const lightEffectsToggle = document.getElementById("light-effects-toggle");
const safeModeToggle = document.getElementById("safe-mode-toggle");
const soundToggle = document.getElementById("sound-toggle");
const musicToggle = document.getElementById("music-toggle");
const sfxToggle = document.getElementById("sfx-toggle");
const touchControlsToggle = document.getElementById("touch-controls-toggle");

const worldRecordToggle = document.getElementById("world-record-toggle");
const worldRecordNote = document.getElementById("world-record-note");
const promoNotifToggle = document.getElementById("promo-notif-toggle");
const exportDataBtn = document.getElementById("export-data-btn");
const importDataBtn = document.getElementById("import-data-btn");

// ============================================================
// FULLSCREEN MODE
// ============================================================
(function handleFullscreen() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('fullscreen') === 'true') {
    document.documentElement.classList.add('fullscreen-html');
    document.body.classList.add('fullscreen-mode');
    document.title = 'ASTEROID RUSH — Fullscreen';
    if (fullscreenBtn) fullscreenBtn.style.display = 'none';
  }
})();

// ============================================================
// ESCALA DEL STAGE (base 430x480, adaptable a cada pantalla)
// ============================================================
// En el popup de extensión la ventana la dimensiona el contenido, así que
// `100vw` es circular y los max-width nunca encogen solos: si la pantalla
// (o el zoom) deja menos sitio que la base, se encoge el body a ese ancho
// y el resto (max-widths + escala del stage) se adapta solo.
function updatePopupBaseScale() {
  if (document.body.classList.contains("fullscreen-mode")) return 1;
  try {
    // Pestaña web (localhost, file://, http): viewport externo y estable,
    // puede fluir a lo ancho con tope. El popup real de extensión no entra
    // aquí (ver rama de abajo): su ventana la dimensiona el contenido.
    const isExt = (typeof Platform !== "undefined" && Platform.isExtension);
    if (!isExt) {
      document.body.classList.add("web-fluid");
      document.documentElement.classList.add("web-fluid-root");
      return 1;
    }
    const baseW = 440, baseH = 580, baseGameW = 430;
    // Solo la pantalla como referencia: la ventana del popup la dimensiona el
    // contenido (usar vw/innerWidth es circular y colapsa a una línea fina).
    // Los anchos se fijan en px explícitos, nunca con vw.
    if (!window.screen) return 1;
    const dpr = window.devicePixelRatio || 1;
    const scrW = (window.screen.availWidth || window.screen.width || 0) / dpr;
    const scrH = (window.screen.availHeight || window.screen.height || 0) / dpr;
    if (!(scrW > 0) || !(scrH > 0)) return 1;
    const s = Math.min(1, scrW / baseW, scrH / baseH);
    if (s < 1) {
      document.body.style.width = `${Math.floor(baseW * s)}px`;
      // Altura automática para no dejar hueco bajo el stage escalado.
      document.body.style.height = "auto";
      document.body.style.minHeight = "0";
      if (typeof containerEl !== "undefined" && containerEl) {
        containerEl.style.width = `${Math.floor(baseGameW * s)}px`;
      }
    } else {
      document.body.style.width = "";
      document.body.style.height = "";
      document.body.style.minHeight = "";
      if (typeof containerEl !== "undefined" && containerEl) {
        containerEl.style.width = "";
      }
    }
    return s;
  } catch (e) {}
  return 1;
}

// 1.0.0.4: todo lo que queda FUERA del #stage entra en el mismo recálculo
// que este (lo de dentro —menú, HUD, overlays— escala solo por transform;
// los táctiles van por --stage-scale). Cubre popup, fullscreen y web-fluid,
// en ambas direcciones. Todo en px explícitos (nada de vw). Cerca de 1 manda
// el CSS base. El contenedor reserva 120·s para este cromo: encaje exacto.
function updateExternalScale(s) {
  const clear = (typeof s !== "number" || isNaN(s) || (s >= 0.98 && s <= 1.02));
  try {
    const px = (v) => `${Math.round(v * 10) / 10}px`;
    if (topBarEl) {
      topBarEl.style.height = clear ? "" : px(50 * s);
      // El min-height:50px del CSS pisaría la altura escalada: también escala.
      topBarEl.style.minHeight = clear ? "" : px(50 * s);
      topBarEl.style.gap = clear ? "" : px(6 * s);
      topBarEl.style.padding = clear ? "" : `0 ${px(8 * s)} ${px(10 * s)}`;
    }
    if (settingsBtn) {
      settingsBtn.style.width = clear ? "" : px(32 * s);
      settingsBtn.style.height = clear ? "" : px(32 * s);
      settingsBtn.style.fontSize = clear ? "" : px(18 * s);
      // El radio también escala: si no, con zoom se ve más/menos arqueado.
      settingsBtn.style.borderRadius = clear ? "" : px(8 * s);
      // El grosor acompaña al tamaño para no verse desproporcionado.
      settingsBtn.style.borderWidth = clear ? "" : px(1 * s);
    }
    if (typeof fullscreenBtn !== "undefined" && fullscreenBtn) {
      fullscreenBtn.style.width = clear ? "" : px(32 * s);
      fullscreenBtn.style.height = clear ? "" : px(32 * s);
      fullscreenBtn.style.borderRadius = clear ? "" : px(8 * s);
      fullscreenBtn.style.borderWidth = clear ? "" : px(1 * s);
    }
    if (typeof instructionsBtn !== "undefined" && instructionsBtn) {
      instructionsBtn.style.minWidth = clear ? "" : px(90 * s);
      instructionsBtn.style.maxWidth = clear ? "" : px(140 * s);
      instructionsBtn.style.height = clear ? "" : px(30 * s);
      instructionsBtn.style.fontSize = clear ? "" : px(11 * s);
      instructionsBtn.style.padding = clear ? "" : `0 ${px(10 * s)}`;
      instructionsBtn.style.borderRadius = clear ? "" : px(8 * s);
      instructionsBtn.style.borderWidth = clear ? "" : px(1 * s);
    }
    if (topBarTitleEl) topBarTitleEl.style.fontSize = clear ? "" : px(22 * s);
    if (gameFooterEl) {
      gameFooterEl.style.fontSize = clear ? "" : px(12 * s);
      gameFooterEl.style.marginTop = clear ? "" : px(10 * s);
    }
    // El rectángulo del juego también: radio y grosor acompañan al factor
    // para no curvarse ni verse desproporcionados con zoom.
    // Bases por modo (popup: 16px/2px, fullscreen: 16px/3px).
    if (typeof containerEl !== "undefined" && containerEl) {
      const fsb = document.body.classList.contains("fullscreen-mode");
      containerEl.style.borderRadius = clear ? "" : px(16 * s);
      containerEl.style.borderWidth = clear ? "" : px((fsb ? 3 : 2) * s);
    }
    // El espacio entre textos y rectángulo también escala: si gap/paddings
    // quedan fijos, al hacer zoom el hueco crece en proporción. Bases por
    // modo (popup: 2/10/20, fullscreen: 10/0/0).
    if (gameWrapperEl) {
      const fs = document.body.classList.contains("fullscreen-mode");
      const gapBase = fs ? 10 : 2;
      gameWrapperEl.style.gap = clear ? "" : px(gapBase * s);
      if (!fs) {
        gameWrapperEl.style.paddingTop = clear ? "" : px(10 * s);
        gameWrapperEl.style.paddingBottom = clear ? "" : px(20 * s);
      } else {
        gameWrapperEl.style.paddingTop = "";
        gameWrapperEl.style.paddingBottom = "";
      }
    }
  } catch (e) {}
}
function updateStageScale() {
  if (!containerEl || !stageEl) return;
  // Primero: encoger la base si la pantalla es más estrecha que el popup.
  updatePopupBaseScale();
  // La escala se calcula sobre el ancho real y se sincroniza la altura del
  // contenedor con el stage escalado para no dejar hueco (alargado abajo).
  const cw = containerEl.clientWidth || 430;
  if (cw <= 0) return;
  const raw = cw / 430;
  // Solo tope inferior: con deszoom (viewport grande) la escala debe crecer
  // libre para que el stage llene el contenedor. Todo lo exterior la sigue
  // linealmente, así las proporciones se conservan a cualquier zoom.
  const scale = Math.max(0.2, raw);
  document.documentElement.style.setProperty("--stage-scale", scale);
  // Los halos exteriores también escalan (si no, dominan al encoger).
  // Sin suelo: la sombra solo pinta, nunca come interior ni rompe layout.
  document.documentElement.style.setProperty("--sh-scale", scale > 0.01 ? scale : 1);
  stageEl.style.transformOrigin = "top left";
  stageEl.style.transform = `scale(${scale})`;
  // transform no afecta al layout: la altura del contenedor la manda
  // siempre el aspect-ratio 430/480 a partir del ancho (el alto sigue al ancho).
  // Se limpia cualquier inline para no pelear con él.
  containerEl.style.height = "";
  // Toda la pantalla entra en el resize: externos con la misma escala del stage.
  try { updateExternalScale(scale); } catch (e) {}
}

window.addEventListener("resize", updateStageScale);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", updateStageScale);
} else {
  updateStageScale();
}
