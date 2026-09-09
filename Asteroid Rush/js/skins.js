// ============================================================
// HELPERS DE MODO (VIDAS / PUNTUACION / ACUMULADO)
// ============================================================

function getCurrentLives() {
  if (fastModeActive) return livesFast;
  if (swingcopterModeActive) return livesSwingcopter;
  return livesNormal;
}
function setCurrentLives(v) {
  if (fastModeActive) livesFast = v;
  else if (swingcopterModeActive) livesSwingcopter = v;
  else livesNormal = v;
}
function getCurrentAccumulatedLifeTime() {
  if (fastModeActive) return accumulatedLifeTimeFast;
  if (swingcopterModeActive) return accumulatedLifeTimeSwingcopter;
  return accumulatedLifeTimeNormal;
}
function setCurrentAccumulatedLifeTime(v) {
  if (fastModeActive) accumulatedLifeTimeFast = v;
  else if (swingcopterModeActive) accumulatedLifeTimeSwingcopter = v;
  else accumulatedLifeTimeNormal = v;
}
function getCurrentBestScore() {
  if (fastModeActive) return bestScoreFast;
  if (swingcopterModeActive) return bestScoreSwingcopter;
  return bestScoreNormal;
}
function setCurrentBestScore(v) {
  if (fastModeActive) bestScoreFast = v;
  else if (swingcopterModeActive) bestScoreSwingcopter = v;
  else bestScoreNormal = v;
}

function getNoLivesMessageShown() {
  if (fastModeActive) return noLivesMessageShownFast;
  if (swingcopterModeActive) return noLivesMessageShownSwingcopter;
  return noLivesMessageShownNormal;
}
function setNoLivesMessageShown(v) {
  if (fastModeActive) noLivesMessageShownFast = v;
  else if (swingcopterModeActive) noLivesMessageShownSwingcopter = v;
  else noLivesMessageShownNormal = v;
}

// ============================================================
// GUARDADO DE DATOS PERSISTENTES
// ============================================================

function saveLives() {
  if (isDeletingData) return;
  try {
    localStorage.setItem("dodgeLivesNormal", livesNormal);
    localStorage.setItem("dodgeLifeAccumNormal", accumulatedLifeTimeNormal);
    localStorage.setItem("dodgeLivesFast", livesFast);
    localStorage.setItem("dodgeLifeAccumFast", accumulatedLifeTimeFast);
    localStorage.setItem("dodgeLivesSwingcopter", livesSwingcopter);
    localStorage.setItem("dodgeLifeAccumSwingcopter", accumulatedLifeTimeSwingcopter);
    localStorage.setItem("dodgeLastLifeUpdateTime", Date.now());
    let mode = 'normal';
    if (fastModeActive) mode = 'fast';
    else if (swingcopterModeActive) mode = 'swingcopter';
    Platform.sendMessage({ type: 'updateLivesRealtime', mode, lives: getCurrentLives(), accumulatedTime: getCurrentAccumulatedLifeTime() });
  } catch (e) {}
  if (typeof onGameAction === 'function') onGameAction();
}

function saveBestScore() {
  if (isDeletingData) return;
  if (betaModeActive) return;
  try {
    localStorage.setItem("dodgeBestScoreNormal", bestScoreNormal);
    localStorage.setItem("dodgeBestScoreFast", bestScoreFast);
    localStorage.setItem("dodgeBestScoreSwingcopter", bestScoreSwingcopter);
    broadcastGameStateChange('bestScoreNormal', bestScoreNormal);
    broadcastGameStateChange('bestScoreFast', bestScoreFast);
    broadcastGameStateChange('bestScoreSwingcopter', bestScoreSwingcopter);
  } catch (e) {}
  if (typeof onGameAction === 'function') onGameAction();
}

// ============================================================
// SKINS — SISTEMA PNG APILADAS
// ============================================================

function updateSkinClass() {
  updateShipVisuals();
}

function updateShipVisuals() {
  if (!playerEl) return;
  const active = loadActiveSkins();
  applySkinLayers(playerEl, active);
}

function checkSkinUnlocksFromBest() {
  if (betaModeActive) return;
  // En modo testing no hay desbloqueos por score
  if (TESTING_ALL_UNLOCKED) return;
}

function checkSkinUnlocksFromScore() {
  if (betaModeActive) return;
  // En modo testing no hay desbloqueos por score
  if (TESTING_ALL_UNLOCKED) return;
}

// ============================================================
// SELECTOR DE SKINS (FAVORITOS + SILUETA)
// ============================================================

function updatePauseSkinGrid() {
  const items = document.querySelectorAll("#pause-section .pause-skin-item");
  if (!items.length) return;
  const recents = loadRecentSkins();
  const activeParts = loadActiveSkins();
  const defaultParts = getDefaultActiveSkins();
  let defaultShown = false;
  items.forEach((item, i) => {
    item.innerHTML = "";
    item.classList.remove("selected");
    if (recents[i]) {
      item.classList.add("has-look");
      createShipMiniature(item, recents[i].parts, () => {
        saveActiveSkins({ ...recents[i].parts });
        updateShipVisuals();
        updatePauseSkinGrid();
        playMenuClickSound();
      });
    } else if (!defaultShown) {
      // Si no están todos los huecos de los últimos rellenados,
      // el primer hueco libre muestra la nave por defecto
      defaultShown = true;
      item.classList.add("has-look", "default-fav");
      item.title = i18n.t('skin_default', 'Nave por defecto');
      createShipMiniature(item, defaultParts, () => {
        saveActiveSkins({ ...defaultParts });
        updateShipVisuals();
        updatePauseSkinGrid();
        generateSkinSelector();
        playMenuClickSound();
      });
      if (partsEqual(defaultParts, activeParts)) item.classList.add("selected");
    }
    const isActive = recents[i] && recents[i].parts &&
      Object.keys(activeParts).every(k => recents[i].parts[k] === activeParts[k]) &&
      Object.keys(recents[i].parts).length === Object.keys(activeParts).length;
    if (isActive) item.classList.add("selected");
  });
}

// Comparación profunda simple de dos conjuntos de partes
function partsEqual(a, b) {
  const ka = Object.keys(a || {}), kb = Object.keys(b || {});
  if (ka.length !== kb.length) return false;
  return ka.every(k => (a[k] || null) === (b[k] || null));
}

function generateSkinSelector() {
  if (!skinSelectorEl) return;
  // Usar DocumentFragment para evitar múltiples reflows por appendChild
  const frag = document.createDocumentFragment();
  // Limpiar sin innerHTML para reducir parsing
  while (skinSelectorEl.firstChild) skinSelectorEl.removeChild(skinSelectorEl.firstChild);

  const recents = loadRecentSkins();

  // Filtrar duplicados exactos (order-insensitive, por si hay skins repetidas de antes)
  const unique = [];
  for (const r of recents) {
    if (!unique.some(u => partsEqual(u.parts || {}, r.parts || {}))) {
      unique.push(r);
    }
  }
  // Sanea almacenamiento si había duplicados exactos
  if (unique.length !== recents.length) saveRecentSkins(unique.slice(0, MAX_RECENT));

  // Renderizar hasta 5 recientes
  const defaultParts = (typeof getDefaultActiveSkins === 'function') ? getDefaultActiveSkins() : null;
  const activeNow = loadActiveSkins();
  let defaultShown = false;
  for (let i = 0; i < MAX_RECENT; i++) {
    const item = document.createElement("div");
    item.className = "skin-item skin-fav";

    if (unique[i]) {
      const recent = unique[i];
      item.classList.add('has-look');
      item.title = i18n.t('skin_look_recent', 'Look reciente {n}').replace('{n}', '' + (i + 1));

      // Renderizar miniatura PNG
      createShipMiniature(item, recent.parts);
      if (partsEqual(recent.parts, activeNow)) item.classList.add('selected');

      item.addEventListener("click", () => {
        if (!canInteract(item)) return;
        // Equipar este look reciente
        saveActiveSkins({ ...recent.parts });
        updateShipVisuals();
        generateSkinSelector();
        playMenuClickSound();
      });
    } else if (!defaultShown && defaultParts && !unique.some(u => partsEqual(u.parts || {}, defaultParts || {}))) {
      // Si no están todos los huecos rellenados y el default no está ya en recientes, muestra nave por defecto (evita dos iguales)
      defaultShown = true;
      item.classList.add('has-look', 'default-fav');
      item.title = i18n.t('skin_default', 'Nave por defecto');
      createShipMiniature(item, defaultParts);
      if (partsEqual(defaultParts, activeNow)) item.classList.add('selected');
      item.addEventListener("click", () => {
        if (!canInteract(item)) return;
        saveActiveSkins({ ...defaultParts });
        updateShipVisuals();
        generateSkinSelector();
        playMenuClickSound();
      });
    } else {
      item.classList.add('empty-fav');
      const emptyIcon = document.createElement("span");
      emptyIcon.className = "empty-fav-icon";
      emptyIcon.textContent = "☆";
      item.appendChild(emptyIcon);
      item.title = i18n.t('skin_no_recent_looks', 'Sin looks recientes');
    }

    frag.appendChild(item);
  }

  // Fila completa debajo: Silueta de personalizacion
  const silueta = document.createElement("div");
  silueta.className = "skin-item silueta-btn silueta-full-row";
  // Construir sin innerHTML masivo: crear elementos
  const siluetaIcon = document.createElement("div");
  siluetaIcon.className = "silueta-icon";
  siluetaIcon.textContent = "🎨";
  const siluetaLabel = document.createElement("div");
  siluetaLabel.className = "silueta-label";
  siluetaLabel.textContent = i18n.t('skin_customize', 'Personalizar');
  silueta.appendChild(siluetaIcon);
  silueta.appendChild(siluetaLabel);
  silueta.title = i18n.t('skin_open_customizer', 'Abrir personalización de nave');
  silueta.addEventListener("click", () => {
    if (!canInteract(silueta)) return;
    openSkinCustomizer();
    playMenuClickSound();
  });
  frag.appendChild(silueta);
  skinSelectorEl.appendChild(frag);
  // Diferir grid secundario no crítico para LCP
  if (window.requestIdleCallback) {
    requestIdleCallback(() => updatePauseSkinGrid());
  } else {
    setTimeout(() => updatePauseSkinGrid(), 0);
  }
}

// ============================================================
// EQUIPAR UN LOOK
// ============================================================

function equipLook(lookId) {
  const allLooks = loadLooks();
  const look = allLooks.find(l => l.id === lookId);
  if (!look) return;
  saveActiveSkins({ ...look.parts });
  currentLookId = lookId;
  try { localStorage.setItem(CURRENT_LOOK_KEY, currentLookId); } catch (e) {}
  updateShipVisuals();
  // Actualizar selector visual
  document.querySelectorAll('.skin-fav').forEach(el => {
    el.classList.toggle('selected', el.dataset.lookId === lookId);
  });
}

// ============================================================
// PANEL DE PERSONALIZACION (PNG APILADAS)
// ============================================================

let _customizingParts = {};
let _currentSkinCat = 'base';
const LAST_COLOR_PER_LEVEL_KEY = 'dodgeLastColorPerLevel';
function loadLastColorPerLevel() {
  try { const v = JSON.parse(localStorage.getItem(LAST_COLOR_PER_LEVEL_KEY)); if (v && typeof v === 'object') return v; } catch(e) {}
  return {};
}
function saveLastColorPerLevel() {
  try { localStorage.setItem(LAST_COLOR_PER_LEVEL_KEY, JSON.stringify(_lastColorPerLevel)); } catch(e) {}
}
let _lastColorPerLevel = loadLastColorPerLevel(); // Recuerda el ultimo color por tipo+nivel: { 'base_1': 'ROJO', 'base_2': 'AZUL' }
let _selectedLevel = 1;

// Mapeo de categorias internas del juego a tipos del catalogo
const CAT_TO_TYPE = {
  base: 'base',
  cabina: 'cabina',
  alas: 'alas',
  propulsor: 'propulsor'
};

// Colores CSS para los dots
const COLOR_CSS = {
  'AMARILLO': '#FFD600',
  'AZUL': '#2979FF',
  'BRONCE': '#CD7F32',
  'CIAN': '#00E5FF',
  'LILA': '#CE93D8',
  'MORADO': '#9C27B0',
  'NARANJA': '#FF9100',
  'ORO': '#FFD700',
  'PLATA': '#B0BEC5',
  'ROJO': '#F44336',
  'ROSA': '#F48FB1',
  'VERDE': '#4CAF50'
};

function openSkinCustomizer() {
  if (typeof isTutorialLocked === 'function' && isTutorialLocked()) { const b = document.getElementById('skin-btn') || document.querySelector('.silueta-btn'); if (b && !canInteract(b)) return; return; }
  _customizingParts = { ...loadActiveSkins() };
  _currentSkinCat = 'base';
  renderSkinPanel();
  updatePreviewShip();
  skinCustomizeOverlay.classList.remove('hidden');
  playMenuClickSound();
}

function closeSkinCustomizer() {
  // Guardar la combinacion actual en el historial de recientes
  saveRecentSkin({ ..._customizingParts });
  saveActiveSkins({ ..._customizingParts });
  updateShipVisuals();
  generateSkinSelector();
  skinCustomizeOverlay.classList.add('hidden');
}

// ---- Historial de looks recientes ----
const RECENT_SKINS_KEY = 'dodgeRecentSkins';
const MAX_RECENT = 5;

function loadRecentSkins() {
  try { return JSON.parse(localStorage.getItem(RECENT_SKINS_KEY)) || []; } catch (e) { return []; }
}

function saveRecentSkins(recents) {
  try { localStorage.setItem(RECENT_SKINS_KEY, JSON.stringify(recents)); } catch (e) {}
}

function saveRecentSkin(parts) {
  const recents = loadRecentSkins();
  // Evitar duplicados exactos (order-insensitive) — bloquea dos iguales en barra rápida
  const existing = recents.findIndex(r => partsEqual(r.parts || {}, parts || {}));
  if (existing !== -1) recents.splice(existing, 1);
  // Agregar al inicio
  recents.unshift({ parts, created: Date.now() });
  // Mantener solo los ultimos 5
  if (recents.length > MAX_RECENT) recents.length = MAX_RECENT;
  saveRecentSkins(recents);
}

// ---- Renderizar todo el panel ----
function renderSkinPanel() {
  renderCatButtons();
  renderOptionsGrid();
}

// ---- Botones de categoria ----
function renderCatButtons() {
  const btns = document.querySelectorAll('.skin-cat-btn');
  btns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === _currentSkinCat);
    btn.onclick = () => {
      _currentSkinCat = btn.dataset.cat;
      renderSkinPanel();
      playMenuClickSound();
    };
  });
}

// ---- Grid de opciones segun categoria ----
function renderOptionsGrid() {
  const grid = document.getElementById('skin-options-grid');
  if (!grid) return;
  grid.innerHTML = '';

  // Ocultar/mostrar barra de colores segun categoria
  const colorStrip = document.getElementById('skin-color-strip');
  if (colorStrip) {
    const showColors = ['base', 'cabina', 'alas', 'propulsor'].includes(_currentSkinCat);
    if (showColors) {
      colorStrip.style.display = 'flex';
      colorStrip.innerHTML = '';
      renderColorStrip();
    } else {
      colorStrip.style.display = 'flex';
      colorStrip.innerHTML = '<div class="skin-color-unique">' + i18n.t('skin_color_unique', 'Color único') + '</div>';
    }
  }

  switch (_currentSkinCat) {
    case 'base':
    case 'cabina':
    case 'alas':
    case 'propulsor':
      renderPiezaCards(grid);
      break;
    case 'montajes':
      renderMontajeCards(grid);
      break;
    case 'llaveros':
      renderLlaveroCards(grid);
      break;
  }

  // Agregar banner "Mas skins proximamente"
  const banner = document.createElement('div');
  banner.className = 'skin-coming-soon';
  banner.innerHTML = '<span class="coming-soon-icon">🚀</span><span>' + (i18n.t('skin_coming_soon', 'Más skins\npróximamente').replace(/\n/g, '<br>')) + '</span>';
  grid.appendChild(banner);
}

// ---- Barra de colores debajo del layout ----
function renderColorStrip() {
  const strip = document.getElementById('skin-color-strip');
  if (!strip) return;
  strip.innerHTML = '';

  const typeId = _currentSkinCat;
  const skinType = CAT_TO_TYPE[typeId];
  const currentSkinKey = _customizingParts[typeId];

  // Usar el nivel seleccionado
  let currentLevel = _selectedLevel;
  if (currentSkinKey) {
    const currentSkin = getSkinByKey(currentSkinKey);
    if (currentSkin) currentLevel = currentSkin.level;
    _selectedLevel = currentLevel;
  }

  const levelKey = `${typeId}_${currentLevel}`;
  const lastColor = _lastColorPerLevel[levelKey] || 'CIAN';
  const levelSkins = getSkinsByTypeAndLevel(skinType, currentLevel);

  for (const color of SKIN_COLORS) {
    const skin = levelSkins.find(s => s.color === color);
    if (!skin) continue;

    const dot = document.createElement('div');
    dot.className = 'skin-color-dot';
    dot.style.background = COLOR_CSS[color] || '#888';
    dot.title = color;

    const isOwned = isSkinUnlocked(skin.id);
    if (!isOwned) {
      dot.classList.add('skin-color-locked');
      dot.title = color + ' — 🔒';
      const lockBadge = document.createElement('span');
      lockBadge.className = 'skin-color-lock-badge';
      lockBadge.textContent = '🔒';
      dot.appendChild(lockBadge);
    }

    if (currentSkinKey === skin.id) {
      dot.classList.add('active');
    }

    dot.addEventListener('click', () => {
      if (!isOwned) {
        const hint = document.getElementById('skin-color-hint');
        if (hint) {
          const inShop = isSkinInDailyShop(skin.id);
          hint.textContent = inShop ? i18n.t('skin_hint_available', '🔒 Disponible en Tienda 🚀') : i18n.t('skin_hint_unavailable', '🔒 No disponible actualmente');
          hint.classList.add('show');
          clearTimeout(hint._timeout);
          hint._timeout = setTimeout(() => hint.classList.remove('show'), 2000);
        }
        playMenuClickSound();
        return;
      }
      _customizingParts[typeId] = skin.id;
      _customizingParts.creacion = null;
      _lastColorPerLevel[levelKey] = color;
      saveLastColorPerLevel();
      renderSkinPanel();
      updatePreviewShip();
      playMenuClickSound();
    });

    strip.appendChild(dot);
  }
}

// ---- Piezas: dos por fila, verticales ----
function renderPiezaCards(grid) {
  const typeId = _currentSkinCat;
  const skinType = CAT_TO_TYPE[typeId];
  const currentSkinKey = _customizingParts[typeId];

  for (const level of SKIN_LEVELS) {
    const card = document.createElement('div');
    card.className = 'skin-option-card';

    const levelSkins = getSkinsByTypeAndLevel(skinType, level);
    const currentForLevel = levelSkins.find(s => s.id === currentSkinKey);
    const isActive = currentForLevel !== undefined;
    if (isActive) card.classList.add('active');

    const levelKey = `${typeId}_${level}`;
    const lastColor = _lastColorPerLevel[levelKey] || 'CIAN';
    // Fallback owned: primer color desbloqueado NO premium (ORO/PLATA/BRONCE se excluyen salvo que ya esté equipado)
    // Premium solo cuenta si tienes el top y cuerpos desbloqueados en otro color -> no entra en fallback automático
    const isPremium = (c) => c === 'ORO' || c === 'PLATA' || c === 'BRONCE';
    let firstOwned = null;
    for (const c of SKIN_COLORS) {
      if (isPremium(c)) continue;
      const s = levelSkins.find(x => x.color === c);
      if (s && isSkinUnlocked(s.id)) { firstOwned = s; break; }
    }
    // Preview debe mostrar el color que tienes (si tienes varios, el primero de la lista)
    // Solo usa lastColor si realmente lo tienes desbloqueado y no es premium
    const lastColorOwned = !isPremium(lastColor) ? levelSkins.find(s => s.color === lastColor && isSkinUnlocked(s.id)) : null;
    const displaySkin = currentForLevel || lastColorOwned || firstOwned || levelSkins.find(s => s.color === lastColor) || levelSkins.find(s => s.color === 'CIAN') || levelSkins[0];
    const img = document.createElement('img');
    img.src = displaySkin ? displaySkin.path : '';
    img.alt = `Nivel ${level}`;
    img.className = 'skin-option-img';
    img.draggable = false;
    card.appendChild(img);

    // Comprobar si hay ALGUNA pieza de este nivel ya comprada
    const anyOwned = !!firstOwned;
    // Pieza que se intentaría seleccionar al hacer click: prioriza owned
    const targetSkin = currentForLevel || lastColorOwned || firstOwned || levelSkins.find(s => s.color === lastColor) || levelSkins.find(s => s.color === 'CIAN');

    if (!anyOwned && targetSkin) {
      card.classList.add('skin-card-locked');
      const lockOverlay = document.createElement('div');
      lockOverlay.className = 'skin-card-lock-overlay';
      lockOverlay.innerHTML = '🔒';
      card.appendChild(lockOverlay);
    }

    card.addEventListener('click', () => {
      if (!anyOwned && targetSkin && !isSkinUnlocked(targetSkin.id)) {
        if (isSkinInDailyShop(targetSkin.id)) {
          const shopEl = document.getElementById('shop-btn');
          if (shopEl) {
            closeSkinCustomizer();
            shopEl.click();
          }
        } else {
          const hint = document.getElementById('skin-color-hint');
          if (hint) {
            hint.textContent = i18n.t('skin_hint_unavailable', '🔒 No disponible actualmente');
            hint.classList.add('show');
            clearTimeout(hint._timeout);
            hint._timeout = setTimeout(() => hint.classList.remove('show'), 2000);
          }
        }
        playMenuClickSound();
        return;
      }
      _selectedLevel = level;
      if (!currentForLevel) {
        // Al seleccionar nivel, equipa el color que ya tienes (prioridad lastColor si lo tienes, si no firstOwned)
        const colorSkin = lastColorOwned || firstOwned || levelSkins.find(s => s.color === lastColor) || levelSkins.find(s => s.color === 'CIAN');
        if (colorSkin && isSkinUnlocked(colorSkin.id)) {
          _customizingParts[typeId] = colorSkin.id;
          _customizingParts.creacion = null;
          // Actualiza lastColor para que la barra de colores refleje lo equipado
          _lastColorPerLevel[levelKey] = colorSkin.color;
          saveLastColorPerLevel();
        }
      }
      renderSkinPanel();
      updatePreviewShip();
      playMenuClickSound();
    });

    grid.appendChild(card);
  }
}

// ---- Montajes ----
function renderMontajeCards(grid) {
  const colorOrder = {};
  const sortColors = ['CIAN', 'NARANJA', 'ROSA', 'LILA', 'VERDE', 'AZUL', 'AMARILLO', 'MORADO', 'ROJO', 'BLANCO', 'BRONCE', 'PLATA', 'ORO'];
  sortColors.forEach((c, i) => colorOrder[c] = i);
  const montajes = getAllMontages().sort((a, b) => {
    const lDiff = (a.level || 0) - (b.level || 0);
    if (lDiff !== 0) return lDiff;
    const cA = colorOrder[a.color] ?? 999;
    const cB = colorOrder[b.color] ?? 999;
    return cA - cB;
  });

  // Opcion "Ninguno"
  const noneCard = document.createElement('div');
  noneCard.className = 'skin-option-card none-option';
  const isNone = !_customizingParts.creacion && !_customizingParts.base;
  if (isNone) noneCard.classList.add('active');
  const noneImg = document.createElement('div');
  noneImg.className = 'skin-option-img';
  noneImg.textContent = '✕';
  noneCard.appendChild(noneImg);
  noneCard.addEventListener('click', () => {
    _customizingParts.base = getDefaultActiveSkins().base;
    _customizingParts.cabina = getDefaultActiveSkins().cabina;
    _customizingParts.alas = getDefaultActiveSkins().alas;
    _customizingParts.propulsor = getDefaultActiveSkins().propulsor;
    _customizingParts.creacion = null;
    _customizingParts.llavero = null;
    renderSkinPanel();
    updatePreviewShip();
    playMenuClickSound();
  });
  grid.appendChild(noneCard);

  for (const montage of montajes) {
    const card = document.createElement('div');
    card.className = 'skin-option-card montaje-option';

    const preview = document.createElement('div');
    preview.className = 'montaje-preview';

    if (montage.parts) {
      const layerOrder = ['base', 'alas', 'propulsor', 'cabina'];
      for (const type of layerOrder) {
        const partKey = montage.parts[type];
        if (!partKey) continue;
        const partSkin = getSkinByKey(partKey);
        if (!partSkin) continue;
        const img = document.createElement('img');
        img.src = partSkin.path;
        img.alt = partSkin.label;
        img.draggable = false;
        preview.appendChild(img);
      }
    } else {
      const img = document.createElement('img');
      img.src = montage.path;
      img.alt = montage.label;
      img.draggable = false;
      preview.appendChild(img);
    }

    card.appendChild(preview);

    const label = document.createElement('div');
    label.className = 'montaje-label';
    label.textContent = `${montage.color} ${i18n.t('abbr_level', 'Nv.')}${montage.level}`;
    card.appendChild(label);

    // Comprobar si el montaje está desbloqueado (todas sus partes o el propio montaje)
    const isMontageOwned = isSkinUnlocked(montage.id);
    if (!isMontageOwned) {
      card.classList.add('skin-card-locked');
      const lockOverlay = document.createElement('div');
      lockOverlay.className = 'skin-card-lock-overlay';
      lockOverlay.innerHTML = '🔒';
      card.appendChild(lockOverlay);
    }

    card.addEventListener('click', () => {
      if (!isMontageOwned) {
        if (isSkinInDailyShop(montage.id)) {
          const shopEl = document.getElementById('shop-btn');
          if (shopEl) {
            closeSkinCustomizer();
            shopEl.click();
          }
        } else {
          const hint = document.getElementById('skin-color-hint');
          if (hint) {
            hint.textContent = i18n.t('skin_hint_unavailable', '🔒 No disponible actualmente');
            hint.classList.add('show');
            clearTimeout(hint._timeout);
            hint._timeout = setTimeout(() => hint.classList.remove('show'), 2000);
          }
        }
        playMenuClickSound();
        return;
      }
      if (montage.parts) {
        _customizingParts.base = montage.parts.base;
        _customizingParts.cabina = montage.parts.cabina;
        _customizingParts.alas = montage.parts.alas;
        _customizingParts.propulsor = montage.parts.propulsor;
        _customizingParts.creacion = null;
      } else {
        _customizingParts.base = null;
        _customizingParts.cabina = null;
        _customizingParts.alas = null;
        _customizingParts.propulsor = null;
        _customizingParts.creacion = montage.id;
      }
      _customizingParts.llavero = null;
    renderSkinPanel();
      updatePreviewShip();
      playMenuClickSound();
    });

    grid.appendChild(card);
  }
}

// ---- Llaveros ----
function renderLlaveroCards(grid) {
  // Opcion "Ninguno"
  const noneCard = document.createElement('div');
  noneCard.className = 'skin-option-card none-option';
  const isNone = !_customizingParts.llavero;
  if (isNone) noneCard.classList.add('active');
  const noneImg = document.createElement('div');
  noneImg.className = 'skin-option-img';
  noneImg.textContent = '✕';
  noneCard.appendChild(noneImg);
  noneCard.addEventListener('click', () => {
    _customizingParts.llavero = null;
    renderSkinPanel();
    updatePreviewShip();
    playMenuClickSound();
  });
  grid.appendChild(noneCard);

  const llaveros = getAllLlaveros().filter(l => l.id !== 'llavero_1');
  for (const llavero of llaveros) {
    const card = document.createElement('div');
    card.className = 'skin-option-card llavero-option';
    const isActive = _customizingParts.llavero === llavero.id;
    if (isActive) card.classList.add('active');

    const img = document.createElement('img');
    img.src = llavero.path;
    img.alt = llavero.label;
    img.className = 'skin-option-img';
    img.draggable = false;
    card.appendChild(img);

    const label = document.createElement('div');
    label.className = 'montaje-label';
    label.textContent = getSkinDisplayName(llavero, llavero.label);
    card.appendChild(label);

    const isOwned = isSkinUnlocked(llavero.id);
    if (!isOwned) {
      card.classList.add('skin-card-locked');
      const lockOverlay = document.createElement('div');
      lockOverlay.className = 'skin-card-lock-overlay';
      lockOverlay.innerHTML = '🔒';
      card.appendChild(lockOverlay);
    }

    card.addEventListener('click', () => {
      if (!isOwned) {
        if (isSkinInDailyShop(llavero.id)) {
          const shopEl = document.getElementById('shop-btn');
          if (shopEl) {
            closeSkinCustomizer();
            shopEl.click();
          }
        } else {
          const hint = document.getElementById('skin-color-hint');
          if (hint) {
            hint.textContent = i18n.t('skin_hint_unavailable', '🔒 No disponible actualmente');
            hint.classList.add('show');
            clearTimeout(hint._timeout);
            hint._timeout = setTimeout(() => hint.classList.remove('show'), 2000);
          }
        }
        playMenuClickSound();
        return;
      }
      _customizingParts.llavero = llavero.id;
      renderSkinPanel();
      updatePreviewShip();
      playMenuClickSound();
    });

    grid.appendChild(card);
  }
}

// ---- Actualizar vista previa ----
function updatePreviewShip() {
  const previewShip = document.getElementById('preview-ship');
  if (!previewShip) return;

  // Limpiar capas existentes
  const layersContainer = previewShip.querySelector('#preview-skin-layers');
  if (layersContainer) layersContainer.innerHTML = '';

  const laveroContainer = previewShip.querySelector('#preview-skin-lavero');
  if (laveroContainer) {
    laveroContainer.innerHTML = '';
    // Ajustar posicion segun el nivel de la base
    let baseLevel = 1;
    if (_customizingParts.base) {
      const baseSkin = getSkinByKey(_customizingParts.base);
      if (baseSkin) baseLevel = baseSkin.level;
    }
    const off = getLlaveroOffset(baseLevel);
    laveroContainer.style.right = off.right;
    laveroContainer.style.bottom = off.bottom;
  }

  const creacionContainer = previewShip.querySelector('#preview-skin-creacion');
  if (creacionContainer) creacionContainer.innerHTML = '';

  // Aplicar capas PNG
  const layerOrder = ['base', 'alas', 'propulsor', 'cabina'];
  for (const type of layerOrder) {
    const skinKey = _customizingParts[type];
    if (!skinKey) continue;
    const skin = getSkinByKey(skinKey);
    if (!skin) continue;

    const img = document.createElement('img');
    img.src = skin.path;
    img.alt = skin.label;
    img.className = 'skin-layer';
    img.draggable = false;
    if (layersContainer) layersContainer.appendChild(img);
  }

  // Llavero
  if (_customizingParts.llavero && laveroContainer) {
    const llaveroSkin = getSkinByKey(_customizingParts.llavero);
    if (llaveroSkin) {
      const img = document.createElement('img');
      img.src = llaveroSkin.path;
      img.alt = llaveroSkin.label;
      img.className = 'skin-llavero-img';
      img.draggable = false;
      laveroContainer.appendChild(img);
    }
  }

  // Creacion
  if (_customizingParts.creacion && creacionContainer) {
    const creacionSkin = getSkinByKey(_customizingParts.creacion);
    if (creacionSkin) {
      const img = document.createElement('img');
      img.src = creacionSkin.path;
      img.alt = creacionSkin.label;
      img.className = 'skin-layer skin-creacion-layer';
      img.draggable = false;
      creacionContainer.appendChild(img);
    }
  }
}

// ---- Guardar look ----
function saveCurrentLook() {
  const name = i18n.t('skin_my_look', 'Mi Look');
  const allLooks = loadLooks();
  const newLook = {
    id: createLookId(),
    name,
    parts: { ..._customizingParts },
    favorited: false,
    created: Date.now()
  };
  allLooks.push(newLook);
  saveLooks(allLooks);
  saveActiveSkins({ ..._customizingParts });
  currentLookId = newLook.id;
  try { localStorage.setItem(CURRENT_LOOK_KEY, currentLookId); } catch (e) {}
  updateShipVisuals();
  generateSkinSelector();
  playLevelUp();
}

// ---- Toggle favorito ----
function toggleCurrentLookFavorite() {
  const allLooks = loadLooks();
  let target = allLooks.find(l => l.id === currentLookId);
  if (!target) {
    const name = i18n.t('skin_my_look', 'Mi Look');
    target = {
      id: createLookId(),
      name,
      parts: { ..._customizingParts },
      favorited: true,
      created: Date.now()
    };
    allLooks.push(target);
    currentLookId = target.id;
    try { localStorage.setItem(CURRENT_LOOK_KEY, currentLookId); } catch (e) {}
    saveActiveSkins({ ..._customizingParts });
    updateShipVisuals();
  } else {
    target.favorited = !target.favorited;
  }
  saveLooks(allLooks);
  generateSkinSelector();
  updateFavoriteBtnState();
  playMenuClickSound();
}

function updateFavoriteBtnState() {
  if (!toggleFavoriteBtn) return;
  const allLooks = loadLooks();
  const target = allLooks.find(l => l.id === currentLookId);
  const isFav = target && target.favorited;
  toggleFavoriteBtn.textContent = isFav ? i18n.t('skin_remove_fav', '⭐ Quitar Favorito') : i18n.t('skin_mark_fav', '☆ Marcar Favorito');
}

// ============================================================
// INICIALIZACION DEL PANEL DE PERSONALIZACION
// ============================================================

function initSkinCustomizer() {
  if (skinCustomizeCloseBtn) {
    skinCustomizeCloseBtn.addEventListener('click', closeSkinCustomizer);
  }
  if (skinCustomizeOverlay) {
    skinCustomizeOverlay.addEventListener('click', (e) => {
      if (e.target === skinCustomizeOverlay) closeSkinCustomizer();
    });
  }
  if (saveLookBtn) {
    saveLookBtn.addEventListener('click', saveCurrentLook);
  }
  if (toggleFavoriteBtn) {
    toggleFavoriteBtn.addEventListener('click', toggleCurrentLookFavorite);
  }
}
