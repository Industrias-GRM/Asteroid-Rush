// ============================================================
// AUTH — DESACTIVADO TEMPORALMENTE ("Próximamente")
// El sistema de cuentas está en pausa. Los overlays se conservan
// en el HTML pero quedan bloqueados y sin ninguna funcionalidad
// online. Para reactivar: restaurar desde js/_backup-cuentas/
// ============================================================

const AUTH_KEYS = {
  token: 'dodgeAuthToken',
  refreshToken: 'dodgeAuthRefreshToken',
  localId: 'dodgeAuthLocalId',
  email: 'dodgeAuthEmail',
  expiry: 'dodgeAuthExpiry',
  emailVerified: 'dodgeAuthEmailVerified',
  lastHeartbeat: 'dodgeLastHbTime'
};

function getAuthToken() { return null; }
function getAuthRefreshToken() { return null; }
function getAuthLocalId() { return null; }
function getAuthEmail() { return null; }
function isLoggedIn() { return false; }

// Limpia restos de sesiones antiguas (una sola llamada al arrancar)
function purgeLegacyAuthData() {
  for (const key of Object.values(AUTH_KEYS)) {
    try { localStorage.removeItem(key); } catch (e) {}
  }
}

function updateAccountUI() {
  const statusEl = document.getElementById('account-status');
  const emailEl = document.getElementById('account-email');
  const actionBtn = document.getElementById('btn-auth-action');

  if (!statusEl) return;

  statusEl.classList.remove('logged-in');
  statusEl.classList.add('guest');

  if (emailEl) {
    const nick = (typeof getPlayerNickname === 'function' ? getPlayerNickname() : '') || (typeof getPilotNumber === 'function' ? getPilotNumber() : '');
    if (nick) {
      emailEl.textContent = nick;
      emailEl.title = nick;
    } else {
      emailEl.textContent = i18n ? i18n.t('no_pilot_yet') || 'Sin piloto asignado' : 'Sin piloto asignado';
    }
  }

  if (actionBtn) {
    actionBtn.classList.remove('hidden');
    actionBtn.disabled = true;
    actionBtn.textContent = i18n ? i18n.t('coming_soon') || 'Próximamente' : 'Próximamente';
  }

  const btnVerifyEmail = document.getElementById('btn-verify-email');
  if (btnVerifyEmail) btnVerifyEmail.classList.add('hidden');

  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) btnLogout.classList.add('hidden');
}

// Abre el overlay de cuentas en modo bloqueado ("Próximamente")
function showAuthOverlay() {
  const overlay = document.getElementById('auth-overlay');
  if (!overlay) return;

  overlay.classList.remove('hidden');

  const title = document.getElementById('auth-title');
  if (title) title.textContent = i18n ? i18n.t('coming_soon') || 'Próximamente' : 'Próximamente';

  const banner = document.getElementById('auth-coming-soon');
  if (banner) banner.classList.remove('hidden');

  ['.auth-tabs', '#auth-form-login', '#auth-form-register', '#auth-verify-section', '.auth-guest-hint'].forEach(sel => {
    const el = overlay.querySelector(sel);
    if (el) el.classList.add('hidden');
  });

  overlay.querySelectorAll('input, button').forEach(el => { el.disabled = true; });
}

function hideAuthOverlay() {
  const overlay = document.getElementById('auth-overlay');
  if (!overlay) return;
  overlay.classList.add('hidden');

  const banner = document.getElementById('auth-coming-soon');
  if (banner) banner.classList.add('hidden');
}

// Stub para compatibilidad con skins/economía (ya no sincroniza nada)
function onGameAction() {}

function initAuthUI() {
  purgeLegacyAuthData();
  updateAccountUI();
}
