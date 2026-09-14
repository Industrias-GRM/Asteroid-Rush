// ============================================================
// ECONOMÍA — Monedas y conversiones
// ============================================================
// Capa base del sistema económico.
// 4 monedas: polvo (💨), monedas (🪙), tickets (🎟️), skin-coins (🎨).
// El polvo se gana jugando (1 por cada 100 pts; 0 en BETA).
// Las demás se obtienen convirtiendo polvo por lotes según DUST_TIERS.
// Sigue el mismo patrón get/set/save que skins.js.
// El UI del intercambio se renderiza dentro de la pestaña 💱 de la Tienda.
// ============================================================

let _dust = 0, _coins = 0, _tickets = 0, _skinCoins = 0;

// --- Carga inicial desde localStorage ---
try {
  _dust     = parseInt(localStorage.getItem(ECONOMY_KEYS.dust),      10) || 0;
  _coins    = parseInt(localStorage.getItem(ECONOMY_KEYS.coins),     10) || 0;
  _tickets  = parseInt(localStorage.getItem(ECONOMY_KEYS.tickets),   10) || 0;
  _skinCoins= parseInt(localStorage.getItem(ECONOMY_KEYS.skinCoins), 10) || 0;
} catch (e) {}

// Pone las 4 monedas a 0 en memoria.
function resetEconomy() {
  _dust = 0; _coins = 0; _tickets = 0; _skinCoins = 0;
}

// ============================================================
// Getters / persistencia
// ============================================================
function getDust()      { return _dust; }
function getCoins()     { return _coins; }
function getTickets()   { return _tickets; }
function getSkinCoins() { return _skinCoins; }

function saveEconomy() {
  if (isDeletingData) return;
  try {
    localStorage.setItem(ECONOMY_KEYS.dust, _dust);
    localStorage.setItem(ECONOMY_KEYS.coins, _coins);
    localStorage.setItem(ECONOMY_KEYS.tickets, _tickets);
    localStorage.setItem(ECONOMY_KEYS.skinCoins, _skinCoins);
  } catch (e) {}
  if (typeof onGameAction === 'function') onGameAction();
}

// Suma polvo (se llama al acabar partida, solo fuera de BETA).
function addDust(n) {
  if (!n || n <= 0) return;
  _dust += n;
  saveEconomy();
}

// ============================================================
// Motor de conversión por lotes
// ============================================================

// Cuántas unidades de `target` se obtienen al convertir `tier` de polvo.
function _batchOutput(target, tier) {
  if (target === "coins")     return tier * DUST_TO_COINS;
  if (target === "tickets")   return Math.floor(tier / DUST_TO_TICKET);
  if (target === "skinCoins") return tier * DUST_TO_SKINCOIN;
  return 0;
}

// Convierte `tier` de polvo a la moneda `target`.
// Devuelve { ok, reason, gained } sin mutar estado si falla.
function convertBatch(target, tier) {
  if (!DUST_TIERS.includes(tier)) return { ok: false, reason: "invalid_tier" };
  if (tier > _dust)               return { ok: false, reason: "not_enough_dust" };
  const gained = _batchOutput(target, tier);
  if (gained <= 0)                return { ok: false, reason: "zero_output" };
  _dust -= tier;
  if (target === "coins")         _coins     += gained;
  else if (target === "tickets")  _tickets   += gained;
  else                            _skinCoins += gained;
  saveEconomy();
  return { ok: true, gained };
}

// Coste en polvo de comprar directamente N unidades de `target`
// (2× más caro que la equivalencia justa).
function directCostInDust(target, amount) {
  let baseDust;
  if (target === "coins")         baseDust = Math.ceil(amount / DUST_TO_COINS);
  else if (target === "tickets")  baseDust = amount * DUST_TO_TICKET;
  else                            baseDust = Math.ceil(amount / DUST_TO_SKINCOIN);
  return baseDust * DUST_DIRECT_PENALTY;
}

// Gasta moneda directamente. Devuelve true si había saldo.
function spendCurrency(target, amount) {
  if (target === "coins")         { if (_coins < amount) return false;     _coins -= amount; }
  else if (target === "tickets")  { if (_tickets < amount) return false;   _tickets -= amount; }
  else if (target === "skinCoins"){ if (_skinCoins < amount) return false; _skinCoins -= amount; }
  else if (target === "dust")     { if (_dust < amount) return false;      _dust -= amount; }
  else return false;
  saveEconomy();
  return true;
}

// ============================================================
// UI — Panel de intercambio (se renderiza dentro de shop-tab 💱)
// ============================================================
let _ecoTarget = "coins";
let _ecoTier   = DUST_TIERS[0];

const _ECO_TARGETS = [
  { id: "coins",     icon: "🪙",  labelKey: "currency_coins" },
  { id: "tickets",   icon: "🎟️", labelKey: "currency_tickets" },
  { id: "skinCoins", icon: "🎨", labelKey: "currency_skincoins" }
];

function _ecoLabel(target) {
  const t = _ECO_TARGETS.find(x => x.id === target);
  if (!t) return target;
  const label = i18n.t(t.labelKey, target);
  return `${t.icon} ${label}`;
}

// Renderiza todo el contenido de la pestaña Intercambio dentro de un contenedor.
function renderExchangePanel(container) {
  if (!container) return;

  const makeTargets = () => _ECO_TARGETS.map(t =>
    `<button class="exchange-btn${t.id === _ecoTarget ? ' active' : ''}" data-eco-target="${t.id}">${t.icon} ${i18n.t(t.labelKey, t.id)}</button>`
  ).join('');

  const makeTiers = () => DUST_TIERS.map(t =>
    `<button class="exchange-btn${t === _ecoTier ? ' active' : ''}" data-eco-tier="${t}">${t.toLocaleString()}</button>`
  ).join('');

  const targetIcon = _ECO_TARGETS.find(t => t.id === _ecoTarget)?.icon || '🪙';
  const batchOut = _batchOutput(_ecoTarget, _ecoTier);

  let html = `
    <div class="exchange-section">
      <div class="exchange-target-icon">${i18n.t('exchange_target_title', 'Moneda de destino')}</div>
      <div class="exchange-option-row">${makeTargets()}</div>
    </div>
    <div class="exchange-section">
      <div class="exchange-subtitle">${i18n.t('exchange_lot_title', '¿Cuánto polvo quieres cambiar?')}</div>
      <div class="exchange-tier-grid">${makeTiers()}</div>
    </div>
    <div class="exchange-section">
      <div class="exchange-summary">
        <span class="exchange-summary-dust">${_ecoTier.toLocaleString()} 💨</span>
        <span class="exchange-summary-arrow">➡️</span>
        <span class="exchange-summary-output">${batchOut.toLocaleString()} ${targetIcon}</span>
      </div>
    </div>
    <button id="eco-confirm-btn" class="exchange-confirm-btn"${batchOut <= 0 || _ecoTier > _dust ? ' disabled' : ''}>${i18n.t('exchange_confirm', 'Cambiar')}</button>
    <div id="eco-result" class="shop-result"></div>
  `;
  container.innerHTML = html;

  container.querySelectorAll(".exchange-btn[data-eco-target]").forEach(btn => {
    btn.addEventListener("click", () => {
      _ecoTarget = btn.dataset.ecoTarget;
      renderExchangePanel(container);
      playMenuClickSound();
    });
  });
  container.querySelectorAll(".exchange-btn[data-eco-tier]").forEach(btn => {
    btn.addEventListener("click", () => {
      _ecoTier = parseInt(btn.dataset.ecoTier, 10);
      renderExchangePanel(container);
      playMenuClickSound();
    });
  });

  const confirmBtn = document.getElementById("eco-confirm-btn");
  if (confirmBtn) {
    confirmBtn.addEventListener("click", () => {
      const res = convertBatch(_ecoTarget, _ecoTier);
      const resEl = document.getElementById("eco-result");
      if (res.ok) {
        if (resEl) {
          resEl.textContent = i18n.t('exchange_success_format', '✓ +{amount} {label}').replace('{amount}', res.gained.toLocaleString()).replace('{label}', _ecoLabel(_ecoTarget));
          resEl.style.color = "#4caf50";
          resEl.classList.add("show");
          setTimeout(() => resEl.classList.remove("show"), 2500);
        }
        playLevelUp();
        if (typeof updateShopUI === "function") updateShopUI();
        if (typeof updateDustUI === "function") updateDustUI();
        renderExchangePanel(container);
      } else if (res.reason === "not_enough_dust") {
        if (resEl) { resEl.textContent = i18n.t('exchange_error_no_dust', 'Polvo insuficiente'); resEl.style.color = "#ff5252"; resEl.classList.add("show"); setTimeout(() => resEl.classList.remove("show"), 2500); }
      } else {
        if (resEl) { resEl.textContent = i18n.t('exchange_error_generic', 'No se pudo convertir'); resEl.style.color = "#ff5252"; resEl.classList.add("show"); setTimeout(() => resEl.classList.remove("show"), 2500); }
      }
    });
  }
}
