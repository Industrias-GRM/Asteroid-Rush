// ============================================================
// CIERRE AUTOMÁTICO DE DUPLICADOS
// ============================================================
(function () {
  let canalControl = null;
  try { canalControl = new BroadcastChannel('dodge_single_instance'); } catch(e) { return; }
  try {
    canalControl.onmessage = (msg) => {
      if (msg.data === 'HAY_ALGUIEN') try { canalControl.postMessage('ESTOY_AQUI'); } catch(e) {}
      if (msg.data === 'ESTOY_AQUI') { try { window.close(); } catch(e) {} }
    };
    setTimeout(() => { try { canalControl.postMessage('HAY_ALGUIEN'); } catch(e) {} }, 250);
  } catch(e) {}
})();

// ============================================================
// ESTADO GLOBAL DEL JUEGO
// ============================================================

let playerX = (GAME_WIDTH - PLAYER_WIDTH) / 2;
let playerVelocity = 0;
let keys = { left: false, right: false, up: false, lastDir: null };

let meteors = [];
let projectiles = [];
let lastAutoShootTime = 0;
let powerups = [];
let shieldActive = false;
let shieldEndTime = 0;
let laserActive = false;
let laserEndTime = 0;
let slowActive = false;
let slowElapsedTime = 0;
let slowSkipIntro = false;
let postMarsDeathImmunity = false;
let immunityEndTime = 0;

// Historia
let marsSequenceTriggered = false;
let cutsceneActive = false;
let marsLandingTimeout = null;
let activeCutsceneName = null;
let cutsceneTimeouts = [];

let score = 0;
let bestScoreNormal = 0;
let bestScoreFast = 0;
let bestScoreSwingcopter = 0;
let level = 1;
let difficultyFactor = 1;
let lastIntScore = 0;
let lastSpawnTime = 0;
let gameRunning = false;
let gamePaused = false;
let powerUpPityCounter = 0;
let isDying = false;
let pauseStartTime = 0;
let lastFrameTime = null;
let gameLoopFramePending = false;
let meteorSpawnCount = 0;

let livesNormal = INITIAL_LIVES;
let livesFast = INITIAL_LIVES;
let livesSwingcopter = INITIAL_LIVES;
let accumulatedLifeTimeNormal = 0;
let accumulatedLifeTimeFast = 0;
let accumulatedLifeTimeSwingcopter = 0;
let lastLifeUpdateTime = Date.now();

let isDeletingData = false;
let levelProgress = 0;
let currentLevelBase = 0;
let nextLevelTarget = 1000;

let unlockedSkins = 1;
let currentSkin = 1;

// ---- Sistema de skins avanzado ----
let ownedParts = {};
let ownedPresets = [];
let activeParts = {};
let looks = [];
let currentLookId = null;

let unlockedAchievements = [];
let achievementQueue = [];
let isShowingAchievement = false;

let fastModeActive = false;
let swingcopterModeActive = false;
let swingcopterDirection = 1;

let sessionPowerupsCollected = 0;
let sessionShieldsCollected = 0;
let sessionLasersCollected = 0;
let sessionSlowsCollected = 0;
let sessionLaserFiredCount = 0;
let sessionAsteroidsDestroyed = 0;

let lastHeartsLives = -1;
let noLivesMessageShownNormal = false;
let noLivesMessageShownFast = false;
let noLivesMessageShownSwingcopter = false;

let pendingScore = 0;
let pendingMode = "";
let pendingDuration = 0;
let lowestLeaderboardScore = null;
let currentLeaderboardMode = "normal";

let worldRecordEnabled = true;

let gameDuration = 0;
let cachedPlayerCollisionRect = null;
let cachedPlayerCollisionRectTime = 0;
let lastRenderedLives = -1;
let lastLivesUIUpdate = 0;
let lastProgressBarUpdate = 0;

// Economía: polvo ganado en la partida actual (para mostrar en el overlay).
let sessionDustEarned = 0;

let lastSyncTimestamp = 0;
let showFPS = false;
let safeModeOn = false;
let showHitboxes = false;
let touchControlsOn = false;

// --- Modo BETA ---
let betaModeActive = false;
let betaPowerupsEnabled = false;
let betaStartingScore = 0;
// Flags individuales de cada potenciador beta (accesibles por clave).
var betaFlags = {
  betaBomb: false,
  betaMultiLaser: false,
  betaFreeze: false,
  betaGhost: false,
  betaMagnet: false
};

// Estado efímero de los potenciadores beta (no se persiste)
let betaGhostEndTime = 0;
let betaMagnetEndTime = 0;
let betaFreezeEndTime = 0;
let betaVersionClickCount = 0;
let betaVersionClickTimer = null;

let activeSlot = null;
let autosaveInterval = null;
let countdownInterval = null;

let _lastGlobalLivesUpdate = 0;

// ============================================================
// TUTORIAL PRIMERA PARTIDA - guiado, RNG sembrado, no guarda
// ============================================================
let tutorialGameActive = false;
let tutorialGameStep = 0;
let tutorialStepStartTime = 0;
let tutorialPracticeStart = 0;
const TUTORIAL_TARGET_SCORE = 10000;
let _tutorialHintTimeout = null;
let _tutorialAdvancePending = false;
let tutorialSlowCollected = false;
let tutorialSmallLaserCount = 0;
let _tutorialSeed = 1337;
let _tutorialRngState = 1337;
function tutorialRngReset(seed = 1337) { _tutorialSeed = seed; _tutorialRngState = seed; _tutorialAdvancePending = false; tutorialSlowCollected = false; tutorialSmallLaserCount = 0; }
function tutorialRandom() {
  // mulberry32 determinista
  let t = _tutorialRngState += 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
// Para compatibilidad con código antiguo que usaba índice determinista
let tutorialDeterministicIndex = 0;
const TUTORIAL_METEOR_PATTERN = [20, 80, 140, 200, 260, 320, 360, 60, 120, 180, 240, 300, 340, 40, 100, 160, 220, 280, 335, 15];

function isTutorialLocked() {
  try {
    if (typeof tutorialGameActive !== 'undefined' && tutorialGameActive) return true;
    if (localStorage.getItem('dodgeLegalAccepted') !== 'true') return false;
    const firstDone = localStorage.getItem('dodgeFirstGameDone') === 'true';
    const skipped = localStorage.getItem('dodgeTutorialSkipped') === 'true';
    if (firstDone || skipped) return false;
    if (typeof betaModeActive !== 'undefined' && betaModeActive) return false;
    return true;
  } catch(e) { return false; }
}

// ============================================================
// CARGA INICIAL DESDE LOCALSTORAGE
// ============================================================
try {
  bestScoreNormal = parseInt(localStorage.getItem("dodgeBestScoreNormal"), 10) || 0;
  bestScoreFast   = parseInt(localStorage.getItem("dodgeBestScoreFast"),   10) || 0;
  bestScoreSwingcopter = parseInt(localStorage.getItem("dodgeBestScoreSwingcopter"), 10) || 0;

  const storedLivesNormal = parseInt(localStorage.getItem("dodgeLivesNormal"), 10);
  livesNormal = Math.min(MAX_LIVES, isNaN(storedLivesNormal) ? INITIAL_LIVES : storedLivesNormal);
  const storedLivesFast = parseInt(localStorage.getItem("dodgeLivesFast"), 10);
  livesFast = Math.min(MAX_LIVES, isNaN(storedLivesFast) ? INITIAL_LIVES : storedLivesFast);
  const storedLivesSwingcopter = parseInt(localStorage.getItem("dodgeLivesSwingcopter"), 10);
  livesSwingcopter = Math.min(MAX_LIVES, isNaN(storedLivesSwingcopter) ? INITIAL_LIVES : storedLivesSwingcopter);

  accumulatedLifeTimeNormal = parseInt(localStorage.getItem("dodgeLifeAccumNormal"), 10) || 0;
  accumulatedLifeTimeFast   = parseInt(localStorage.getItem("dodgeLifeAccumFast"),   10) || 0;
  accumulatedLifeTimeSwingcopter = parseInt(localStorage.getItem("dodgeLifeAccumSwingcopter"), 10) || 0;

  const savedLastTime = parseInt(localStorage.getItem("dodgeLastLifeUpdateTime"), 10);
  if (!isNaN(savedLastTime)) {
    const now = Date.now();
    const offlineDelta = now - savedLastTime;
    if (offlineDelta > 0) {
      accumulatedLifeTimeNormal += offlineDelta;
      accumulatedLifeTimeFast   += offlineDelta;
      accumulatedLifeTimeSwingcopter += offlineDelta;
    }
  }

  const storedSkins = localStorage.getItem("dodgeUnlockedSkins");
  if (storedSkins) {
    const parsed = parseInt(storedSkins, 10);
    if (!isNaN(parsed)) unlockedSkins = Math.max(1, parsed);
  }
  const storedSkinCurrent = localStorage.getItem("dodgeCurrentSkin");
  if (storedSkinCurrent) {
    const parsed = parseInt(storedSkinCurrent, 10);
    if (!isNaN(parsed)) currentSkin = Math.min(TOTAL_SKINS, Math.max(1, parsed));
  }

  // Carga del sistema de skins avanzado
  try {
    ownedParts = loadOwnedParts();
    ownedPresets = loadOwnedPresets();
    activeParts = loadActiveParts();
    looks = loadLooks();
    currentLookId = localStorage.getItem(CURRENT_LOOK_KEY) || null;
  } catch (e) {
    ownedParts = getDefaultOwnedParts();
    activeParts = getDefaultParts();
    looks = [];
  }

  try { const storedAch = localStorage.getItem("dodgeAchievements"); if (storedAch) unlockedAchievements = JSON.parse(storedAch); } catch(e) {}

  // Carga de ajustes BETA
  betaModeActive      = localStorage.getItem(SETTINGS_KEYS.betaMode) === "true";
  betaPowerupsEnabled = localStorage.getItem(SETTINGS_KEYS.betaPowerups) === "true";
  const storedStart = parseInt(localStorage.getItem(SETTINGS_KEYS.betaStartScore), 10);
  betaStartingScore = (!isNaN(storedStart) && storedStart >= 0) ? storedStart : 0;
  betaFlags.betaBomb        = localStorage.getItem(SETTINGS_KEYS.betaBomb)        === "true";
  betaFlags.betaMultiLaser  = localStorage.getItem(SETTINGS_KEYS.betaMultiLaser)  === "true";
  betaFlags.betaFreeze      = localStorage.getItem(SETTINGS_KEYS.betaFreeze)      === "true";
  betaFlags.betaGhost       = localStorage.getItem(SETTINGS_KEYS.betaGhost)       === "true";
  betaFlags.betaMagnet      = localStorage.getItem(SETTINGS_KEYS.betaMagnet)      === "true";
} catch (e) {}
