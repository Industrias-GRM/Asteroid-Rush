// ============================================================
// SKIN SYSTEM — Logica de skins PNG apiladas
// ============================================================

// ---- LOOK (combinacion de piezas guardada por el usuario) ----
function createLookId() {
  return 'look_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

// ---- FUNCIONES DE ACCESO (delegan a skinCatalog.js) ----
function getPartById(id) {
  return getSkinByKey(id);
}

function getPartsByCategory(cat) {
  return getSkinsByType(cat);
}

function getDefaultParts() {
  return getDefaultActiveSkins();
}

function getEmptyParts() {
  return { base: null, cabina: null, alas: null, propulsor: null, llavero: null, creacion: null };
}

// ---- PERSISTENCIA DE LOOKS ----
function loadLooks() {
  try { return JSON.parse(localStorage.getItem(LOOKS_STORAGE_KEY)) || []; } catch (e) { return []; }
}

function saveLooks(looks) {
  try { localStorage.setItem(LOOKS_STORAGE_KEY, JSON.stringify(looks)); } catch (e) {}
}

function loadActiveParts() {
  return loadActiveSkins();
}

function saveActiveParts(parts) {
  saveActiveSkins(parts);
}

function loadOwnedParts() {
  return loadUnlockedSkins();
}

function saveOwnedParts(parts) {
  saveUnlockedSkins(parts);
}

// ---- APLICAR PARTES A LA NAVE (DOM) ----
// Ahora usa imagenes PNG apiladas en vez de CSS variables
function applyPartsToShip(shipEl, parts) {
  if (!shipEl) return;
  applySkinLayers(shipEl, parts);
}

// ---- FAVORITOS ----
function getFavorites() {
  const looks = loadLooks();
  return looks.filter(l => l.favorited).slice(0, MAX_FAVORITES);
}

// ---- MINIATURA DE NAVE (para el selector) ----
function createShipMiniature(container, parts, onClick) {
  container.innerHTML = '';
  // Crear miniatura con imagen compuesta
  const miniDiv = document.createElement('div');
  miniDiv.className = 'skin-miniature';
  miniDiv.style.position = 'relative';
  miniDiv.style.width = '50px';
  miniDiv.style.height = '54px';

  // Agregar capas PNG en miniatura
  const layerOrder = ['base', 'alas', 'propulsor', 'cabina'];
  for (const type of layerOrder) {
    const skinKey = parts[type];
    if (!skinKey) continue;
    const skin = getSkinByKey(skinKey);
    if (!skin) continue;
    const img = document.createElement('img');
    img.src = skin.path;
    img.alt = skin.label;
    img.className = 'skin-mini-img';
    img.draggable = false;
    img.style.position = 'absolute';
    img.style.width = '130%';
    img.style.height = '130%';
    img.style.objectFit = 'contain';
    img.style.objectPosition = 'center center';
    img.style.left = '-15%';
    img.style.top = '-15%';
    img.style.pointerEvents = 'none';
    miniDiv.appendChild(img);
  }

  container.appendChild(miniDiv);
  if (onClick) miniDiv.addEventListener('click', onClick);
  return miniDiv;
}
