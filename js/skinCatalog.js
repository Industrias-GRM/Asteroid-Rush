// ============================================================
// SKIN CATALOG — Mapeo de imagenes PNG de skins
// ============================================================

const TESTING_ALL_UNLOCKED = false; // Temporal: modo testing desactivado — skins con precio

// ---- COLORES DISPONIBLES ----
const SKIN_COLORS = [
  'CIAN', 'NARANJA', 'ROSA', 'LILA', 'VERDE',
  'AZUL', 'AMARILLO', 'MORADO', 'ROJO',
  'BRONCE', 'PLATA', 'ORO'
];

// ---- TIPOS DE SKINS ----
const SKIN_PNG_TYPES = [
  { id: 'base',      name: 'Base',      nameKey: 'skin_type_base',      icon: '🔷', filePrefix: 'B' },
  { id: 'cabina',    name: 'Cabina',    nameKey: 'skin_type_cabina',    icon: '🏠', filePrefix: 'C' },
  { id: 'alas',      name: 'Alas',      nameKey: 'skin_type_alas',      icon: '🪽', filePrefix: 'A' },
  { id: 'propulsor', name: 'Propulsor', nameKey: 'skin_type_propulsor', icon: '🔧', filePrefix: 'P' }
];

const SKIN_SPECIAL_TYPES = [
  { id: 'montaje',  name: 'Montajes',  nameKey: 'skin_type_montajes',  icon: '⚙️', filePrefix: 'M' },
  { id: 'llavero',  name: 'Llavero',   nameKey: 'skin_type_llavero',  icon: '🔑', filePrefix: 'L' },
  { id: 'creacion', name: 'Creacion',  nameKey: 'skin_type_creacion',  icon: '🎨', filePrefix: 'SOLO CREACION' }
];

// ---- NIVELES ----
const SKIN_LEVELS = [1, 2, 3, 4];

// ---- RUTA BASE ----
const SKIN_IMAGES_PATH = 'images/Asteroid Rush Skins/';

// ---- CATALOGO COMPLETO DE SKINS ----
// Generado programaticamente a partir de los archivos existentes
const SKIN_CATALOG = {};

// Funcion para construir el catalogo
function buildSkinCatalog() {
  // Skins principales: A, B, C, P (4 niveles x 12 colores c/u)
  for (const type of SKIN_PNG_TYPES) {
    for (const level of SKIN_LEVELS) {
      for (const color of SKIN_COLORS) {
        const id = `${type.filePrefix}. ${level} ${color}`;
        const filename = `${id}.png`;
        const key = `${type.id}_${level}_${color}`;
        SKIN_CATALOG[key] = {
          id: key,
          type: type.id,
          typeName: type.nameKey,
          level: level,
          color: color,
          filename: filename,
          path: SKIN_IMAGES_PATH + filename,
          label: `${type.name} Nv.${level} ${color}`
        };
      }
    }
  }

  // Montajes: M (solo los archivos que existen realmente)
  const MONTAGE_FILES = {
    1: ['AMARILLO', 'AZUL', 'BLANCO', 'CIAN', 'LILA', 'MORADO', 'NARANJA', 'ROJO', 'ROSA', 'VERDE'],
    2: ['BLANCO'],
    3: ['BLANCO'],
    4: ['BLANCO']
  };
  for (const level of SKIN_LEVELS) {
    const colors = MONTAGE_FILES[level] || [];
    for (const color of colors) {
      const id = `M. ${level} ${color}`;
      const filename = `${id}.png`;
      const key = `montaje_${level}_${color}`;
      const hasParts = SKIN_COLORS.includes(color);
      SKIN_CATALOG[key] = {
        id: key,
        type: 'montaje',
        typeName: 'skin_type_montaje_singular',
        level: level,
        color: color,
        filename: filename,
        path: SKIN_IMAGES_PATH + filename,
        label: `Montaje Nv.${level} ${color}`,
        parts: hasParts ? {
          base: `base_${level}_${color}`,
          cabina: `cabina_${level}_${color}`,
          alas: `alas_${level}_${color}`,
          propulsor: `propulsor_${level}_${color}`
        } : null
      };
    }
  }

  // Llaveros: L
  const llaveros = [
    { filename: 'L. ASTEROID RUSH.png', nameKey: 'skin_llavero_0', name: 'Asteroid Rush' },
    { filename: 'L. BASE.png',          nameKey: 'skin_llavero_1', name: 'Base' },
    { filename: 'L. GALAXIA.png',       nameKey: 'skin_llavero_2', name: 'Galaxia' },
    { filename: 'L. MARTE.png',         nameKey: 'skin_llavero_3', name: 'Marte' },
    { filename: 'L. TIERRA.png',        nameKey: 'skin_llavero_4', name: 'Tierra' }
  ];
  for (let i = 0; i < llaveros.length; i++) {
    const l = llaveros[i];
    const key = `llavero_${i}`;
    SKIN_CATALOG[key] = {
      id: key,
      type: 'llavero',
      typeName: 'skin_type_llavero',
      level: 0,
      color: null,
      filename: l.filename,
      path: SKIN_IMAGES_PATH + l.filename,
      nameKey: l.nameKey,
      label: l.name
    };
  }

  // Solo Creacion
  const creaciones = [
    { filename: 'SOLO CREACION 1.png', nameKey: 'skin_creacion_0', name: 'Creacion 1' },
    { filename: 'SOLO CREACION 2.png', nameKey: 'skin_creacion_1', name: 'Creacion 2' },
    { filename: 'SOLO CREACION 3.png', nameKey: 'skin_creacion_2', name: 'Creacion 3' }
  ];
  for (let i = 0; i < creaciones.length; i++) {
    const c = creaciones[i];
    const key = `creacion_${i}`;
    SKIN_CATALOG[key] = {
      id: key,
      type: 'creacion',
      typeName: 'skin_type_creacion_singular',
      level: 0,
      color: null,
      filename: c.filename,
      path: SKIN_IMAGES_PATH + c.filename,
      nameKey: c.nameKey,
      label: c.name
    };
  }
}

// Construir al cargar
buildSkinCatalog();

// ---- FUNCIONES DE ACCESO ----

function getSkinByKey(key) {
  return SKIN_CATALOG[key] || null;
}

function getSkinsByType(typeId) {
  return Object.values(SKIN_CATALOG).filter(s => s.type === typeId);
}

function getSkinsByTypeAndLevel(typeId, level) {
  return Object.values(SKIN_CATALOG).filter(s => s.type === typeId && s.level === level);
}

function getSkinsByColor(color) {
  return Object.values(SKIN_CATALOG).filter(s => s.color === color);
}

function getMontageByLevelAndColor(level, color) {
  return SKIN_CATALOG[`montaje_${level}_${color}`] || null;
}

function getAllMontages() {
  return Object.values(SKIN_CATALOG).filter(s => s.type === 'montaje');
}

function getAllLlaveros() {
  return Object.values(SKIN_CATALOG).filter(s => s.type === 'llavero');
}

function getLlaveroOffset(baseLevel, gameMode) {
  const offsets = {
    1: { right: '-5px', bottom: '-25px' },
    2: { right: '0px', bottom: '-25px' },
    3: { right: '-7px', bottom: '-25px' },
    4: { right: '-2px', bottom: '-25px' }
  };
  const off = offsets[baseLevel] || { right: '-5px', bottom: '-25px' };
  if (gameMode) return { right: (parseFloat(off.right) - 2) + 'px', bottom: off.bottom };
  return off;
}

function getAllCreaciones() {
  return Object.values(SKIN_CATALOG).filter(s => s.type === 'creacion');
}

// ============================================================
// RECOMPENSA POR SKINS ANTIGUAS (versión anterior)
// ============================================================

const OLD_SKIN_REWARD_KEY = 'dodgeOldSkinRewardClaimed';
const OLD_SKIN_COLORS = ['AMARILLO', 'AZUL', 'BLANCO', 'CIAN', 'LILA', 'MORADO', 'NARANJA', 'ROJO', 'ROSA', 'VERDE'];
const OLD_SKIN_REWARD_PER = 1000;
const OLD_SKIN_REWARD_MAX = 10000;

function checkOldSkinsReward() {
  try {
    if (localStorage.getItem(OLD_SKIN_REWARD_KEY)) return false;
  } catch (e) { return false; }

  try {
    if (localStorage.getItem('dodgeSkinRewardPending')) return true;
  } catch (e) {}

  let ownedCount = 0;
  for (const color of OLD_SKIN_COLORS) {
    if (isSkinUnlocked(`base_1_${color}`)) {
      ownedCount++;
    }
  }

  ownedCount = Math.min(ownedCount, OLD_SKIN_COLORS.length);
  const reward = Math.min(ownedCount * OLD_SKIN_REWARD_PER, OLD_SKIN_REWARD_MAX);

  if (reward > 0) {
    try { localStorage.setItem('dodgeSkinRewardPending', JSON.stringify({ reward, ownedCount })); } catch (e) {}
    return true;
  }

  try { localStorage.setItem(OLD_SKIN_REWARD_KEY, 'true'); } catch (e) {}
  return false;
}

function showSkinRewardScreen() {
  let pending;
  try { pending = JSON.parse(localStorage.getItem('dodgeSkinRewardPending')); } catch (e) {}
  if (!pending) return;

  const ov = document.getElementById('skin-reward-overlay');
  const desc = document.getElementById('skin-reward-desc');
  const btn = document.getElementById('skin-reward-collect-btn');
  if (!ov || !desc || !btn) return;

  desc.textContent = i18n.t('skin_old_reward_desc', 'Tienes {count} skin(s) antigua(s). ¡Recibe +{reward} 🎨 Skin Coins!').replace('{count}', pending.ownedCount).replace('{reward}', pending.reward.toLocaleString());
  ov.classList.remove('hidden');

  btn.onclick = function() {
    try {
      if (typeof _skinCoins !== 'undefined') {
        _skinCoins += pending.reward;
        saveEconomy();
      }
      if (typeof updateShopUI === 'function') updateShopUI();
      if (typeof updateDustUI === 'function') updateDustUI();
    } catch (e) {}
    try { localStorage.removeItem('dodgeSkinRewardPending'); } catch (e) {}
    try { localStorage.setItem(OLD_SKIN_REWARD_KEY, 'true'); } catch (e) {}
    ov.classList.add('hidden');
    if (typeof playLevelUp === 'function') playLevelUp();
  };
}

// ---- RECOMPENSA BETA 10 NAVES -> LLAVERO ASTEROID RUSH ----
const BETA_KEYCHAIN_KEY = 'dodgeBetaKeychainClaimed';
function checkBeta10ShipsKeychainReward() {
  try { if (localStorage.getItem(BETA_KEYCHAIN_KEY)) return false; } catch(e) { return false; }
  if (isSkinUnlocked('llavero_0')) { try { localStorage.setItem(BETA_KEYCHAIN_KEY, 'true'); } catch(e) {} return false; }
  let count = 0;
  for (const c of OLD_SKIN_COLORS) if (isSkinUnlocked(`base_1_${c}`)) count++;
  if (count >= 10) {
    unlockSkin('llavero_0');
    try { localStorage.setItem(BETA_KEYCHAIN_KEY, 'true'); } catch(e) {}
    setTimeout(() => {
      const ov = document.getElementById('skin-reward-overlay');
      const desc = document.getElementById('skin-reward-desc');
      const btn = document.getElementById('skin-reward-collect-btn');
      const title = document.querySelector('#skin-reward-card h3');
      if (ov && desc && btn) {
        if (title) title.textContent = i18n.t('reward_beta_llavero_title', '¡Recompensa Beta!');
        desc.textContent = i18n.t('reward_beta_llavero_desc', '¡Tenías las 10 naves de la Beta! Has recibido el llavero Asteroid Rush.');
        ov.classList.remove('hidden');
        btn.onclick = () => { ov.classList.add('hidden'); if (typeof playLevelUp === 'function') playLevelUp(); if (typeof generateSkinSelector === 'function') generateSkinSelector(); };
      }
    }, 800);
    return true;
  }
  return false;
}

// ---- MISIÓN MARTE 3 MODOS -> LLAVERO MARTE ----
const MARS_KEYCHAIN_KEY = 'dodgeMarsKeychainUnlocked';
const MARS_REACHED_PREFIX = 'dodgeMarsReached_';
function markMarsReachedForCurrentMode() {
  let mode = 'normal';
  if (typeof fastModeActive !== 'undefined' && fastModeActive) mode = 'fast';
  else if (typeof swingcopterModeActive !== 'undefined' && swingcopterModeActive) mode = 'swingcopter';
  try { localStorage.setItem(MARS_REACHED_PREFIX + mode, 'true'); } catch(e) {}
  checkMarsKeychainReward();
}
function checkMarsKeychainReward() {
  try {
    if (localStorage.getItem(MARS_KEYCHAIN_KEY)) return false;
    if (isSkinUnlocked('llavero_3')) { localStorage.setItem(MARS_KEYCHAIN_KEY, 'true'); return false; }
  } catch(e) { return false; }
  const modes = ['normal','fast','swingcopter'];
  for (const m of modes) { try { if (localStorage.getItem(MARS_REACHED_PREFIX + m) !== 'true') return false; } catch(e) { return false; } }
  unlockSkin('llavero_3');
  try { localStorage.setItem(MARS_KEYCHAIN_KEY, 'true'); } catch(e) {}
  setTimeout(() => {
    const ov = document.getElementById('skin-reward-overlay');
    const desc = document.getElementById('skin-reward-desc');
    const btn = document.getElementById('skin-reward-collect-btn');
    const title = document.querySelector('#skin-reward-card h3');
    if (ov && desc && btn) {
      if (title) title.textContent = i18n.t('reward_mars_llavero_title', '¡Misión Marte Completada!');
      desc.textContent = i18n.t('reward_mars_llavero_desc', '¡Has llegado a Marte en los 3 modos! Has recibido el llavero de Marte.');
      ov.classList.remove('hidden');
      btn.onclick = () => { ov.classList.add('hidden'); if (typeof playLevelUp === 'function') playLevelUp(); if (typeof generateSkinSelector === 'function') generateSkinSelector(); };
    }
  }, 800);
  return true;
}

// ---- PARTES ACTIVAS (que pieza de cada tipo tiene equipada) ----
// Estructura: { base: 'base_1_ORO', cabina: 'cabina_1_ORO', alas: 'alas_1_ORO', propulsor: 'propulsor_1_ORO', llavero: null, creacion: null }

function getDefaultActiveSkins() {
  return {
    base: 'base_1_CIAN',
    cabina: 'cabina_1_CIAN',
    alas: 'alas_1_CIAN',
    propulsor: 'propulsor_1_CIAN',
    llavero: null,
    creacion: null
  };
}

function loadActiveSkins() {
  try {
    const stored = JSON.parse(localStorage.getItem('dodgeActiveSkins'));
    if (stored && typeof stored === 'object') return stored;
  } catch (e) {}
  return getDefaultActiveSkins();
}

function saveActiveSkins(skins) {
  try { localStorage.setItem('dodgeActiveSkins', JSON.stringify(skins)); } catch (e) {}
  if (typeof onGameAction === 'function') onGameAction();
}

// ---- PIEZAS DESBLOQUEADAS ----

function getAllSkinKeys() {
  return Object.keys(SKIN_CATALOG);
}

function getDefaultUnlockedSkins() {
  if (TESTING_ALL_UNLOCKED) {
    const all = {};
    for (const key of getAllSkinKeys()) all[key] = true;
    return all;
  }
  // Por defecto solo las piezas nivel 1 color CIAN
  const unlocked = {};
  for (const type of SKIN_PNG_TYPES) {
    for (const color of ['CIAN']) {
      unlocked[`${type.id}_1_${color}`] = true;
    }
  }
  return unlocked;
}

// Alias for backward compat with state.js
function getDefaultOwnedParts() {
  return getDefaultUnlockedSkins();
}

function loadUnlockedSkins() {
  try {
    const stored = JSON.parse(localStorage.getItem('dodgeUnlockedSkinsNew'));
    if (stored && typeof stored === 'object') {
      if (TESTING_ALL_UNLOCKED) {
        // Forzar todo desbloqueado en modo testing
        const all = {};
        for (const key of getAllSkinKeys()) all[key] = true;
        return all;
      }
      return stored;
    }
  } catch (e) {}
  return getDefaultUnlockedSkins();
}

function saveUnlockedSkins(unlocked) {
  // If called without argument, save current state
  if (!unlocked) unlocked = loadUnlockedSkins();
  try { localStorage.setItem('dodgeUnlockedSkinsNew', JSON.stringify(unlocked)); } catch (e) {}
}

function isSkinUnlocked(skinKey) {
  const unlocked = loadUnlockedSkins();
  return !!unlocked[skinKey];
}

function unlockSkin(skinKey) {
  const unlocked = loadUnlockedSkins();
  unlocked[skinKey] = true;
  saveUnlockedSkins(unlocked);
}

// ---- APLICAR SKINS A LA NAVE (DOM) ----
// Genera capas PNG apiladas dentro del elemento de la nave

function applySkinLayers(shipEl, activeSkins) {
  if (!shipEl) return;

  // Buscar o crear contenedor de capas
  let layersContainer = shipEl.querySelector('#skin-layers');
  if (!layersContainer) {
    layersContainer = document.createElement('div');
    layersContainer.id = 'skin-layers';
    // Insertar antes del thruster para que la llama quede encima
    const thruster = shipEl.querySelector('.thruster');
    if (thruster) {
      shipEl.insertBefore(layersContainer, thruster);
    } else {
      shipEl.appendChild(layersContainer);
    }
  }

  // Limpiar capas existentes
  layersContainer.innerHTML = '';

  // Orden de capas: base, alas, propulsor, cabina
  const layerOrder = ['base', 'alas', 'propulsor', 'cabina'];
  for (const type of layerOrder) {
    const skinKey = activeSkins[type];
    if (!skinKey) continue;
    const skin = getSkinByKey(skinKey);
    if (!skin) continue;

    const img = document.createElement('img');
    img.src = skin.path;
    img.alt = skin.label;
    img.className = 'skin-layer';
    img.draggable = false;
    layersContainer.appendChild(img);
  }

  // Llavero — inside shipEl as brief fallback. Canvas renders the physics keychain
  // even during cutscenes, so the static div is hidden on the first canvas frame.
  let llaveroContainer = shipEl.querySelector('#skin-lavero');
  if (!llaveroContainer) {
    llaveroContainer = document.createElement('div');
    llaveroContainer.id = 'skin-lavero';
    shipEl.appendChild(llaveroContainer);
  }
  llaveroContainer.innerHTML = '';

  let baseLevel = 1;
  if (activeSkins.base) {
    const baseSkin = getSkinByKey(activeSkins.base);
    if (baseSkin) baseLevel = baseSkin.level;
  }
  const off = getLlaveroOffset(baseLevel, true);
  const bottomPx = parseFloat(off.bottom);
  const drawW = 33;
  const imgW = keychain ? keychain.imageWidth : 150;
  const imgH = keychain ? keychain.imageHeight : 195;
  const scale = drawW / imgW;
  const drawH = imgH * scale;
  const fixationScaled = 15 * (33 / 50);

  llaveroContainer.style.right = off.right;
  const cssBottom = -bottomPx - 33 + fixationScaled + 13 - drawH;
  llaveroContainer.style.bottom = cssBottom + 'px';

  if (activeSkins.llavero) {
    const llaveroSkin = getSkinByKey(activeSkins.llavero);
    if (llaveroSkin) {
      const img = document.createElement('img');
      img.src = llaveroSkin.path;
      img.style.width = '33px';
      img.style.height = 'auto';
      llaveroContainer.appendChild(img);
      // Ocultar el div DOM de inmediato: el canvas con físicas es el render principal
      // y así se evita el parpadeo por doble render (DOM + canvas) en el frame de transición
      llaveroContainer.style.display = 'none';

      if (!keychain) keychain = new Keychain();
      keychain.lastBaseLevel = baseLevel;
      keychain.loadImage(llaveroSkin.path);
    }
  } else {
    llaveroContainer.style.display = 'none';
    if (keychain) { keychain.destroy(); keychain = null; }
  }

  // Creacion (capa extra encima de todo)
  let creacionLayer = shipEl.querySelector('#skin-creacion');
  if (!creacionLayer) {
    creacionLayer = document.createElement('div');
    creacionLayer.id = 'skin-creacion';
    shipEl.appendChild(creacionLayer);
  }
  creacionLayer.innerHTML = '';

  if (activeSkins.creacion) {
    const creacionSkin = getSkinByKey(activeSkins.creacion);
    if (creacionSkin) {
      const img = document.createElement('img');
      img.src = creacionSkin.path;
      img.alt = creacionSkin.label;
      img.className = 'skin-layer skin-creacion-layer';
      img.draggable = false;
      creacionLayer.appendChild(img);
    }
  }
}

// ============================================================
// PRECIOS DE SKINS Y TIENDA ROTATIVA
// ============================================================

const PREMIUM_COLORS = ['ORO', 'PLATA', 'BRONCE'];
const SHOP_EXCLUDED_COLORS = ['BRONCE', 'PLATA', 'ORO', 'BLANCO'];
const SKIN_SHOP_VISIBLE_COUNT = 4;
const SKIN_SHOP_STORAGE_KEY = 'dodgeSkinShopDaily';

function isPremiumColor(color) {
  return PREMIUM_COLORS.includes(color);
}

function getSkinPrice(skinKey) {
  const skin = getSkinByKey(skinKey);
  if (!skin) return Infinity;

  // Partes por defecto (nivel 1 CIAN) gratuitas
  if (skin.level === 1 && skin.color === 'CIAN' && ['base', 'cabina', 'alas', 'propulsor'].includes(skin.type)) {
    return 0;
  }

  // Colores premium y tipos especiales no están a la venta
  if (skin.color && isPremiumColor(skin.color)) return Infinity;
  if (skin.type === 'llavero') return Infinity;
  if (skin.type === 'creacion') return Infinity;

  if (skin.type === 'montaje') {
    return [1000, 3000, 10000, 25000][skin.level - 1] || 5000;
  }

  let base;
  switch (skin.level) {
    case 1: base = 500; break;
    case 2: base = 1500; break;
    case 3: base = 4000; break;
    case 4: base = 10000; break;
    default: base = 500;
  }
  return base;
}

function _getDayIdSimple() {
  try {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch (e) {
    return '1970-01-01';
  }
}

const LEVEL_NAMES = { 1: 'skin_level_1', 2: 'skin_level_2', 3: 'skin_level_3', 4: 'skin_level_4' };

function getSkinShopName(skinKey) {
  const skin = getSkinByKey(skinKey);
  return getSkinDisplayName(skin, skinKey);
}

function getSkinDisplayName(skin, fallback) {
  if (!skin) return fallback || '';
  const hasI18n = typeof i18n !== 'undefined' && i18n.t;
  let displayColor = '';
  if (skin.color) {
    const rawColor = skin.color;
    let tr = rawColor;
    if (hasI18n) {
      tr = i18n.t('color_' + rawColor) || i18n.t('skin_color_' + rawColor) || rawColor;
      // fallback to english if still raw
      if (tr === 'color_' + rawColor || tr === 'skin_color_' + rawColor) tr = rawColor;
    }
    displayColor = tr;
  }
  if (['base', 'cabina', 'alas', 'propulsor', 'montaje'].includes(skin.type)) {
    const typeName = hasI18n && skin.typeName ? i18n.t(skin.typeName) : (skin.typeName || skin.type);
    const levelName = hasI18n ? i18n.t(LEVEL_NAMES[skin.level]) : LEVEL_NAMES[skin.level];
    const locale = hasI18n ? i18n.currentLocale : 'es';
    if (locale === 'en') {
      const lvl = levelName || 'Lv.' + skin.level;
      const col = displayColor ? displayColor.toLowerCase() : '';
      const typ = typeName ? typeName.toLowerCase() : skin.type;
      return `${lvl} ${col} ${typ}`.trim().replace(/\s+/g, ' ');
    }
    const lvl = levelName ? levelName.toLowerCase() : 'nv.' + skin.level;
    const col = displayColor ? displayColor.toLowerCase() : '';
    return `${typeName} ${lvl} ${col}`.trim().replace(/\s+/g, ' ');
  }
  const nameKey = skin.nameKey;
  if (nameKey && hasI18n) {
    const localized = i18n.t(nameKey);
    if (localized) return localized;
  }
  return skin.label || fallback || skin.id || '';
}

function _isSkinEligibleForShop(skinKey) {
  const skin = SKIN_CATALOG[skinKey];
  if (!skin) return false;
  const price = getSkinPrice(skinKey);
  if (!isFinite(price) || price <= 0) return false;
  if (skin.color && SHOP_EXCLUDED_COLORS.includes(skin.color)) return false;
  if (skin.type === 'llavero') return false;
  if (skin.type === 'montaje') return false;
  return true;
}

function _fillSkinSelection(selected) {
  const allKeys = Object.keys(SKIN_CATALOG);
  const unlocked = loadUnlockedSkins();
  const owned = allKeys.filter(k => {
    if (!_isSkinEligibleForShop(k)) return false;
    return unlocked[k] && !selected.includes(k);
  }).sort(() => Math.random() - 0.5);
  for (const k of owned) {
    if (selected.length >= SKIN_SHOP_VISIBLE_COUNT) break;
    selected.push(k);
  }
}

function generateDailySkinSelection() {
  const dayId = _getDayIdSimple();
  const key = SKIN_SHOP_STORAGE_KEY + ':' + dayId;

  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid = parsed.filter(k => _isSkinEligibleForShop(k));
        if (valid.length > 0) {
          if (valid.length >= SKIN_SHOP_VISIBLE_COUNT) return valid.slice(0, SKIN_SHOP_VISIBLE_COUNT);
          let result = valid.slice();
          _fillSkinSelection(result);
          return result;
        }
      }
    }
  } catch (e) {}

  const unlocked = loadUnlockedSkins();
  const allKeys = Object.keys(SKIN_CATALOG);

  const candidates = allKeys.filter(k => {
    if (!_isSkinEligibleForShop(k)) return false;
    if (unlocked[k]) return false;
    return true;
  });

  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(SKIN_SHOP_VISIBLE_COUNT, shuffled.length));

  _fillSkinSelection(selected);

  try {
    localStorage.setItem(key, JSON.stringify(selected));
  } catch (e) {}

  return selected;
}

function getDailySkinShopItems() {
  const colorOrder = {};
  SKIN_COLORS.forEach((c, i) => colorOrder[c] = i);

  return generateDailySkinSelection()
    .map(key => ({
      skinKey: key,
      skin: SKIN_CATALOG[key],
      price: getSkinPrice(key),
      owned: isSkinUnlocked(key)
    }))
    .sort((a, b) => {
      const lDiff = (a.skin.level || 0) - (b.skin.level || 0);
      if (lDiff !== 0) return lDiff;
      const cA = colorOrder[a.skin.color] ?? 999;
      const cB = colorOrder[b.skin.color] ?? 999;
      return cA - cB;
    });
}

function isSkinInDailyShop(skinKey) {
  return generateDailySkinSelection().includes(skinKey);
}

// ---- APLICAR MONTAJE (equipa las 4 piezas de golpe) ----

function applyMontage(montageKey) {
  const montage = getSkinByKey(montageKey);
  if (!montage || montage.type !== 'montaje') return false;

  const active = loadActiveSkins();
  if (montage.parts) {
    // Montaje con piezas individuales (colores normales)
    active.base = montage.parts.base;
    active.cabina = montage.parts.cabina;
    active.alas = montage.parts.alas;
    active.propulsor = montage.parts.propulsor;
  } else {
    // Montaje sin piezas individuales (BLANCO) — usar el PNG del montaje como creacion
    active.base = null;
    active.cabina = null;
    active.alas = null;
    active.propulsor = null;
    active.creacion = montageKey;
  }
  active.llavero = null;
  saveActiveSkins(active);
  return true;
}
