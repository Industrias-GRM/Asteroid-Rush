function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================
// TIENDA — Catálogo, compras y pestañas
// ============================================================
// 5 pestañas: Ofertas, Monedas (🪙), Tickets (🎟️), Skin-coins (🎨), Intercambio (💱).
// Doble precio: moneda correspondiente O polvo (2× más caro).
// ============================================================

const SHOP_PURCHASES_KEY = 'dodgeShopPurchases';
const SHOP_LIVES_BOOST_KEY = 'dodgeShopLivesBoost';
const SHOP_RECHARGE_KEY = 'dodgeShopRechargeBoost';
const SHOP_SHIELD_START_KEY = 'dodgeShopShieldStart';
const SHOP_LASER_DUR_KEY = 'dodgeShopLaserDurBoost';

// Grupos (type=group en shop-catalog.json)
let SHOP_GROUPS = [];

let _shopPurchases = {};
let _currentTab = 'offers';
let _livesShopRefreshInterval = null;

// --- Carga de compras ---
try {
  _shopPurchases = JSON.parse(localStorage.getItem(SHOP_PURCHASES_KEY)) || {};
} catch (e) { _shopPurchases = {}; }

function _savePurchases() {
  try { localStorage.setItem(SHOP_PURCHASES_KEY, JSON.stringify(_shopPurchases)); } catch (e) {}
}

function _getPurchasedCount(id) {
  return _shopPurchases[id] || 0;
}

// ============================================================
// Catálogo de items (cargado desde shop-catalog.json)
// ============================================================
const SHOP_CATALOG_FALLBACK = [
  { id: 'pack_skins_og', icon: '📦', name: 'Pack Skins OG', desc: 'Todos los montajes nivel 1 — ¡50% de descuento!', tab: 'skinCoins', currency: 'skinCoins', price: 5000, maxBuys: 1, isOffer: true },
];

let SHOP_CATALOG = SHOP_CATALOG_FALLBACK;

async function loadShopCatalog() {
  // En extensión/hosting: el archivo debe estar accesible en la misma raíz.
  const url = './shop-catalog.json';
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (!Array.isArray(json)) throw new Error('shop-catalog.json no es un array');

    // Nuevo soporte: array plano con objetos type=item | type=group
    // - type=item: deben tener id
    // - type=group: no forman parte del render directo, se usan para selección
    const items = json.filter(x => x && (x.type === undefined || x.type === 'item') && typeof x.id === 'string');
    const groups = json.filter(x => x && x.type === 'group' && typeof x.id === 'string');

    // Normalización mínima para compatibilidad
    SHOP_CATALOG = items.length ? items : SHOP_CATALOG_FALLBACK;
    SHOP_GROUPS = groups;

    if (!SHOP_CATALOG.length) SHOP_CATALOG = SHOP_CATALOG_FALLBACK;
  } catch (e) {
    // fallback
    SHOP_CATALOG = SHOP_CATALOG_FALLBACK;
    SHOP_GROUPS = [];
  }
}


// ============================================================
// Efectos de compra
// ============================================================
function _applyItemEffect(item) {
  switch (item.id) {
    case 'life_normal_single':
      livesNormal = Math.min(MAX_LIVES, livesNormal + 1); saveLives(); updateLivesUI(); updateOverlayLivesInfo(); break;
    case 'life_fast_single':
      livesFast = Math.min(MAX_LIVES, livesFast + 1); saveLives(); updateLivesUI(); updateOverlayLivesInfo(); break;
    case 'life_swing_single':
      livesSwingcopter = Math.min(MAX_LIVES, livesSwingcopter + 1); saveLives(); updateLivesUI(); updateOverlayLivesInfo(); break;
    case 'pack3lives':
    case 'pack3_normal':
      livesNormal = Math.min(MAX_LIVES, livesNormal + 3); saveLives(); updateLivesUI(); updateOverlayLivesInfo(); break;
    case 'pack3_fast':
      livesFast = Math.min(MAX_LIVES, livesFast + 3); saveLives(); updateLivesUI(); updateOverlayLivesInfo(); break;
    case 'pack3_swing':
      livesSwingcopter = Math.min(MAX_LIVES, livesSwingcopter + 3); saveLives(); updateLivesUI(); updateOverlayLivesInfo(); break;
    case 'full10lives':
    case 'full10_normal':
      livesNormal = MAX_LIVES; saveLives(); updateLivesUI(); updateOverlayLivesInfo(); break;
    case 'full10_fast':
      livesFast = MAX_LIVES; saveLives(); updateLivesUI(); updateOverlayLivesInfo(); break;
    case 'full10_swing':
      livesSwingcopter = MAX_LIVES; saveLives(); updateLivesUI(); updateOverlayLivesInfo(); break;
    case 'all_modes_max':
      livesNormal = MAX_LIVES; livesFast = MAX_LIVES; livesSwingcopter = MAX_LIVES;
      saveLives(); updateLivesUI(); updateOverlayLivesInfo();
      break;
    case 'life_super_20':
      if (fastModeActive) livesFast = Math.min(MAX_LIVES, livesFast + 1);
      else if (swingcopterModeActive) livesSwingcopter = Math.min(MAX_LIVES, livesSwingcopter + 1);
      else livesNormal = Math.min(MAX_LIVES, livesNormal + 1);
      saveLives(); updateLivesUI(); updateOverlayLivesInfo();
      break;
    case 'shield_start':
      // Flag: próximo juego empieza con escudo
      try { localStorage.setItem(SHOP_SHIELD_START_KEY, 'true'); } catch(e) {}
      break;
    case 'extra_life':
      livesNormal = Math.min(MAX_LIVES, livesNormal + 1);
      livesFast = Math.min(MAX_LIVES, livesFast + 1);
      livesSwingcopter = Math.min(MAX_LIVES, livesSwingcopter + 1);
      saveLives(); updateLivesUI(); updateOverlayLivesInfo();
      break;
    case 'recharge_50':
      try { localStorage.setItem(SHOP_RECHARGE_KEY, 'true'); } catch(e) {}
      break;
    case 'shield_perm':
      try { localStorage.setItem(SHOP_SHIELD_START_KEY, 'true'); } catch(e) {}
      break;
    case 'laser_x2':
      try { localStorage.setItem(SHOP_LASER_DUR_KEY, 'true'); } catch(e) {}
      break;
    case 'pack_skins_og':
      // Desbloquear todos los montajes nivel 1 (excepto ORO y PLATA)
      const MONT_1_COLORS = ['AMARILLO', 'AZUL', 'BLANCO', 'CIAN', 'LILA', 'MORADO', 'NARANJA', 'ROJO', 'ROSA', 'VERDE'];
      for (const col of MONT_1_COLORS) {
        unlockSkin('montaje_1_' + col);
      }
      if (typeof generateSkinSelector === 'function') generateSkinSelector();
      if (typeof updateShipVisuals === 'function') updateShipVisuals();
      break;
    default:
      break;
  }
  if (item && typeof updatePlayButtonState === 'function' && /life|pack3|full10|all_modes|extra_life/.test(item.id)) {
    try { updatePlayButtonState(); } catch(e) {}
  }
}

// ============================================================
// Lógica de compra
// ============================================================
function _getDayId() {
  // día local para consistencia 24h (según requerimiento)
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

function _getDailyKey(itemId) {
  return `dodgeShopDailyBuys:${itemId}:${_getDayId()}`;
}

function _hasDailyLimit(item) {
  return (
    item &&
    typeof item.dailyBuysMin === 'number' &&
    typeof item.dailyBuysMax === 'number'
  ) || (
    item &&
    !Number.isNaN(Number(item.dailyBuysMin)) &&
    !Number.isNaN(Number(item.dailyBuysMax))
  );
}

function _getDailyMinMax(item) {
  const min = Number(item.dailyBuysMin);
  const max = Number(item.dailyBuysMax);
  if (Number.isNaN(min) || Number.isNaN(max)) return null;
  return { min, max };
}

function _getDailyLimit(itemId, item) {
  const mm = _getDailyMinMax(item);
  if (!mm) return null;
  let min = mm.min;
  let max = mm.max;
  if (max < min) { const t = min; min = max; max = t; }
  if (min === max) return min;

  const key = _getDailyKey(itemId);
  try {
    const existing = localStorage.getItem(key);
    if (existing) {
      const n = Number(existing);
      if (!Number.isNaN(n)) return n;
    }
  } catch (e) {}

  // rand entero incluido
  const limit = Math.floor(Math.random() * (max - min + 1)) + min;
  try { localStorage.setItem(key, String(limit)); } catch (e) {}
  return limit;
}

function _getDailyPurchasedCount(itemId) {
  const key = _getDailyKey(itemId);
  try {
    return JSON.parse(localStorage.getItem(key + ':count') || '0') || 0;
  } catch (e) {
    return 0;
  }
}

function _incDailyPurchasedCount(itemId) {
  const key = _getDailyKey(itemId);
  const countKey = key + ':count';
  try {
    const current = Number(JSON.parse(localStorage.getItem(countKey) || '0')) || 0;
    localStorage.setItem(countKey, JSON.stringify(current + 1));
  } catch (e) {}
}

let _pendingShopPurchase = null;

function openShopConfirm(purchase) {
  // purchase: { item, payWith, costCurrency, costAmount }
  const ov = document.getElementById('shop-confirm-overlay');
  if (!ov) return;

  const titleEl = document.getElementById('shop-confirm-title');
  const descEl = document.getElementById('shop-confirm-desc');
  const yesBtn = document.getElementById('shop-confirm-yes');
  const noBtn = document.getElementById('shop-confirm-no');

  if (titleEl) titleEl.textContent = i18n.t('shop_confirm_title', 'Confirmar compra');
  if (descEl) {
    const item = purchase.item;
    const locale = (typeof i18n !== 'undefined' && i18n && i18n.currentLocale) ? i18n.currentLocale : 'en';
    const name = item?.name_i18n?.[locale] ?? item?.name ?? item.id;
    const costIcon = _CURRENCY_ICONS[purchase.costCurrency];
    // Calcular precio base para mostrar descuento Hora Feliz
    let baseAmount = purchase.costAmount;
    try {
      const rawBase = purchase.payWith === 'dust' ? directCostInDust(item.currency, item.price) : item.price;
      baseAmount = Number(rawBase) || purchase.costAmount;
    } catch(e) {}
    const isOffer = isPromoActive() && baseAmount > purchase.costAmount;
    const priceHtml = isOffer
      ? `<b style="color:#ff9800">${purchase.costAmount.toLocaleString()}</b> ${costIcon} <s style="opacity:0.55;font-size:11px">${baseAmount.toLocaleString()} ${costIcon}</s> <span style="background:linear-gradient(135deg,#ff9800,#f44336);color:#fff;padding:1px 6px;border-radius:6px;font-size:10px;margin-left:4px">-60%</span>`
      : `<b>${purchase.costAmount.toLocaleString()}</b> ${costIcon}`;
    descEl.innerHTML = `${item.icon || '❓'} <b>${escapeHtml(name)}</b><br/>` +
      i18n.t('shop_price_label', 'Precio:') + ` ${priceHtml}` +
      (isOffer ? `<br/><span style="color:#ff9800;font-size:11px;font-weight:bold">${escapeHtml(i18n.t('promo_happy_hour_short','¡Hora Feliz!'))}</span>` : '');
  }

  _pendingShopPurchase = purchase;
  ov.classList.remove('hidden');

  if (yesBtn) {
    yesBtn.disabled = false;
    yesBtn.onclick = () => {
      const p = _pendingShopPurchase;
      if (!p) return;
      ov.classList.add('hidden');
      _pendingShopPurchase = null;

      // Custom handler for skin parts
      if (typeof p._onConfirm === 'function') {
        p._onConfirm();
        return;
      }

      const res = buyItem(p.item.id, p.payWith);
      const resEl = document.getElementById('shop-result');
      // animación en el botón de tienda (si se pasó btn)
      if (p.btn) {
        if (res.ok) {
          p.btn.classList.add('purchase-success');
          const orig = p.btn.innerHTML;
          p.btn.innerHTML = '✓';
          setTimeout(()=>{ p.btn.innerHTML = orig; p.btn.classList.remove('purchase-success'); }, 950);
        } else {
          p.btn.classList.add('purchase-fail');
          setTimeout(()=> p.btn.classList.remove('purchase-fail'), 650);
        }
      }
      if (res.ok) {
        const costIcon = _CURRENCY_ICONS[res.costCurrency];
        if (resEl) {
          const boughtMsg = i18n.t('shop_bought_format_regular', '✓ Purchased for {amount} {icon}').replace('{amount}', res.costAmount.toLocaleString()).replace('{icon}', costIcon);
          resEl.textContent = boughtMsg;
          resEl.style.color = '#4caf50';
          resEl.classList.add('show');
          setTimeout(() => resEl.classList.remove('show'), 2500);
        }
        playLevelUp();
        const doRefresh = () => { updateShopUI(); updateDustUI(); updateLivesUI(); _renderTab(_currentTab); };
        if (p.btn) setTimeout(doRefresh, 950); else doRefresh();
      } else {
        // sin texto abajo — solo animación fail (como tick ok)
        if (p.btn) setTimeout(()=> { updateShopUI(); _renderTab(_currentTab); }, 650);
      }
    };
  }

  if (noBtn) {
    noBtn.onclick = () => {
      _pendingShopPurchase = null;
      ov.classList.add('hidden');
    };
  }
}

// -------------------- Limits / Reset helpers --------------------
function _inferLimitType(item) {
  // New: explicit limitType
  if (item && typeof item.limitType === 'string') return item.limitType;

  // Back-compat: daily fields present => daily
  if (_hasDailyLimit(item)) return 'daily';

  return 'none';
}

function _getLifetimeMaxBuys(item) {
  // New: lifetimeBuys preferred
  if (item && item.lifetimeBuys !== undefined && item.lifetimeBuys !== null && !Number.isNaN(Number(item.lifetimeBuys))) {
    const v = Number(item.lifetimeBuys);
    return (v === 0) ? Infinity : v;
  }

  // Back-compat: maxBuys used as lifetime max
  if (item && item.maxBuys !== undefined && item.maxBuys !== null && !Number.isNaN(Number(item.maxBuys))) {
    const v = Number(item.maxBuys);
    return (v === 0) ? Infinity : v;
  }

  return 0;
}

const SHOP_RESET_APPLIED_PREFIX = 'dodgeShopResetApplied';

// Reset daily counters only for today's dayId
function _resetDailyCountForToday(itemId) {
  const key = _getDailyKey(itemId);
  const countKey = key + ':count';
  try { localStorage.setItem(countKey, JSON.stringify(0)); } catch (e) {}
}

function _applyResetForItemIfNeeded(item) {
  if (!item || !item.id) return;
  const version = item.resetPurchaseVersion;
  if (version === undefined || version === null || version === '') return;

  const appliedKey = `${SHOP_RESET_APPLIED_PREFIX}:${item.id}:${version}`;
  try {
    const already = localStorage.getItem(appliedKey);
    if (already) return;

    // Reset purchase counters for this item
    _shopPurchases[item.id] = 0;
    _savePurchases();

    // Reset daily counter for today so daily limit restarts immediately
    _resetDailyCountForToday(item.id);

    // Mark applied
    localStorage.setItem(appliedKey, '1');
  } catch (e) {}
}

// ============================================================
// PROMO HORA FELIZ — de 20:00 a 21:00, hora real del servidor.
// Descuento del 60% en toda la tienda durante 60 minutos.
//
// Modelo monótono: se guarda la hora del servidor en el último
// sync + performance.now() de ese instante. El tiempo real se
// calcula como: serverTime + (performance.now() − syncMono).
// performance.now() es monótnico → no se puede manipular.
// ============================================================
const PROMO_START_HOUR = 20;
const PROMO_DISCOUNT = 0.60;

// --- Estado de sincronización (se carga una vez, se rellena al sync) ---
let _syncServerTime = 0;   // Hora del servidor (ms epoch) en el último sync
let _syncMono = 0;         // performance.now() en el instante del sync

function _loadSyncData() {
  try {
    _syncServerTime = parseInt(localStorage.getItem('dodgeServerTime') || '0', 10) || 0;
    _syncMono       = parseInt(localStorage.getItem('dodgeSyncMono')   || '0', 10) || 0;
  } catch (e) {}
}
// Cargar al inicio
_loadSyncData();
if (!_syncServerTime || !_syncMono) {
  try { if (typeof navigator !== 'undefined' && navigator.onLine) setTimeout(() => { try { requestSyncServerTime(); } catch(e) {} }, 1500); } catch(e) {}
}

function requestSyncServerTime() {
  const mono = performance.now();
  sendMessageToSW("syncServerTime", { mono }).then((r) => {
    if (r && r.ok && typeof r.serverTime === 'number') {
      _syncServerTime = r.serverTime;
      _syncMono = mono;
      try {
        localStorage.setItem('dodgeServerTime', String(r.serverTime));
        localStorage.setItem('dodgeSyncMono', String(mono));
      } catch (e) {}
    }
  }).catch(() => {});
}

// --- Hora "real" del juego (monótona, no manipulable) ---
// Sin sync no hay promo: se exige internet/headers Date de Google
function trustedNow() {
  if (!_syncServerTime || !_syncMono) return 0;
  const elapsed = performance.now() - _syncMono;
  return _syncServerTime + elapsed;
}

function isPromoActive() {
  if (!_syncServerTime || !_syncMono) return false;
  return new Date(trustedNow()).getHours() === PROMO_START_HOUR;
}

function promoPrice(base) {
  base = Number(base) || 0;
  if (!isPromoActive() || base <= 0) return base;
  return Math.max(1, Math.ceil(base * (1 - PROMO_DISCOUNT)));
}

// ============================================================
// BANNER PROMO — Se inyecta dentro de #shop-content (zona de
// objetos), como primer hijo, anclado arriba.
// Se actualiza en tiempo real mientras la tienda esté abierta.
// ============================================================
let _promoIntervalId = null;
let _lastPromoActive = null;

function _promoMinsLeft() {
  return 60 - new Date(trustedNow()).getMinutes();
}

function updatePromoBanner() {
  const container = document.getElementById('shop-content');
  if (!container) return;

  // No mostrar en intercambio
  if (_currentTab === 'exchange') {
    const old = document.getElementById('shop-promo-banner');
    if (old) old.remove();
    return;
  }

  if (!isPromoActive()) {
    const old = document.getElementById('shop-promo-banner');
    if (old) old.remove();
    return;
  }

  const text = i18n.t('promo_happy_hour', '¡HORA FELIZ! −60% en toda la tienda');

  let banner = document.getElementById('shop-promo-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'shop-promo-banner';
    container.insertBefore(banner, container.firstChild);
  }
  banner.textContent = text;
}

function _startPromoInterval() {
  _stopPromoInterval();
  _lastPromoActive = isPromoActive();
  _promoIntervalId = setInterval(() => {
    const nowActive = isPromoActive();
    // detectar transición y notificar
    try { _checkPromoTransition(); } catch(e) {}
    if (nowActive) { try { checkPromoNotification(); } catch(e) {} }
    // si cambia el estado de promo, re-renderizar precios en tiempo real
    if (nowActive !== _lastPromoActive) {
      _lastPromoActive = nowActive;
      const shopOv = document.getElementById('shop-overlay');
      if (shopOv && !shopOv.classList.contains('hidden')) {
        _renderTab(_currentTab);
        updateShopUI();
      }
      const livesOv = document.getElementById('lives-shop-overlay');
      if (livesOv && !livesOv.classList.contains('hidden')) {
        renderLivesShopGrid();
      }
    }
    updatePromoBanner();
    // si ya no hay promo y ninguna tienda abierta, parar intervalo
    const shopOv = document.getElementById('shop-overlay');
    const livesOv = document.getElementById('lives-shop-overlay');
    const anyOpen = (shopOv && !shopOv.classList.contains('hidden')) || (livesOv && !livesOv.classList.contains('hidden'));
    if (!nowActive && !anyOpen) {
      _stopPromoInterval();
      const old = document.getElementById('shop-promo-banner');
      if (old) old.remove();
    } else if (!nowActive) {
      updatePromoBanner();
    }
  }, 1000);
}

function _stopPromoInterval() {
  if (_promoIntervalId !== null) {
    clearInterval(_promoIntervalId);
    _promoIntervalId = null;
  }
}

// ============================================================
// NOTIFICACIÓN DE PROMO — Al empezar la hora feliz, muestra un
// toast (reutilizando #achievement-toast) si el toggle de
// ajustes está activado. Se guarda la fecha+hora para no repetir.
// ============================================================
function checkPromoNotification() {
  if (!isPromoActive()) return;
  // Toggle de ajustes desactivado
  const notifEnabled = localStorage.getItem(SETTINGS_KEYS.promoNotifications) !== 'false';
  if (!notifEnabled) return;

  const now = new Date(trustedNow());
  const todayKey = now.toISOString().slice(0, 10);       // YYYY-MM-DD
  const promoHourKey = todayKey + 'T' + PROMO_START_HOUR; // YYYY-MM-DDT20
  try {
    if (localStorage.getItem('dodgeLastPromoNotif') === promoHourKey) return; // Ya notificado
  } catch (e) { return; }

  // Mostrar toast
  const toast = document.getElementById('achievement-toast');
  if (!toast) return;
  const title = i18n.t('promo_notif_title', '¡HORA FELIZ!');
  const desc  = i18n.t('promo_notif_desc', '−60% en toda la tienda');
  toast.innerHTML = `
    <div class="ach-icon" style="font-size:28px">🎉</div>
    <div class="ach-info">
      <div class="ach-title">${title}</div>
      <div class="ach-name">${desc}</div>
    </div>`;
  toast.classList.add('active');
  setTimeout(() => toast.classList.remove('active'), 5000);

  // Marcar como notificado para esta hora exacta
  try { localStorage.setItem('dodgeLastPromoNotif', promoHourKey); } catch (e) {}
}

// ============================================================
// TRANSICIÓN DE PROMO — Detecta si la hora del servidor acaba
// de entrar en la ventana 20:00-21:00. Si es así y la promo
// no se ha usado hoy, la activa (1 vez por día).
// ============================================================
let _lastTrustedHour = -1;

function _checkPromoTransition() {
  const now = new Date(trustedNow());
  const hour = now.getHours();
  const today = now.toISOString().slice(0, 10);

  // Detectar cambio de hora dentro de la ventana de promo
  if (hour === PROMO_START_HOUR && _lastTrustedHour !== PROMO_START_HOUR) {
    const used = localStorage.getItem('dodgeLastPromoUsedDate');
    if (used !== today) {
      localStorage.setItem('dodgeLastPromoUsedDate', today);
      // La promo se acaba de activar → notificar
      checkPromoNotification();
    }
  }
  _lastTrustedHour = hour;
}

function _getHourlyKey(itemId) { return `dodgeShopHourly:${itemId}:${new Date().toISOString().slice(0,13)}`; }
function _isHourlyLimited(item) { return item && item.hourlyLimit === 1; }
function _checkHourlyLimit(itemId) {
  try {
    const k = `dodgeShopHourlyLast:${itemId}`;
    const last = parseInt(localStorage.getItem(k) || '0', 10) || 0;
    if (Date.now() - last < 3600000) return false;
  } catch(e) {}
  return true;
}
function _setHourlyLimit(itemId) { try { localStorage.setItem(`dodgeShopHourlyLast:${itemId}`, String(Date.now())); } catch(e) {} }

function _isLivesAtMaxForItem(itemId){
  if(itemId==='life_normal_single' || itemId==='pack3_normal' || itemId==='pack3lives' || itemId==='full10_normal' || itemId==='full10lives') return livesNormal >= MAX_LIVES;
  if(itemId==='life_fast_single' || itemId==='pack3_fast' || itemId==='full10_fast') return livesFast >= MAX_LIVES;
  if(itemId==='life_swing_single' || itemId==='pack3_swing' || itemId==='full10_swing') return livesSwingcopter >= MAX_LIVES;
  if(itemId==='all_modes_max') return livesNormal >= MAX_LIVES && livesFast >= MAX_LIVES && livesSwingcopter >= MAX_LIVES;
  if(itemId==='life_super_20'){
    const cur = fastModeActive ? livesFast : swingcopterModeActive ? livesSwingcopter : livesNormal;
    return cur >= MAX_LIVES;
  }
  if(itemId==='extra_life') return livesNormal >= MAX_LIVES && livesFast >= MAX_LIVES && livesSwingcopter >= MAX_LIVES;
  return false;
}

function buyItem(itemId, payWith) {
  // Super 20 no está en catálogo (10 items), se gestiona aparte
  if (itemId === 'life_super_20') {
    if (_isLivesAtMaxForItem(itemId)) return { ok: false, reason: 'max_lives' };
    if (!_checkHourlyLimit(itemId)) return { ok: false, reason: 'max_daily_purchased' };
    if (getDust() < 20) return { ok: false, reason: 'not_enough_dust' };
    spendCurrency('dust', 20);
    _setHourlyLimit(itemId);
    _applyItemEffect({id:'life_super_20'});
    return { ok: true, costAmount:20, costCurrency:'dust' };
  }
  const item = SHOP_CATALOG.find(x => x.id === itemId);
  if (!item) return { ok: false, reason: 'item_not_found' };

  if (_isHourlyLimited(item) && !_checkHourlyLimit(itemId)) return { ok: false, reason: 'max_daily_purchased' };

  const limitType = _inferLimitType(item);

  // Lifetime max disappearance (point 2)
  const lifetimeMaxBuys = _getLifetimeMaxBuys(item);
  if (_getPurchasedCount(itemId) >= lifetimeMaxBuys) return { ok: false, reason: 'max_purchased' };

  // Daily limit only when limitType === 'daily' (except hourly items)
  if (!_isHourlyLimited(item) && limitType === 'daily' && _hasDailyLimit(item)) {
    const dailyLimit = _getDailyLimit(itemId, item);
    if (dailyLimit !== null) {
      const dailyBought = _getDailyPurchasedCount(itemId);
      if (dailyBought >= dailyLimit) return { ok: false, reason: 'max_daily_purchased' };
    }
  }

  // Bloqueo por vidas al máximo (vidas shop)
  if (_isLivesAtMaxForItem(itemId)) return { ok: false, reason: 'max_lives' };

  let costCurrency, costAmount;
  if (payWith === 'dust') {
    costCurrency = 'dust';
    costAmount = promoPrice(directCostInDust(item.currency, item.price));
  } else {
    costCurrency = item.currency;
    costAmount = promoPrice(item.price);
  }

  // Verificar saldo
  if (costCurrency === 'dust' && getDust() < costAmount)     return { ok: false, reason: 'not_enough_dust' };
  if (costCurrency === 'coins' && getCoins() < costAmount)   return { ok: false, reason: 'not_enough_coins' };
  if (costCurrency === 'tickets' && getTickets() < costAmount) return { ok: false, reason: 'not_enough_tickets' };
  if (costCurrency === 'skinCoins' && getSkinCoins() < costAmount) return { ok: false, reason: 'not_enough_skincoins' };

  // Cobrar
  spendCurrency(costCurrency, costAmount);

  // Registrar compra (lifetime)
  _shopPurchases[itemId] = (_shopPurchases[itemId] || 0) + 1;
  _savePurchases();

  if (_isHourlyLimited(item)) _setHourlyLimit(itemId);

  // Registrar compra diaria (si aplica)
  if (!_isHourlyLimited(item) && limitType === 'daily' && _hasDailyLimit(item)) {
    try { _incDailyPurchasedCount(itemId); } catch (e) {}
  }

  // Aplicar efecto
  _applyItemEffect(item);
  if (itemId === 'life_super_20') { try { setTimeout(() => { if (typeof startGame === 'function' && getCurrentLives() > 0) startGame(); }, 400); } catch(e) {} }

  return { ok: true, costAmount, costCurrency };
}

// ============================================================
// Renderizado de pestañas
// ============================================================
const _CURRENCY_ICONS = { coins: '🪙', tickets: '🎟️', skinCoins: '🎨', dust: '💨' };
const _CURRENCY_LABELS = { coins: 'currency_coins', tickets: 'currency_tickets', skinCoins: 'currency_skincoins', dust: 'currency_dust' };

function _currencyLabel(key) {
  const i18nKey = _CURRENCY_LABELS[key];
  return i18nKey ? i18n.t(i18nKey, key) : key;
}

function _canAfford(currency, amount) {
  if (currency === 'dust') return getDust() >= amount;
  if (currency === 'coins') return getCoins() >= amount;
  if (currency === 'tickets') return getTickets() >= amount;
  if (currency === 'skinCoins') return getSkinCoins() >= amount;
  return false;
}

let _cachedPackPreviewHtml = '';

function _refreshPackPreview() {
  const all = ['AMARILLO', 'AZUL', 'BLANCO', 'CIAN', 'LILA', 'MORADO', 'NARANJA', 'ROJO', 'ROSA', 'VERDE'];
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  const pick = shuffled.slice(0, 4);
  _cachedPackPreviewHtml = '<div class="shop-pack-preview">' + pick.map(c =>
    '<img src="images/Asteroid Rush Skins/M. 1 ' + c + '.png" class="shop-pack-preview-img" draggable="false">'
  ).join('') + '</div>';
}

function _getPackPreviewHtml() {
  return _cachedPackPreviewHtml;
}

function _renderItemCard(item, showBadge) {
  if (!item || !isFinite(item.price) || item.price === Infinity) return '';
  const bought = _getPurchasedCount(item.id);
  // Fix 8: sin maxBuys/lifetimeBuys => ilimitado (Infinity)
  const lt = _getLifetimeMaxBuys(item);
  let effectiveMax;
  if (lt !== 0 && isFinite(lt)) effectiveMax = lt;
  else if (item.maxBuys !== undefined && item.maxBuys !== null && item.maxBuys !== '') {
    const v = Number(item.maxBuys); effectiveMax = (v === 0) ? Infinity : (isFinite(v) ? v : Infinity);
  } else effectiveMax = Infinity;
  const soldOut = effectiveMax !== Infinity && bought >= effectiveMax;
  // daily/hourly agotado
  const limitType = _inferLimitType(item);
  let dailySold = false;
  if (limitType === 'daily' && _hasDailyLimit(item)) {
    const dl = _getDailyLimit(item.id, item);
    if (dl !== null && _getDailyPurchasedCount(item.id) >= dl) dailySold = true;
  }
  const hourlySold = _isHourlyLimited(item) && !_checkHourlyLimit(item.id);

  const locale = (typeof i18n !== 'undefined' && i18n && i18n.currentLocale) ? i18n.currentLocale : 'en';
  const name = item?.name_i18n?.[locale] ?? item?.name;
  const desc = item?.desc_i18n?.[locale] ?? item?.desc;

  const rawDustPrice = directCostInDust(item.currency, item.price);
  if (!isFinite(rawDustPrice) || rawDustPrice === Infinity) return '';
  const promoOn = isPromoActive();
  const finalPrice = promoPrice(item.price);
  const dustPrice = promoPrice(rawDustPrice);
  const affordCurrency = _canAfford(item.currency, finalPrice);
  const affordDust = _canAfford('dust', dustPrice);
  const badgeHtml = item.isOffer ? '<div class="offer-badge">' + i18n.t('oferton', 'OFERTÓN') + '</div>' : '';
  const packPreview = item.id === 'pack_skins_og' ? '<div class="shop-pack-preview-row">' + _getPackPreviewHtml() + '</div>' : '';

  const headerHtml = item.id === 'pack_skins_og'
    ? `<div class="shop-item-header shop-item-header--pack">
        <span class="shop-item-name">${name}</span>
        ${packPreview}
      </div>`
    : `<div class="shop-item-header">
        <span class="shop-item-icon">${item.icon}</span>
        <span class="shop-item-name">${name}</span>
      </div>`;

  if (dailySold || hourlySold) {
    return `<div class="shop-item" data-item="${item.id}">
      ${headerHtml}
      <div class="shop-item-desc">${desc}</div>
      <div class="shop-item-sold">${i18n.t('shop_agotado', 'Agotado')}</div>
      ${badgeHtml}
    </div>`;
  }

  if (soldOut) {
    return `<div class="shop-item" data-item="${item.id}">
      ${headerHtml}
      <div class="shop-item-desc">${desc}</div>
      <div class="shop-item-sold">${i18n.t('shop_sold', '✓ Purchased')}</div>
      ${badgeHtml}
    </div>`;
  }

  const isLivesMax = _isLivesAtMaxForItem(item.id);
  if (isLivesMax) {
    return `<div class="shop-item" data-item="${item.id}">
      ${headerHtml}
      <div class="shop-item-desc">${desc}</div>
      <div class="shop-item-sold" style="background:rgba(80,227,194,0.12);border-color:rgba(80,227,194,0.25);color:#00bcd4">${i18n.t('shop_max_lives', 'MAX — Vidas al máximo')}</div>
      ${badgeHtml}
    </div>`;
  }

  return `<div class="shop-item" data-item="${item.id}">
    ${headerHtml}
    <div class="shop-item-desc">${desc}</div>
    <div class="shop-price-row">
      <button class="shop-buy-btn shop-buy-currency" data-buy-id="${item.id}" data-pay="${item.currency}"
        ${!affordCurrency ? 'disabled' : ''}>${promoOn ? `<s>${item.price}</s> ` : ''}${finalPrice} ${_CURRENCY_ICONS[item.currency]}</button>
      <button class="shop-buy-btn shop-buy-dust" data-buy-id="${item.id}" data-pay="dust"
        ${!affordDust ? 'disabled' : ''}>${promoOn ? `<s>${rawDustPrice.toLocaleString()}</s> ` : ''}${dustPrice.toLocaleString()} 💨</button>
    </div>
    ${badgeHtml}
  </div>`;
}

function _getGroupVisibleSelection(group, tab) {
  // Snapshot por día y groupId para consistencia visual
  // group: {id, tab, visibleCount, items:[{itemId, prob}]}
  const dayId = _getDayId();
  const key = `dodgeShopGroupSelection:${group.id}:${dayId}`;

  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const ids = JSON.parse(cached);
      if (Array.isArray(ids) && ids.length) {
        // Validar cache: si contiene Infinity o vendidos, recalcular y escoger otro
        const validCached = ids.filter(id => {
          const it = SHOP_CATALOG.find(x => x.id === id);
          if (!it || !isFinite(it.price) || it.price === Infinity) return false;
          const m = _getLifetimeMaxBuys(it);
          const eff = (m !== 0 && isFinite(m)) ? m : (it.maxBuys !== undefined && it.maxBuys !== null && it.maxBuys !== '' ? (Number(it.maxBuys)===0?Infinity:Number(it.maxBuys)) : Infinity);
          if (eff !== Infinity && _getPurchasedCount(it.id) >= eff) return false;
          return true;
        });
        if (validCached.length === ids.length && validCached.length > 0) return validCached;
        // cache inválida (contenía Infinity/vendidos) → recalcular abajo
        try { localStorage.removeItem(key); } catch(e) {}
      }
    }
  } catch (e) {}

  const visibleCount = Math.max(0, Number(group.visibleCount ?? 0) || 0);
  const pool = Array.isArray(group.items) ? group.items : [];

  // Filtramos items comprados al máximo para que desaparezcan
  const candidate = pool
    .map(x => ({ itemId: x.itemId, prob: Number(x.prob ?? 0) || 0 }))
    .filter(x => typeof x.itemId === 'string');

  // draw ponderado SIN REEMPLAZO (hasta visibleCount)
  const selected = [];
  const remaining = candidate.slice();

  // Intentos acotados para evitar bucles si visibleCount > candidatos vendibles
  while (selected.length < visibleCount && remaining.length > 0) {
    // total prob de los remaining que aún no están a maxBuys
    const remainingWithProb = [];
    let total = 0;
    for (const r of remaining) {
      const it = SHOP_CATALOG.find(x => x.id === r.itemId);
      if (!it) continue;
      if (!isFinite(it.price) || it.price === Infinity) continue;
      const _m = _getLifetimeMaxBuys(it);
      const _eff = (_m !== 0 && isFinite(_m)) ? _m : (it.maxBuys !== undefined && it.maxBuys !== null && it.maxBuys !== '' ? (Number(it.maxBuys)===0?Infinity:Number(it.maxBuys)) : Infinity);
      const bought = _getPurchasedCount(it.id);
      if (_eff !== Infinity && bought >= _eff) continue;
      const pr = Math.max(0, r.prob);
      if (pr <= 0) continue;
      remainingWithProb.push({ ...r, prob: pr });
      total += pr;
    }

    if (total <= 0) break;

    let pick = Math.random() * total;
    let pickedId = null;
    for (const r of remainingWithProb) {
      pick -= r.prob;
      if (pick <= 0) { pickedId = r.itemId; break; }
    }

    if (!pickedId) break;
    selected.push(pickedId);

    // eliminar del remaining el pickedId
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (remaining[i].itemId === pickedId) remaining.splice(i, 1);
    }
  }

  try {
    localStorage.setItem(key, JSON.stringify(selected));
  } catch (e) {}

  return selected;
}

function _renderTab(tab) {
  const container = document.getElementById('shop-content');
  if (!container) return;

  if (tab === 'exchange') {
    container.classList.add('exchange-active');
    renderExchangePanel(container);
    return;
  } else {
    container.classList.remove('exchange-active');
  }

  // Ofertas: selección dinámica de todos los items con isOffer
  if (tab === 'offers') {
    const allOffers = SHOP_CATALOG.filter(x => x.type === 'item' && x.isOffer === true && isFinite(x.price) && x.price !== Infinity);
    if (!allOffers.length) {
      container.innerHTML = '<div class="shop-empty"></div>';
    } else {
      const dayId = _getDayId();
      const cacheKey = 'dodgeShopOfferSelection:' + dayId;
      let selectedIds;
      try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              const valid = parsed.filter(id => {
                const it = SHOP_CATALOG.find(y => y.id === id);
                return it && isFinite(it.price) && it.price !== Infinity && it.isOffer === true;
              });
              if (valid.length) selectedIds = valid;
              else { try { localStorage.removeItem(cacheKey); } catch(e) {} }
            }
          }
        } catch (e) {}
      if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
        const shuffled = [...allOffers].sort(() => Math.random() - 0.5);
        selectedIds = shuffled.slice(0, Math.min(4, allOffers.length)).map(x => x.id);
        try { localStorage.setItem(cacheKey, JSON.stringify(selectedIds)); } catch (e) {}
      }
      const itemsToRender = selectedIds
        .map(id => SHOP_CATALOG.find(x => x.id === id))
        .filter(it => it && isFinite(it.price) && it.price !== Infinity);
      const rendered = itemsToRender.map(item => _renderItemCard(item, true)).filter(Boolean).join('');
      container.innerHTML = rendered || '<div class="shop-empty"></div>';
    }
  }
  // Motor groups (si existen). Si no existen, render clásico type=item.
  else {
    const groups = (SHOP_GROUPS || []).filter(g => g && g.tab === tab);

    if (!groups.length) {
      const items = SHOP_CATALOG.filter(x => x.tab === tab);
      container.innerHTML = items.map(_renderItemCard).join('');
    } else {
      // Un tab puede tener múltiples grupos: agregamos las selecciones en orden
      const selectedIds = [];
      for (const g of groups) {
        const ids = _getGroupVisibleSelection(g, tab);
        for (const id of ids) selectedIds.push(id);
      }

      // Render único por id (por si dos grupos muestran el mismo)
      const uniq = Array.from(new Set(selectedIds));
      const itemsToRender = uniq
        .map(id => SHOP_CATALOG.find(x => x.id === id))
        .filter(Boolean);

      container.innerHTML = itemsToRender.map(_renderItemCard).join('');
    }
  }

  // En la pestaña skinCoins, añadir las piezas rotativas debajo
  if (tab === 'skinCoins') {
    _renderSkinPartsTab(container, true);
  }

  // Si hay 2 o menos items, mostrar con tamaño completo como el panel de cambio
  const few = container.querySelectorAll('.shop-item').length <= 2;
  container.classList.toggle('shop-content--few', few);

  // Event listeners para botones de compra (con confirm modal + animación)
  container.querySelectorAll('.shop-buy-btn[data-buy-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemId = btn.dataset.buyId;
      const payWith = btn.dataset.pay;

      const item = SHOP_CATALOG.find(x => x.id === itemId);
      if (!item) return;

      const costCurrency = (payWith === 'dust') ? 'dust' : item.currency;
      const costAmount = promoPrice((payWith === 'dust') ? directCostInDust(item.currency, item.price) : item.price);

      openShopConfirm({
        item,
        payWith,
        costCurrency,
        costAmount,
        btn
      });
    });
  });

  // Reinyectar banner promo después de renderizar contenido
  updatePromoBanner();
}

// ============================================================
// Pestaña de Piezas (skins rotativas)
// ============================================================
function _renderSkinPartsTab(container, appendMode) {
  const items = getDailySkinShopItems();
  if (!items || items.length === 0) {
    if (!appendMode) container.innerHTML = '<div class="shop-empty">' + i18n.t('skin_none_today', 'No hay piezas disponibles hoy. Vuelve mañana.') + '</div>';
    return;
  }

  let html = '';
  for (const entry of items) {
    const skin = entry.skin;
    if (!skin) continue;
    const price = entry.price;
    if (!isFinite(price) || price === Infinity) continue;
    const owned = entry.owned;
    const name = getSkinShopName(entry.skinKey);
    const rawDust = directCostInDust('skinCoins', price);
    const promoOn = isPromoActive();
    const finalPrice = promoPrice(price);
    const dustPrice = promoPrice(rawDust);
    const affordCurrency = _canAfford('skinCoins', finalPrice);
    const affordDust = _canAfford('dust', dustPrice);

    // Generar preview de la imagen
    let previewHtml = '';
    if (skin.type === 'montaje' && skin.parts) {
      const layerOrder = ['base', 'alas', 'propulsor', 'cabina'];
      for (const t of layerOrder) {
        const partKey = skin.parts[t];
        if (!partKey) continue;
        const partSkin = getSkinByKey(partKey);
        if (partSkin) {
          previewHtml += `<img src="${partSkin.path}" class="shop-skin-preview-layer" draggable="false">`;
        }
      }
    } else {
      const imgSrc = skin.path || '';
      previewHtml = `<img src="${imgSrc}" class="shop-skin-preview-img" draggable="false">`;
    }

    if (owned) {
      html += `<div class="shop-item">
        <div class="shop-item-header">
          <span class="shop-item-icon shop-skin-icon">${previewHtml}</span>
          <span class="shop-item-name">${name}</span>
        </div>
        <div class="shop-item-desc">${i18n.t('skin_part_desc', 'Pieza decorativa para tu nave')}</div>
        <div class="shop-item-sold">${i18n.t('skin_bought', '✓ Comprada')}</div>
      </div>`;
    } else {
      html += `<div class="shop-item" data-skin="${entry.skinKey}">
        <div class="shop-item-header">
          <span class="shop-item-icon shop-skin-icon">${previewHtml}</span>
          <span class="shop-item-name">${name}</span>
        </div>
        <div class="shop-item-desc">${i18n.t('skin_part_desc', 'Pieza decorativa para tu nave')}</div>
        <div class="shop-price-row">
          <button class="shop-buy-btn shop-buy-currency skin-shop-buy" data-skin-buy="${entry.skinKey}" data-pay="skinCoins"
            ${!affordCurrency ? 'disabled' : ''}>${promoOn ? `<s>${price.toLocaleString()}</s> ` : ''}${finalPrice.toLocaleString()} 🎨</button>
          <button class="shop-buy-btn shop-buy-dust skin-shop-buy" data-skin-buy="${entry.skinKey}" data-pay="dust"
            ${!affordDust ? 'disabled' : ''}>${promoOn ? `<s>${rawDust.toLocaleString()}</s> ` : ''}${dustPrice.toLocaleString()} 💨</button>
        </div>
      </div>`;
    }
  }
  if (appendMode) {
    container.insertAdjacentHTML('beforeend', html);
  } else {
    container.innerHTML = html;
  }

  container.querySelectorAll('[data-skin-buy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const skinKey = btn.dataset.skinBuy;
      const payWith = btn.dataset.pay || 'skinCoins';
      buySkinPartDirectly(skinKey, payWith, container, btn);
    });
  });
}

function buySkinPartDirectly(skinKey, payWith, container, btn) {
  const price = getSkinPrice(skinKey);
  if (price <= 0) return;
  if (isSkinUnlocked(skinKey)) {
    if (btn) { btn.classList.add('purchase-fail'); setTimeout(()=>btn.classList.remove('purchase-fail'), 650); }
    return;
  }

  let costCurrency, costAmount;
  if (payWith === 'dust') {
    costCurrency = 'dust';
    costAmount = promoPrice(directCostInDust('skinCoins', price));
  } else {
    costCurrency = 'skinCoins';
    costAmount = promoPrice(price);
  }

  if (costCurrency === 'skinCoins' && getSkinCoins() < costAmount) {
    if (btn) { btn.classList.add('purchase-fail'); setTimeout(()=>btn.classList.remove('purchase-fail'), 650); }
    return;
  }
  if (costCurrency === 'dust' && getDust() < costAmount) {
    if (btn) { btn.classList.add('purchase-fail'); setTimeout(()=>btn.classList.remove('purchase-fail'), 650); }
    return;
  }

  const skin = getSkinByKey(skinKey);
  if (!skin) return;
  const name = getSkinShopName(skinKey);
  const costIcon = _CURRENCY_ICONS[costCurrency];

  openShopConfirm({
    item: { id: skinKey, icon: '🚀', name, desc: i18n.t('skin_part_desc', 'Pieza decorativa para tu nave') },
    payWith,
    costCurrency,
    costAmount,
    btn,
    _onConfirm: () => {
      if (costCurrency === 'skinCoins' && getSkinCoins() < costAmount) {
        if (btn) { btn.classList.add('purchase-fail'); setTimeout(()=>btn.classList.remove('purchase-fail'), 650); }
        return false;
      }
      if (costCurrency === 'dust' && getDust() < costAmount) {
        if (btn) { btn.classList.add('purchase-fail'); setTimeout(()=>btn.classList.remove('purchase-fail'), 650); }
        return false;
      }
      if (isSkinUnlocked(skinKey)) {
        if (btn) { btn.classList.add('purchase-fail'); setTimeout(()=>btn.classList.remove('purchase-fail'), 650); }
        return false;
      }
      spendCurrency(costCurrency, costAmount);
      unlockSkin(skinKey);
      _shopPurchases['skin_' + skinKey] = (_shopPurchases['skin_' + skinKey] || 0) + 1;
      _savePurchases();
      if (btn) {
        btn.classList.add('purchase-success');
        const orig = btn.innerHTML;
        btn.innerHTML = '✓';
        setTimeout(()=>{ btn.innerHTML = orig; btn.classList.remove('purchase-success'); }, 950);
      }
      playLevelUp();
      const doRefresh = () => {
        updateShopUI();
        _renderTab(_currentTab);
        const boughtMsg = i18n.t('skin_bought_format', '✓ Comprada por {amount} {icon}').replace('{amount}', costAmount.toLocaleString()).replace('{icon}', costIcon);
        _showShopResult(boughtMsg, '#4caf50', container);
        if (typeof generateSkinSelector === 'function') generateSkinSelector();
        if (typeof updateShipVisuals === 'function') updateShipVisuals();
      };
      if (btn) setTimeout(doRefresh, 950); else doRefresh();
      return true;
    }
  });
}

function _showShopResult(msg, color, container) {
  const resEl = document.getElementById('shop-result');
  if (resEl) {
    resEl.textContent = msg;
    resEl.style.color = color;
    resEl.classList.add('show');
    setTimeout(() => resEl.classList.remove('show'), 2500);
  }
}

// ============================================================
// Lives shop 3x4 (ofertón + grid)
// ============================================================
function _formatLivesHeader(mode) {
  const lives = mode==='fast'?livesFast : mode==='swingcopter'?livesSwingcopter : livesNormal;
  const max = MAX_LIVES;
  const acc = mode==='fast'?accumulatedLifeTimeFast : mode==='swingcopter'?accumulatedLifeTimeSwingcopter : accumulatedLifeTimeNormal;
  const interval = mode==='fast'?FAST_MODE_LIFE_INTERVAL_MS : SWINGCOPTER_LIFE_INTERVAL_MS;
  if (lives >= max) return `${lives}/${max} MAX`;
  const remain = Math.max(0, interval - acc);
  const m = Math.floor(remain/60000), s = Math.floor((remain%60000)/1000);
  return `${lives}/${max} ${m}:${String(s).padStart(2,'0')}`;
}
function _heartsHtml(lives) {
  let h=''; const full=Math.floor(lives/2), half=lives%2===1;
  for(let i=0;i<full;i++) h+='<img src="images/Full.png" class="heart-img" style="width:12px;height:12px;">';
  if(half) h+='<img src="images/Half.png" class="heart-img" style="width:12px;height:12px;">';
  const empty=Math.ceil(MAX_LIVES/2)-full-(half?1:0);
  for(let i=0;i<empty;i++) h+='<img src="images/Empty.png" class="heart-img" style="width:12px;height:12px;opacity:0.4;">';
  return h||'<span style="opacity:0.5">0</span>';
}
function renderLivesShopGrid() {
  const grid = document.getElementById('lives-shop-grid');
  if (!grid) return;
  const promoOn = typeof isPromoActive === 'function' ? isPromoActive() : false;
  const modes = [{id:'normal', label:'Normal', lives:livesNormal}, {id:'fast', label:'Rápido', lives:livesFast}, {id:'swingcopter', label:'Zigzag', lives:livesSwingcopter}];
  let html = '<div class="lives-grid-6x3">';
  for(const m of modes) html+=`<div class="lives-cell header">${m.label}</div>`;
  for(const m of modes) html+=`<div class="lives-cell lives-count" data-lives-count="${m.id}">${_heartsHtml(m.lives)}</div>`;
  const singleMap = {normal:'life_normal_single', fast:'life_fast_single', swingcopter:'life_swing_single'};
  for(const m of modes) {
    const it = SHOP_CATALOG.find(x=>x.id===singleMap[m.id]);
    const isMax = it ? _isLivesAtMaxForItem(it.id) : false;
    if (isMax) {
      html+=`<div class="lives-cell"><div class="lives-shop-item">${it?it.name:'—'}<br><div class="shop-item-sold" style="background:rgba(80,227,194,0.12);border-color:rgba(80,227,194,0.25);color:#00bcd4">${i18n.t('shop_max_lives', 'MAX — Vidas al máximo')}</div></div></div>`;
      continue;
    }
    if (!it || !isFinite(it.price)) {
      html+=`<div class="lives-cell"><div class="lives-shop-item">${it?it.name:'—'}<br><div class="shop-item-sold">—</div></div></div>`;
      continue;
    }
    const rawDust = directCostInDust(it.currency, it.price);
    if (!isFinite(rawDust)) { html+=`<div class="lives-cell"><div class="lives-shop-item">${it.name}<br><div class="shop-item-sold">—</div></div></div>`; continue; }
    const price = promoPrice(it.price); const dustPrice = promoPrice(rawDust);
    if (!isFinite(price) || !isFinite(dustPrice)) { html+=`<div class="lives-cell"><div class="lives-shop-item">${it.name}<br><div class="shop-item-sold">—</div></div></div>`; continue; }
    const affordCoins = _canAfford(it.currency, price);
    const affordDust = _canAfford('dust', dustPrice);
    const priceLabel = promoOn ? `<s style="opacity:0.5;font-size:8px">${it.price}</s> ${price}` : price;
    const dustLabel = promoOn ? `<s style="opacity:0.5;font-size:8px">${rawDust}</s> ${dustPrice}` : dustPrice;
    html+=`<div class="lives-cell"><div class="lives-shop-item">${it.name}<br><div class="lives-dual-btns"><button class="lives-buy-btn" data-lives-buy="${it.id}" data-mode="${m.id}" data-pay="coins" ${!affordCoins?'disabled':''}>${priceLabel} 🪙</button><button class="lives-buy-btn dust" data-lives-buy="${it.id}" data-mode="${m.id}" data-pay="dust" ${!affordDust?'disabled':''}>${dustLabel} 💨</button></div></div></div>`;
  }
  const packMap = {normal:'pack3_normal', fast:'pack3_fast', swingcopter:'pack3_swing'};
  for(const m of modes) {
    const it = SHOP_CATALOG.find(x=>x.id===packMap[m.id]);
    const isMax = it ? _isLivesAtMaxForItem(it.id) : false;
    if (isMax) {
      html+=`<div class="lives-cell"><div class="lives-shop-item">${it?it.name:'Pack 3'}<br><div class="shop-item-sold" style="background:rgba(80,227,194,0.12);border-color:rgba(80,227,194,0.25);color:#00bcd4">${i18n.t('shop_max_lives', 'MAX — Vidas al máximo')}</div></div></div>`;
      continue;
    }
    if (!it || !isFinite(it.price)) { html+=`<div class="lives-cell"><div class="lives-shop-item">Pack 3<br><div class="shop-item-sold">—</div></div></div>`; continue; }
    const rawDust = directCostInDust(it.currency, it.price); if (!isFinite(rawDust)) { html+=`<div class="lives-cell"><div class="lives-shop-item">${it.name}<br><div class="shop-item-sold">—</div></div></div>`; continue; }
    const price = promoPrice(it.price); const dustPrice = promoPrice(rawDust); if (!isFinite(price)||!isFinite(dustPrice)) { html+=`<div class="lives-cell"><div class="lives-shop-item">${it.name}<br><div class="shop-item-sold">—</div></div></div>`; continue; }
    const affordCoins = _canAfford(it.currency, price); const affordDust = _canAfford('dust', dustPrice);
    const priceLabel = promoOn ? `<s style="opacity:0.5;font-size:8px">${it.price}</s> ${price}` : price;
    const dustLabel = promoOn ? `<s style="opacity:0.5;font-size:8px">${rawDust}</s> ${dustPrice}` : dustPrice;
    html+=`<div class="lives-cell"><div class="lives-shop-item">${it.name}<br><div class="lives-dual-btns"><button class="lives-buy-btn" data-lives-buy="${it.id}" data-mode="${m.id}" data-pay="coins" ${!affordCoins?'disabled':''}>${priceLabel} 🪙</button><button class="lives-buy-btn dust" data-lives-buy="${it.id}" data-mode="${m.id}" data-pay="dust" ${!affordDust?'disabled':''}>${dustLabel} 💨</button></div></div></div>`;
  }
  const fullMap = {normal:'full10_normal', fast:'full10_fast', swingcopter:'full10_swing'};
  for(const m of modes) {
    const it = SHOP_CATALOG.find(x=>x.id===fullMap[m.id]);
    const isMax = it ? _isLivesAtMaxForItem(it.id) : false;
    if (isMax) {
      html+=`<div class="lives-cell"><div class="lives-shop-item">${it?it.name:'Total'}<br><div class="shop-item-sold" style="background:rgba(80,227,194,0.12);border-color:rgba(80,227,194,0.25);color:#00bcd4">${i18n.t('shop_max_lives', 'MAX — Vidas al máximo')}</div></div></div>`;
      continue;
    }
    if (!it || !isFinite(it.price)) { html+=`<div class="lives-cell"><div class="lives-shop-item">Total<br><div class="shop-item-sold">—</div></div></div>`; continue; }
    const rawDust = directCostInDust(it.currency, it.price); if (!isFinite(rawDust)) { html+=`<div class="lives-cell"><div class="lives-shop-item">${it.name}<br><div class="shop-item-sold">—</div></div></div>`; continue; }
    const price = promoPrice(it.price); const dustPrice = promoPrice(rawDust); if (!isFinite(price)||!isFinite(dustPrice)) { html+=`<div class="lives-cell"><div class="lives-shop-item">${it.name}<br><div class="shop-item-sold">—</div></div></div>`; continue; }
    const affordCoins = _canAfford(it.currency, price); const affordDust = _canAfford('dust', dustPrice);
    const priceLabel = promoOn ? `<s style="opacity:0.5;font-size:8px">${it.price}</s> ${price}` : price;
    const dustLabel = promoOn ? `<s style="opacity:0.5;font-size:8px">${rawDust}</s> ${dustPrice}` : dustPrice;
    html+=`<div class="lives-cell"><div class="lives-shop-item">${it.name}<br><div class="lives-dual-btns"><button class="lives-buy-btn" data-lives-buy="${it.id}" data-mode="${m.id}" data-pay="coins" ${!affordCoins?'disabled':''}>${priceLabel} 🪙</button><button class="lives-buy-btn dust" data-lives-buy="${it.id}" data-mode="${m.id}" data-pay="dust" ${!affordDust?'disabled':''}>${dustLabel} 💨</button></div></div></div>`;
  }
  const it30 = SHOP_CATALOG.find(x=>x.id==='all_modes_max');
  const isMax30 = it30 ? _isLivesAtMaxForItem(it30.id) : false;
  if (isMax30) {
    html+=`<div class="lives-cell span3"><div class="lives-shop-item">${it30?it30.name:'Todo al Máximo'} — 30 vidas<br><div class="shop-item-sold" style="background:rgba(80,227,194,0.12);border-color:rgba(80,227,194,0.25);color:#00bcd4">${i18n.t('shop_max_lives', 'MAX — Vidas al máximo')}</div></div></div>`;
  } else {
    const rawDust30 = it30 ? directCostInDust(it30.currency, it30.price) : Infinity;
    const price30 = it30 ? promoPrice(it30.price) : Infinity;
    const dust30 = it30 ? promoPrice(rawDust30) : Infinity;
    const afford30c = it30 && _canAfford(it30.currency, price30);
    const afford30d = it30 && _canAfford('dust', dust30);
    const price30Label = it30 ? (promoOn ? `<s style="opacity:0.5;font-size:8px">${it30.price}</s> ${price30}` : price30) : '';
    const dust30Label = it30 ? (promoOn ? `<s style="opacity:0.5;font-size:8px">${rawDust30}</s> ${dust30}` : dust30) : '';
    html+=`<div class="lives-cell span3"><div class="lives-shop-item">${it30?it30.name:'Todo al Máximo'} — 30 vidas<br><div class="lives-dual-btns"><button class="lives-buy-btn" data-lives-buy="${it30?it30.id:''}" data-mode="normal" data-pay="coins" ${!afford30c?'disabled':''}>${price30Label} 🪙</button><button class="lives-buy-btn dust" data-lives-buy="${it30?it30.id:''}" data-mode="normal" data-pay="dust" ${!afford30d?'disabled':''}>${dust30Label} 💨</button></div></div></div>`;
  }
  html+='</div>';
  grid.innerHTML = html;
  grid.querySelectorAll('[data-lives-buy]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id=btn.dataset.livesBuy, mode=btn.dataset.mode, pay=btn.dataset.pay||'coins';
      const item = SHOP_CATALOG.find(x=>x.id===id);
      if(!item) return;
      const costCurrency = pay==='dust' ? 'dust' : item.currency;
      const rawAmount = pay==='dust' ? directCostInDust(item.currency, item.price) : item.price;
      const costAmount = promoPrice(rawAmount);
      const clickedBtn = btn;
      openShopConfirm({
        item, payWith:pay, costCurrency, costAmount,
        _onConfirm: ()=>{
          if(mode==='fast'){fastModeActive=true; swingcopterModeActive=false;} else if(mode==='swingcopter'){swingcopterModeActive=true; fastModeActive=false;} else {fastModeActive=false; swingcopterModeActive=false;}
          updateModeUI();
          const res=buyItem(id,pay);
          if(typeof updatePlayButtonState==='function') updatePlayButtonState();
          if(res.ok){
            clickedBtn.classList.add('purchase-success');
            const origHtml = clickedBtn.innerHTML;
            clickedBtn.innerHTML = '✓';
            const heartCell = document.querySelector(`[data-lives-count="${mode}"]`);
            if(heartCell){ heartCell.classList.add('lives-heart-flash'); setTimeout(()=>heartCell.classList.remove('lives-heart-flash'), 1500); }
            setTimeout(()=>{
              clickedBtn.innerHTML = origHtml;
              clickedBtn.classList.remove('purchase-success');
              renderLivesShopGrid(); updateShopUI(); updateLivesUI(); updateOverlayLivesInfo();
              if(typeof updatePlayButtonState==='function') updatePlayButtonState();
            }, 950);
            try{ playLevelUp(); }catch(e){}
          } else {
            clickedBtn.classList.add('purchase-fail');
            setTimeout(()=> clickedBtn.classList.remove('purchase-fail'), 650);
            setTimeout(()=>{ renderLivesShopGrid(); updateShopUI(); if(typeof updatePlayButtonState==='function') updatePlayButtonState(); }, 600);
          }
          return true;
        }
      });
    });
  });
}
function refreshLivesShopLiveCounters(){
  const ov=document.getElementById('lives-shop-overlay');
  if(!ov || ov.classList.contains('hidden')) return;
  const confirmOv=document.getElementById('shop-confirm-overlay');
  if(confirmOv && !confirmOv.classList.contains('hidden')) return;
  const grid=document.getElementById('lives-shop-grid');
  if(!grid) return;
  const modes=[{id:'normal', lives:livesNormal},{id:'fast', lives:livesFast},{id:'swingcopter', lives:livesSwingcopter}];
  // si el estado MAX cambió, re-render completo para mostrar/ocultar texto COMPRADO
  const singleMapChk = {normal:'life_normal_single', fast:'life_fast_single', swingcopter:'life_swing_single'};
  const packMapChk = {normal:'pack3_normal', fast:'pack3_fast', swingcopter:'pack3_swing'};
  const fullMapChk = {normal:'full10_normal', fast:'full10_fast', swingcopter:'full10_swing'};
  let expectedSold=0;
  for(const m of modes){
    if(_isLivesAtMaxForItem(singleMapChk[m.id])) expectedSold++;
    if(_isLivesAtMaxForItem(packMapChk[m.id])) expectedSold++;
    if(_isLivesAtMaxForItem(fullMapChk[m.id])) expectedSold++;
  }
  if(_isLivesAtMaxForItem('all_modes_max')) expectedSold++;
  const actualSold=grid.querySelectorAll('.shop-item-sold').length;
  if(expectedSold!==actualSold){
    renderLivesShopGrid();
    return;
  }
  grid.querySelectorAll('[data-lives-count]').forEach(cell=>{
    const mode=cell.dataset.livesCount;
    const m=modes.find(x=>x.id===mode);
    if(!m) return;
    const newHtml=_heartsHtml(m.lives);
    if(cell.innerHTML!==newHtml) cell.innerHTML=newHtml;
  });
  grid.querySelectorAll('[data-lives-buy]').forEach(btn=>{
    const id=btn.dataset.livesBuy, pay=btn.dataset.pay;
    const item=SHOP_CATALOG.find(x=>x.id===id);
    if(!item) return;
    const isMax=_isLivesAtMaxForItem(id);
    const raw=pay==='dust'?directCostInDust(item.currency,item.price):item.price;
    const cost=promoPrice(raw);
    const cur=pay==='dust'?'dust':item.currency;
    const affordable=!isMax && _canAfford(cur,cost);
    const shouldDisable=!affordable;
    if(btn.disabled!==shouldDisable) btn.disabled=shouldDisable;
    const promoOn=typeof isPromoActive==='function'?isPromoActive():false;
    const icon=pay==='dust'?'💨':'🪙';
    let label;
    if(isMax) label=i18n.t('shop_max_lives_short', 'MAX');
    else if(promoOn && cost!==raw) label=`<s style="opacity:0.5;font-size:8px">${raw}</s> ${cost}`;
    else label=cost;
    const expectedHtml=label+' '+icon;
    if(btn.innerHTML!==expectedHtml) btn.innerHTML=expectedHtml;
  });
}
function openSuperOfferOverlay() {
  const ov = document.getElementById('super-offer-overlay');
  if (!ov) return;
  ov.classList.remove('hidden');
  // limpiar resultado previo
  const resEl = document.getElementById('super-offer-result');
  if (resEl) { resEl.textContent=''; resEl.classList.remove('show'); }
  playMenuClickSound();
  const buyBtn = document.getElementById('super-offer-buy');
  const passBtn = document.getElementById('super-offer-pass');
  const curLivesSuper = fastModeActive ? livesFast : swingcopterModeActive ? livesSwingcopter : livesNormal;
  const isMaxSuper = curLivesSuper >= MAX_LIVES;
  if (buyBtn) {
    buyBtn.disabled = isMaxSuper;
    if (isMaxSuper) {
      buyBtn.textContent = i18n.t('shop_max_lives', 'MAX — Vidas al máximo');
      buyBtn.style.opacity = '0.5';
      buyBtn.style.cursor = 'not-allowed';
    } else {
      buyBtn.textContent = i18n.t('super_offer_buy', '⚡ COMPRAR Y JUGAR ⚡');
      buyBtn.style.opacity = '';
      buyBtn.style.cursor = '';
    }
  }
  if (buyBtn) buyBtn.onclick = () => {
    if (isMaxSuper) return;
    const r = buyItem('life_super_20','dust');
    const rEl = document.getElementById('super-offer-result');
    if (r.ok) {
      closeSuperOfferOverlay();
      closeLivesShop();
      updateShopUI(); updateDustUI(); updateLivesUI(); updateOverlayLivesInfo();
      if(typeof updatePlayButtonState==='function') updatePlayButtonState();
      setTimeout(()=>{ if(getCurrentLives()>0) startGame(); }, 300);
    } else {
      if (rEl) {
        let msg='✗ ' + i18n.t('shop_error_default', 'No disponible');
        if(r.reason==='not_enough_dust') msg='✗ ' + i18n.t('shop_not_enough_dust', 'Polvo insuficiente') + ' (20 💨)';
        else if(r.reason==='max_lives') msg='✗ ' + i18n.t('shop_error_max_lives', 'Vidas al máximo');
        rEl.textContent = msg;
        rEl.style.color='#ff5252'; rEl.classList.add('show'); setTimeout(()=>rEl.classList.remove('show'),2500);
        if(r.reason==='max_lives' && buyBtn){ buyBtn.classList.add('purchase-fail'); setTimeout(()=>buyBtn.classList.remove('purchase-fail'),650); }
      }
    }
  };
  if (passBtn) passBtn.onclick = () => {
    _setHourlyLimit('life_super_20');
    closeSuperOfferOverlay();
    // Tras pasar, mostrar la tienda normal de vidas
    openLivesShop(true);
    playMenuClickSound();
  };
}
function closeSuperOfferOverlay(){ const ov=document.getElementById('super-offer-overlay'); if(ov) ov.classList.add('hidden'); }

function openLivesShop(forceNormal) {
  if (!forceNormal && _checkHourlyLimit('life_super_20')) {
    openSuperOfferOverlay();
    return;
  }
  const ov=document.getElementById('lives-shop-overlay');
  if(!ov) return;
  renderLivesShopGrid();
  ov.classList.remove('hidden');
  playMenuClickSound();
  if(_livesShopRefreshInterval) clearInterval(_livesShopRefreshInterval);
  _livesShopRefreshInterval=setInterval(refreshLivesShopLiveCounters, 500);
  refreshLivesShopLiveCounters();
  // comprobar promo también dentro de vidas
  _lastPromoActive = isPromoActive();
  _startPromoInterval();
}
function closeLivesShop(){
  const ov=document.getElementById('lives-shop-overlay');
  if(ov) ov.classList.add('hidden');
  if(_livesShopRefreshInterval){ clearInterval(_livesShopRefreshInterval); _livesShopRefreshInterval=null; }
}
// ============================================================
// Abrir / cerrar tienda
// ============================================================
function openShop() {
  const ov = document.getElementById('shop-overlay');
  if (!ov) return;
  _refreshPackPreview();
  ov.classList.remove('hidden');
  _currentTab = 'offers'; // Siempre abre en Ofertas
  updateShopUI();
  updatePromoBanner();
  _startPromoInterval();
  _checkPromoTransition();
  checkPromoNotification();

  _highlightTab('offers');
  _renderTab('offers');
  playMenuClickSound();
}

function closeShop() {
  const ov = document.getElementById('shop-overlay');
  if (ov) ov.classList.add('hidden');
  const livesOv = document.getElementById('lives-shop-overlay');
  const anyOpen = livesOv && !livesOv.classList.contains('hidden');
  if (!anyOpen && !isPromoActive()) _stopPromoInterval();
}
function initLivesShopClose() {
  const btn = document.getElementById('lives-shop-close-btn');
  if (btn) btn.addEventListener('click', () => { closeLivesShop(); playMenuClickSound(); });
  const ov = document.getElementById('lives-shop-overlay');
  if (ov) ov.addEventListener('click', (e) => { if (e.target === ov) closeLivesShop(); });
  // Super-ofertón: cerrar al clicar fuera (trata el fondo como "pasar")
  const superOv = document.getElementById('super-offer-overlay');
  if (superOv) superOv.addEventListener('click', (e) => { if (e.target === superOv) { _setHourlyLimit('life_super_20'); closeSuperOfferOverlay(); openLivesShop(true); } });
}

function _highlightTab(tab) {
  document.querySelectorAll('.shop-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
}

// ============================================================
// Actualizar UI de balances en la tienda
// ============================================================
function updateShopUI() {
  const setIf = (id, val) => {
    const el = document.getElementById(id);
    if (el && el.textContent !== val) el.textContent = val;
  };
  setIf("shop-bal-dust",      `💨 ${getDust().toLocaleString()}`);
  setIf("shop-bal-coins",     `🪙 ${getCoins().toLocaleString()}`);
  setIf("shop-bal-tickets",   `🎟️ ${getTickets().toLocaleString()}`);
  setIf("shop-bal-skincoins", `🎨 ${getSkinCoins().toLocaleString()}`);
  updatePromoBanner();
}

// ============================================================
// Inicialización
// ============================================================
function initShopPanel() {
  // Cargar catálogo antes de habilitar la tienda
  // Nota: openShop() usa SHOP_CATALOG y renderiza pestañas.
  loadShopCatalog().then(() => {
    // Reset por versión SOLO UNA VEZ (flag persistente)
    try {
      (SHOP_CATALOG || []).forEach(it => _applyResetForItemIfNeeded(it));
    } catch (e) {}
    // Botón de abrir tienda
    const shopBtn = document.getElementById('shop-btn');
    if (shopBtn) {
      shopBtn.addEventListener('click', () => {
        if (!canInteract(shopBtn)) return;
        if (gameRunning && !gamePaused) togglePause();
        closeAllModals();
        openShop();
      });
    }

    // Botón cerrar
    const closeBtn = document.getElementById('shop-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeShop);
    initLivesShopClose();

    // Cerrar al clicar fuera
    const ov = document.getElementById('shop-overlay');
    if (ov) {
      ov.addEventListener('click', (e) => {
        if (e.target === ov) closeShop();
      });
    }

    // Pestañas
    document.querySelectorAll('.shop-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        _currentTab = tab.dataset.tab;
        _highlightTab(_currentTab);
        _renderTab(_currentTab);
        playMenuClickSound();
      });
    });
  });
}
