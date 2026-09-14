// ============================================================
// CONSTANTES GLOBALES DEL JUEGO
// ============================================================

const GAME_WIDTH = 430;
const GAME_HEIGHT = 480;
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 60;
const PLAYER_COLLISION_WIDTH_FACTOR = 0.7;
const PLAYER_COLLISION_HEIGHT_FACTOR = 0.65;
const PLAYER_MAX_SPEED = 420;
const PLAYER_ACCEL = 1700;
const PLAYER_FRICTION = 2500;
const BASE_METEOR_SPEED = 140;
const METEOR_COLLISION_FACTOR = 0.7;
const POWERUP_COLLISION_FACTOR = 0.8;
const BASE_SPAWN_INTERVAL = 1100;
const MAX_DIFFICULTY = 5;
const MAX_LIVES = 10;
const INITIAL_LIVES = 3;
const LIFE_INTERVAL_MS = 5 * 60 * 1000;
const FAST_MODE_LIFE_INTERVAL_MS = 2 * 60 * 1000;
const SWINGCOPTER_LIFE_INTERVAL_MS = 5 * 60 * 1000;
const FAST_MODE_MULTIPLIER = 3;
const SCORE_RATE = 0.25;
const POWERUP_SIZE = 30;
const SHIELD_DURATION = 30000;
const LASER_DURATION = 2000;
const LASER_UNLOCK_LEVEL = 10;
const POWERUP_PROB = 0.15;
const SLOW_DURATION = 5000;
const SLOW_UNLOCK_LEVEL = 50;
const SLOW_FACTOR = 0.33;

const AUTO_SHOOT_INTERVAL_NORMAL = 6000;
const AUTO_SHOOT_INTERVAL_FAST = 2000;
const PROJECTILE_SPEED = 500;

const SLOW_CYCLE_DURATION = 2000;

// ---- SISTEMA DE SKINS (PNG APILADAS) ----
// Definiciones en skinCatalog.js
const MAX_FAVORITES = 4;
const LOOKS_STORAGE_KEY = 'dodgeLooks';
const ACTIVE_SKINS_KEY = 'dodgeActiveSkins';
const UNLOCKED_SKINS_KEY = 'dodgeUnlockedSkinsNew';
const CURRENT_LOOK_KEY = 'dodgeCurrentLookId';

// Backward compat (legacy skin system — now unused but referenced by sync/shop/data)
const TOTAL_SKINS = 1;
const SKIN_UNLOCK_POINTS = [0];
const LEGACY_UNLOCKED_SKINS_KEY = 'dodgeUnlockedSkins';
const LEGACY_CURRENT_SKIN_KEY = 'dodgeCurrentSkin';
const LEADERBOARD_LIMIT = 100;
const EDGE_MARGIN = 0;

const TARGET_FPS = 30;
const FRAME_TIME = 1000 / TARGET_FPS;

const SETTINGS_KEYS = {
  rememberMode: 'dodgeRememberMode',
  showFPS: 'dodgeShowFPS',
  smoothAnimations: 'dodgeSmoothAnimations',
  lightEffects: 'dodgeLightEffects',
  showHitboxes: 'dodgeShowHitboxes',
  masterVolume: 'dodgeMasterVolume',
  musicOn: 'dodgeMusicOn',
  sfxOn: 'dodgeSfxOn',
  safeMode: 'dodgeSafeMode',
  lastMode: 'dodgeLastMode',
  touchControls: 'dodgeTouchControls',
  // --- Modo BETA ---
  betaMode: 'dodgeBetaMode',
  betaPowerups: 'dodgeBetaPowerups',
  betaStartScore: 'dodgeBetaStartScore',
  betaBomb: 'dodgeBetaPowerBomb',
  betaMultiLaser: 'dodgeBetaPowerMultiLaser',
  betaFreeze: 'dodgeBetaPowerFreeze',
  betaGhost: 'dodgeBetaPowerGhost',
  betaMagnet: 'dodgeBetaPowerMagnet',
  // --- Sincronización dual ---
  dualMode: 'dodgeDualMode',
  // --- Notificación de promo (hora feliz) ---
  promoNotifications: 'dodgePromoNotifications'
};

// ============================================================
// POTENCIADORES EXPERIMENTALES (MODO BETA)
// ============================================================
const BETA_POWERUPS = [
  { id: "bomb",        icon: "💥",  state: "betaBomb",           key: SETTINGS_KEYS.betaBomb,         unlockLevel: 125, i18n: "beta_powerup_bomb",        color: "#ff5722" },
  { id: "multilaser",  icon: "🔱",  state: "betaMultiLaser",     key: SETTINGS_KEYS.betaMultiLaser,   unlockLevel: 100, i18n: "beta_powerup_multilaser",  color: "#9c27b0" },
  { id: "freeze",      icon: "❄️",  state: "betaFreeze",         key: SETTINGS_KEYS.betaFreeze,       unlockLevel: 150, i18n: "beta_powerup_freeze",      color: "#03a9f4" },
  { id: "ghost",       icon: "👻",  state: "betaGhost",          key: SETTINGS_KEYS.betaGhost,        unlockLevel: 75,  i18n: "beta_powerup_ghost",       color: "#b0bec5" },
  { id: "magnet",      icon: "🧲",  state: "betaMagnet",         key: SETTINGS_KEYS.betaMagnet,       unlockLevel: 200, i18n: "beta_powerup_magnet",      color: "#ff9800" }
];

const BETA_GHOST_DURATION = 10000;         // fantasma translúcido 10s
const BETA_MAGNET_DURATION = 5000;         // imán
const BETA_FREEZE_DURATION = 2000;         // congelación total
const BETA_MULTI_LASER_COUNT = 5;          // nº de proyectiles en abanico
const BETA_VERSION_CLICKS = 7;             // clics en la versión para activar beta

// ============================================================
// ECONOMÍA — MONEDAS
// ============================================================
// Ganancia de polvo: 1 polvo por cada 100 puntos (0 en modo BETA).
const DUST_PER_POINTS = 100;

// Equivalencias de conversión polvo → moneda (X polvo = Y moneda).
const DUST_TO_COINS    = 2;    // 1 polvo → 2 monedas
const DUST_TO_TICKET   = 500;  // 500 polvo → 1 ticket
const DUST_TO_SKINCOIN = 2;    // 1 polvo → 2 skin-coins

// Compra directa con polvo = el doble de cara que la equivalencia.
const DUST_DIRECT_PENALTY = 2;

// Tiers de lote fijos para conversiones (de 5.000 a 1.000.000 de polvo).
const DUST_TIERS = [5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];

// Claves de localStorage.
const ECONOMY_KEYS = {
  dust:      'dodgeDust',
  coins:     'dodgeCoins',
  tickets:   'dodgeTickets',
  skinCoins: 'dodgeSkinCoins'
};

