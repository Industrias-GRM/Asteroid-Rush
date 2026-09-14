// ============================================================
// IMPORTAR / EXPORTAR ESTADO (CSV OFUSCADO)
// ============================================================

// Nota: esto no pretende ser "secreto" ante un atacante (el cÃ³digo del cliente es visible),
// pero evita que el archivo sea trivialmente legible/modificable con un XOR fijo.
const _EXPORT_SALT = "ASTEROID_RUSH_EXPORT_v2";
const _LEGACY_XOR_KEY = "ASTEROID_RUSH_GRM_2026";

function _u8ToBase64(u8) {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
}
function _base64ToU8(b64) {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}
async function _getExportKey() {
  const enc = new TextEncoder();
  const material = await crypto.subtle.importKey(
    "raw",
    enc.encode(_EXPORT_SALT),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode(_EXPORT_SALT), iterations: 250000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}
async function _getLegacyDeviceKey() {
  const enc = new TextEncoder();
  try {
    const rid = (typeof Platform !== 'undefined' && Platform.runtimeId) ? Platform.runtimeId : '';
    if (!rid) return null;
    const material = await crypto.subtle.importKey(
      "raw",
      enc.encode(`${rid}:${_EXPORT_SALT}`),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: enc.encode(_EXPORT_SALT), iterations: 250000, hash: "SHA-256" },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  } catch (e) { return null; }
}
async function encryptExportToBase64(plainText) {
  const enc = new TextEncoder();
  const key = await _getExportKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plainText));
  const packed = new Uint8Array(iv.length + cipher.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(cipher), iv.length);
  return _u8ToBase64(packed);
}
async function decryptExportFromBase64(base64Text) {
  const packed = _base64ToU8(base64Text);
  const iv = packed.slice(0, 12);
  const cipher = packed.slice(12);
  const key = await _getExportKey();
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
    return new TextDecoder().decode(plain);
  } catch (e) {
    const legacyKey = await _getLegacyDeviceKey();
    if (legacyKey) {
      try {
        const plain2 = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, legacyKey, cipher);
        return new TextDecoder().decode(plain2);
      } catch (e2) {}
    }
    throw e;
  }
}

function _xorDecryptLegacyFromBase64(base64Text, key = _LEGACY_XOR_KEY) {
  try { const binary = atob(base64Text); const chars = []; for (let i = 0; i < binary.length; i++) chars.push(String.fromCharCode(binary.charCodeAt(i) ^ key.charCodeAt(i % key.length))); return chars.join(""); } catch(e) { throw new Error('invalid_base64'); }
}

function getExportPayload() {
  // Nota: el apodo de piloto (dodgeNickNumber / dodgePlayerNickname / dodgeUsername) NO se incluye nunca en el export por privacidad/portabilidad.
  const masterVolStored = parseInt(localStorage.getItem(SETTINGS_KEYS.masterVolume), 10);
  let economy = null;
  try { economy = { dust: _dust, coins: _coins, tickets: _tickets, skinCoins: _skinCoins }; } catch(e) { economy = { dust: 0, coins: 0, tickets: 0, skinCoins: 0 }; }
  let skinsPayload = null;
  try {
    skinsPayload = {
      unlocked: loadUnlockedSkins(),
      active: loadActiveSkins(),
      recent: loadRecentSkins(),
      looks: loadLooks(),
      currentLookId: localStorage.getItem(CURRENT_LOOK_KEY) || null,
      legacyUnlocked: unlockedSkins,
      legacyCurrent: currentSkin
    };
  } catch(e) { skinsPayload = null; }
  let achievementsPayload = null;
  try { achievementsPayload = Array.isArray(unlockedAchievements) ? unlockedAchievements.slice() : []; } catch(e) { achievementsPayload = []; }
  let livesPayload = null;
  try {
    livesPayload = {
      normal: livesNormal, fast: livesFast, swingcopter: livesSwingcopter,
      accumNormal: accumulatedLifeTimeNormal, accumFast: accumulatedLifeTimeFast, accumSwing: accumulatedLifeTimeSwingcopter,
      lastUpdate: Date.now()
    };
  } catch(e) { livesPayload = null; }
  let shopPayload = null;
  try { shopPayload = JSON.parse(localStorage.getItem(SHOP_PURCHASES_KEY) || '{}'); } catch(e) { shopPayload = {}; }
  return {
    version: "1.2",
    bestScoreNormal, bestScoreFast, bestScoreSwingcopter, unlockedSkins,
    economy, skins: skinsPayload, achievements: achievementsPayload, lives: livesPayload, shopPurchases: shopPayload,
    saveSlots: getSaveSlots(),
    settings: {
      rememberMode:      localStorage.getItem(SETTINGS_KEYS.rememberMode) === "true",
      lastMode:          localStorage.getItem(SETTINGS_KEYS.lastMode) || "",
      showFPS,
      smoothAnimations:  localStorage.getItem(SETTINGS_KEYS.smoothAnimations) !== "false",
      lightEffects:      localStorage.getItem(SETTINGS_KEYS.lightEffects)     !== "false",
      masterVolume:      isNaN(masterVolStored) ? Math.round(AUDIO_CONFIG.masterVolume * 100) : masterVolStored,
      musicOn, sfxOn, safeModeOn, touchControls: touchControlsOn, worldRecordEnabled
    }
  };
}

// ============================================================
// OVERLAY DE ESTADO
// ============================================================

function showImportStatus(success, message) {
  if (!importStatusOverlay) return;
  importStatusTitle.textContent = success ? `✅ ${i18n.t("import_success_title","Operación Exitosa")}` : `❌ ${i18n.t("import_error_title","Error en la Operación")}`;
  importStatusMessage.textContent = message;
  if (success) importStatusCard.classList.remove("error"); else importStatusCard.classList.add("error");
  closeSettings();
  importStatusOverlay.classList.remove("hidden");
}

function hideImportStatus() { if (importStatusOverlay) importStatusOverlay.classList.add("hidden"); }

if (importStatusCloseBtn) importStatusCloseBtn.addEventListener('click', hideImportStatus);

// ============================================================
// EXPORTAR
// ============================================================

exportDataBtn.addEventListener('click', () => {
  (async () => {
    try {
      const encrypted = await encryptExportToBase64(JSON.stringify(getExportPayload()));
      const csv = `tipo,datos\njuego_ofuscado_v2,${encrypted}`;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'asteroid_rush_datos.csv';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) { alert("Error al exportar datos."); }
  })();
});

// ============================================================
// IMPORTAR
// ============================================================

importDataBtn.addEventListener('click', () => {
  const input   = document.createElement('input');
  input.type    = 'file'; input.accept = '.csv,text/csv';
  input.addEventListener('change', () => {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      (async () => {
      try {
        const lines = e.target.result.split(/\r?\n/).filter(Boolean);
        if (lines.length <= 1) { showImportStatus(false, i18n.t("error_import_empty")); return; }
        const parts = lines[1].split(',');
        if (parts.length < 2) { showImportStatus(false, i18n.t("error_import_format")); return; }
        const type = parts[0];
        const data = parts.slice(1).join(',');
        let jsonText = null;
        if (type === "juego_ofuscado_v2") jsonText = await decryptExportFromBase64(data);
        else if (type === "juego_encriptado") jsonText = _xorDecryptLegacyFromBase64(data); // compat: exports antiguos
        else { showImportStatus(false, i18n.t("error_import_format")); return; }
        const payload = JSON.parse(jsonText);
        if (!payload || (payload.version !== "1" && payload.version !== "1.1" && payload.version !== "1.2")) { showImportStatus(false, i18n.t("error_import_incompatible")); return; }
        // Sanitizar: nunca restaurar nick aunque un archivo antiguo lo contenga
        try { delete payload.pilotNick; delete payload.nick; delete payload.dodgeNickNumber; delete payload.dodgePlayerNickname; delete payload.dodgeUsername; if (payload.settings) { delete payload.settings.pilotNick; } } catch(e) {}

        if (typeof payload.bestScoreNormal     === "number") bestScoreNormal     = payload.bestScoreNormal;
        if (typeof payload.bestScoreFast       === "number") bestScoreFast       = payload.bestScoreFast;
        if (typeof payload.bestScoreSwingcopter=== "number") bestScoreSwingcopter= payload.bestScoreSwingcopter;
        if (typeof payload.unlockedSkins       === "number") unlockedSkins       = Math.min(TOTAL_SKINS, Math.max(1, payload.unlockedSkins));

        // --- Economía (v1.2) ---
        if (payload.economy && typeof payload.economy === "object") {
          const ec = payload.economy;
          if (typeof ec.dust === "number" && isFinite(ec.dust) && ec.dust >= 0) _dust = Math.min(999999999, Math.floor(ec.dust));
          if (typeof ec.coins === "number" && isFinite(ec.coins) && ec.coins >= 0) _coins = Math.min(999999999, Math.floor(ec.coins));
          if (typeof ec.tickets === "number" && isFinite(ec.tickets) && ec.tickets >= 0) _tickets = Math.min(999999999, Math.floor(ec.tickets));
          if (typeof ec.skinCoins === "number" && isFinite(ec.skinCoins) && ec.skinCoins >= 0) _skinCoins = Math.min(999999999, Math.floor(ec.skinCoins));
          try { saveEconomy(); } catch(e) {}
        }
        // --- Skins avanzado (v1.2) ---
        if (payload.skins && typeof payload.skins === "object") {
          try {
            if (payload.skins.unlocked && typeof payload.skins.unlocked === "object") saveUnlockedSkins(payload.skins.unlocked);
            if (payload.skins.active && typeof payload.skins.active === "object") saveActiveSkins(payload.skins.active);
            if (Array.isArray(payload.skins.recent)) saveRecentSkins(payload.skins.recent.slice(0, 5));
            if (Array.isArray(payload.skins.looks)) saveLooks(payload.skins.looks);
            if (typeof payload.skins.currentLookId === "string" && payload.skins.currentLookId) { try { localStorage.setItem(CURRENT_LOOK_KEY, payload.skins.currentLookId); currentLookId = payload.skins.currentLookId; } catch(e){} }
            else if (payload.skins.currentLookId === null) { try { localStorage.removeItem(CURRENT_LOOK_KEY); currentLookId = null; } catch(e){} }
            if (typeof payload.skins.legacyUnlocked === "number") { unlockedSkins = Math.min(TOTAL_SKINS, Math.max(1, payload.skins.legacyUnlocked)); }
            if (typeof payload.skins.legacyCurrent === "number") { currentSkin = Math.min(TOTAL_SKINS, Math.max(1, payload.skins.legacyCurrent)); }
          } catch(e) {}
        }
        // --- Logros (v1.2) ---
        if (Array.isArray(payload.achievements)) {
          try {
            const clean = payload.achievements.filter(x => typeof x === "string").slice(0, 50);
            unlockedAchievements = clean;
            localStorage.setItem("dodgeAchievements", JSON.stringify(clean));
          } catch(e) {}
        }
        // --- Vidas (v1.2) ---
        if (payload.lives && typeof payload.lives === "object") {
          try {
            if (typeof payload.lives.normal === "number" && isFinite(payload.lives.normal)) livesNormal = Math.min(MAX_LIVES, Math.max(0, Math.floor(payload.lives.normal)));
            if (typeof payload.lives.fast === "number" && isFinite(payload.lives.fast)) livesFast = Math.min(MAX_LIVES, Math.max(0, Math.floor(payload.lives.fast)));
            if (typeof payload.lives.swingcopter === "number" && isFinite(payload.lives.swingcopter)) livesSwingcopter = Math.min(MAX_LIVES, Math.max(0, Math.floor(payload.lives.swingcopter)));
            if (typeof payload.lives.accumNormal === "number" && isFinite(payload.lives.accumNormal)) accumulatedLifeTimeNormal = Math.max(0, Math.floor(payload.lives.accumNormal));
            if (typeof payload.lives.accumFast === "number" && isFinite(payload.lives.accumFast)) accumulatedLifeTimeFast = Math.max(0, Math.floor(payload.lives.accumFast));
            if (typeof payload.lives.accumSwing === "number" && isFinite(payload.lives.accumSwing)) accumulatedLifeTimeSwingcopter = Math.max(0, Math.floor(payload.lives.accumSwing));
            saveLives();
          } catch(e) {}
        }
        // --- Compras de tienda (v1.2) ---
        if (payload.shopPurchases && typeof payload.shopPurchases === "object" && !Array.isArray(payload.shopPurchases)) {
          try {
            const clean = {};
            for (const k in payload.shopPurchases) { const v = payload.shopPurchases[k]; if (typeof v === "number" && isFinite(v) && v >= 0) clean[k] = Math.min(9999, Math.floor(v)); }
            _shopPurchases = clean;
            _savePurchases();
          } catch(e) {}
        }

        if (payload.saveSlots && Array.isArray(payload.saveSlots)) {
          for (let i = 0; i < MAX_SLOTS; i++) try { localStorage.removeItem(`dodge_save_slot_${i}`); } catch(e) {}
          payload.saveSlots.forEach((slot, i) => {
            if (i >= MAX_SLOTS || !slot) return;
            try {
              if (slot.score !== undefined && (!isFinite(slot.score) || typeof slot.score !== 'number')) return;
              const s = JSON.stringify(slot);
              if (s.length > 500000) return;
              localStorage.setItem(`dodge_save_slot_${i}`, s);
            } catch(e) {}
          });
        }

        if (payload.settings && typeof payload.settings === "object") {
          const s = payload.settings;
          const applyToggle = (cond, key, toggle, val) => { if (cond) { saveSetting(key, val); if (toggle) toggle.checked = val; } };
          applyToggle(typeof s.rememberMode    ==="boolean", SETTINGS_KEYS.rememberMode,    rememberModeToggle,     s.rememberMode);
          if (typeof s.lastMode === "string") saveSetting(SETTINGS_KEYS.lastMode, s.lastMode);
          applyToggle(typeof s.showFPS         ==="boolean", SETTINGS_KEYS.showFPS,         showFpsToggle,          showFPS = s.showFPS);
          applyToggle(typeof s.smoothAnimations==="boolean", SETTINGS_KEYS.smoothAnimations, smoothAnimationsToggle, s.smoothAnimations);
          applyToggle(typeof s.lightEffects    ==="boolean", SETTINGS_KEYS.lightEffects,    lightEffectsToggle,     s.lightEffects);
          if (typeof s.masterVolume === "number") { const c = Math.max(0,Math.min(100,s.masterVolume)); AUDIO_CONFIG.masterVolume = c/100; saveSetting(SETTINGS_KEYS.masterVolume, c); }
          applyToggle(typeof s.musicOn  ==="boolean", SETTINGS_KEYS.musicOn,  musicToggle,          musicOn = s.musicOn);
          applyToggle(typeof s.sfxOn    ==="boolean", SETTINGS_KEYS.sfxOn,    sfxToggle,            sfxOn   = s.sfxOn);
          if (typeof s.sfxOn === "boolean") AUDIO_CONFIG.sfxVolume = sfxOn ? 0.4 : 0;
          applyToggle(typeof s.safeModeOn    ==="boolean", SETTINGS_KEYS.safeMode,        safeModeToggle,       safeModeOn     = s.safeModeOn);
          applyToggle(typeof s.touchControls ==="boolean", SETTINGS_KEYS.touchControls,   touchControlsToggle,  touchControlsOn= s.touchControls);
          if (typeof s.worldRecordEnabled === "boolean") {
            worldRecordEnabled = s.worldRecordEnabled;
            localStorage.setItem("dodgeWorldRecordEnabled", worldRecordEnabled);
            if (worldRecordToggle) worldRecordToggle.checked = worldRecordEnabled;
            if (worldRecordNote) { if (!worldRecordEnabled) worldRecordNote.classList.add("show"); else worldRecordNote.classList.remove("show"); }
          }
        }

        saveBestScore(); try { saveUnlockedSkins(); } catch(e) {}
        updateGraphicsClasses(); updateSkinClass(); generateSkinSelector();
        updateBestScoreUI(); updateLivesUI(); updateOverlayLivesInfo(); updateTouchControlsVisibility();
        try { if (typeof updateDustUI === 'function') updateDustUI(); } catch(e) {}
        try { if (typeof updateShopUI === 'function') updateShopUI(); } catch(e) {}
        try { updateShipVisuals(); } catch(e) {}
        showImportStatus(true, `${payload.saveSlots ? i18n.t("import_success_msg_slots") : i18n.t("import_success_msg")} ${i18n.t("import_success_note")}`);
      } catch (err) { showImportStatus(false, i18n.t("error_import_generic")); }
      })();
    };
    reader.readAsText(file);
  });
  input.click();
});
