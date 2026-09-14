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
// ESCALA DEL STAGE
// ============================================================
function updateStageScale() {
  if (!containerEl || !stageEl) return;
  // El contenedor ahora es fluido (min(430px, 100vw-10px)): con zoom alto el
  // viewport CSS se estrecha y el contenedor encoge en vez de desbordar.
  // La escala se calcula sobre el ancho real y se sincroniza la altura del
  // contenedor con el stage escalado para no dejar hueco (alargado abajo).
  const cw = containerEl.clientWidth || 430;
  if (cw <= 0) return;
  const raw = cw / 430;
  // Solo tope inferior: con deszoom (viewport grande) la escala debe crecer
  // libre para que el stage llene el contenedor; caparla dejaba hueco.
  const scale = Math.max(0.2, raw);
  document.documentElement.style.setProperty("--stage-scale", scale);
  stageEl.style.transformOrigin = "top left";
  stageEl.style.transform = `scale(${scale})`;
  // transform no afecta al layout: en popup se fija altura explícita para
  // no dejar hueco. En fullscreen la altura la manda el CSS (aspect-ratio),
  // así que se limpia el inline para no pelear con él.
  if (document.body.classList.contains("fullscreen-mode")) {
    containerEl.style.height = "";
  } else {
    containerEl.style.height = `${Math.round(480 * scale)}px`;
  }
}

window.addEventListener("resize", updateStageScale);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", updateStageScale);
} else {
  updateStageScale();
}
