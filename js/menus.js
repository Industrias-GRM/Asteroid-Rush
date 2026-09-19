// ============================================================
// LEADERBOARD (HELPERS DE RENDER)
// ============================================================

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderTop3(entries) {
  if (!entries || !entries.length) { worldRecordTop3El.innerHTML = `<div>${i18n.t("status_no_data")}</div>`; return; }
  let html = "<ol>";
  for (let i = 0; i < Math.min(3, entries.length); i++) {
    const e = entries[i];
    const raw = e.name || i18n.t("label_anonymous");
    const display = (typeof formatPilotEntry === 'function') ? formatPilotEntry(raw) : raw;
    const name = escapeHtml(display.toString().substring(0, 24));
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
    html += `<li><span class="top3-pos">${medal}</span><span class="top3-name"><b>${name}</b></span><span class="top3-score">${e.score || 0}</span></li>`;
  }
  worldRecordTop3El.innerHTML = html + "</ol>";
}

function renderTop100(entries) {
  if (!entries || !entries.length) { leaderboardListEl.innerHTML = `<div style='padding:6px;'>${i18n.t("status_no_records")}</div>`; return; }
  const currentUid = localStorage.getItem('dodgeAuthLocalId') || '';
  const myNum = (typeof getPilotNumber === 'function' ? getPilotNumber() : localStorage.getItem('dodgeNickNumber')) || '';
  const myNumLower = myNum.toLowerCase();
  let html = `<table><thead><tr><th>#</th><th>${i18n.t("table_header_name")}</th><th>${i18n.t("table_header_score")}</th></tr></thead><tbody>`;
  entries.forEach((e, i) => {
    const raw = e.name || i18n.t("label_anonymous");
    const display = (typeof formatPilotEntry === 'function') ? formatPilotEntry(raw) : raw;
    const name = escapeHtml(display.toString().substring(0, 24));
    const entryNum = (typeof pilotIdFromName === 'function' ? pilotIdFromName(e.name) : null) || String(e.name || '').trim();
    const isMine = (currentUid && e.uid === currentUid) || (!currentUid && myNum && entryNum && entryNum.toLowerCase() === myNumLower);
    let pos = i + 1;
    if (i === 0) pos = '🥇'; else if (i === 1) pos = '🥈'; else if (i === 2) pos = '🥉';
    html += `<tr${isMine ? ' class="my-entry"' : ''}><td>${pos}</td><td>${name}</td><td>${e.score || 0}</td></tr>`;
  });
  leaderboardListEl.innerHTML = html + "</tbody></table>";
}

function syncLeaderboardWithGameMode() {
  let mode = "normal";
  if (fastModeActive) mode = "fast";
  else if (swingcopterModeActive) mode = "swingcopter";
  leaderboardTabs.forEach(t => t.classList.toggle("active", t.dataset.mode === mode));
  loadLeaderboard(mode);
}

async function loadLeaderboard(mode = currentLeaderboardMode, forceRefresh = false) {
  currentLeaderboardMode = mode;
  worldRecordStatusEl.textContent = i18n.t("status_loading_ranking");
  worldRecordTop3El.innerHTML = "";
  try {
    const res = await sendMessageToSW("getLeaderboard", { mode, limit: LEADERBOARD_LIMIT, forceRefresh });
    if (!res.ok) { worldRecordStatusEl.textContent = i18n.t("status_error_ranking"); worldRecordTop3El.innerHTML = `<div>${i18n.t("status_error_generic")}</div>`; return; }
    const entries = res.data || [];
    lowestLeaderboardScore = entries.length >= LEADERBOARD_LIMIT ? entries[entries.length - 1].score : 0;
    if (!entries.length) {
      worldRecordStatusEl.textContent = i18n.t("status_no_world_records");
      worldRecordTop3El.innerHTML = `<div>${i18n.t("status_no_data")}</div>`;
      leaderboardListEl.innerHTML = `<div style='padding:6px;'>${i18n.t("status_no_records")}</div>`;
      return;
    }
    let modeLabel = mode === "fast" ? i18n.t("mode_fast") : mode === "swingcopter" ? i18n.t("mode_zigzag") : i18n.t("mode_normal");
    worldRecordStatusEl.textContent = `${i18n.t("ranking_title_prefix")} (${modeLabel})`;
    renderTop3(entries);
    if (!leaderboardOverlay.classList.contains("hidden")) renderTop100(entries);
    checkRankingSkins();
  } catch (e) {
    worldRecordStatusEl.textContent = i18n.t("status_error_ranking");
    worldRecordTop3El.innerHTML = `<div>${i18n.t("status_error_generic")}</div>`;
  }
}

async function trySubmitScoreToLeaderboard(mode, score, playerName, duration) {
  const intScore = Math.floor(Number(score));
  // Al ranking solo se envían los números del nick. Extraer solo dígitos finales.
  let rawName = (playerName || '').toString().trim();
  let numericId = null;
  if (typeof pilotIdFromName === 'function') numericId = pilotIdFromName(rawName);
  if (!numericId) {
    const digits = rawName.replace(/\D/g, '');
    if (digits) numericId = digits.slice(-6);
  }
  if (!numericId) {
    // fallback a dodgeNickNumber si existe
    try { numericId = (typeof getPilotNumber === 'function' ? getPilotNumber() : localStorage.getItem('dodgeNickNumber')) || null; } catch(e) {}
  }
  if (!numericId) numericId = rawName.substring(0, 20) || i18n.t("label_anonymous");
  const safeName = numericId.toString().substring(0, 20);

  if (betaModeActive) return 'client_reject';

  if (!worldRecordEnabled) {
    worldRecordStatusEl.textContent = i18n.t("submit_disabled");
    return 'client_reject';
  }

  try {
    const swRes = await sendMessageToSW("getLeaderboard", { mode, forceRefresh: false });
    if (swRes.ok && swRes.data) {
      const getEntryId = (n) => {
        if (typeof pilotIdFromName === 'function') { const pid = pilotIdFromName(n); if (pid) return pid; }
        return String(n || '').trim();
      };
      const existing = swRes.data.find(e => getEntryId(e.name) === safeName);
      if (existing && existing.score >= intScore) {
        worldRecordStatusEl.textContent = i18n.t("error_submit_fail_record");
        return 'client_reject';
      }
      if (!existing && swRes.data.length >= 100) {
        const lowest = swRes.data[99].score;
        if (intScore <= lowest) {
          worldRecordStatusEl.textContent = i18n.t("error_submit_fail_record");
          return 'client_reject';
        }
      }
    }
  } catch (e) {}

  try {
    const res = await sendMessageToSW("submitScore", { mode, score: intScore, name: safeName, duration });
    if (!res.ok) { worldRecordStatusEl.textContent = res.error || i18n.t("error_submit_fail_record"); window.__submitError = res.error || ''; return false; }
  } catch (e) {
    worldRecordStatusEl.textContent = i18n.t("error_submit_fail_record");
    window.__submitError = '';
    return false;
  }
  sendMessageToSW("resetLeaderboardCooldown", { mode });
  worldRecordStatusEl.textContent = i18n.t("submit_success");
  updatePersonalBest(mode, intScore);
  checkRankingSkins();
  return true;
}

function getPersonalBest(mode) {
  if (mode === 'fast') return bestScoreFast;
  if (mode === 'swingcopter') return bestScoreSwingcopter;
  return bestScoreNormal;
}

function updatePersonalBest(mode, score) {
  if (mode === 'fast') { bestScoreFast = score; localStorage.setItem('dodgeBestScoreFast', score); }
  else if (mode === 'swingcopter') { bestScoreSwingcopter = score; localStorage.setItem('dodgeBestScoreSwingcopter', score); }
  else { bestScoreNormal = score; localStorage.setItem('dodgeBestScoreNormal', score); }
}

function checkRankingSkins() {
  const username = (typeof getPilotNumber === 'function' ? getPilotNumber() : null) || localStorage.getItem('dodgeNickNumber') || localStorage.getItem('dodgeUsername');
  if (!username) return;
  const PREMIUM_TIERS = [
    { parts: ['base_1_ORO', 'cabina_1_ORO', 'alas_1_ORO', 'propulsor_1_ORO'], key: 'oro', msg: 'username_rank_reward' },
    { parts: ['base_1_PLATA', 'cabina_1_PLATA', 'alas_1_PLATA', 'propulsor_1_PLATA'], key: 'plata', msg: 'username_rank_reward2' },
    { parts: ['base_1_BRONCE', 'cabina_1_BRONCE', 'alas_1_BRONCE', 'propulsor_1_BRONCE'], key: 'bronce', msg: 'username_rank_reward3' }
  ];
  const ALL_PREMIUM = ['base_1_ORO','cabina_1_ORO','alas_1_ORO','propulsor_1_ORO','base_1_PLATA','cabina_1_PLATA','alas_1_PLATA','propulsor_1_PLATA','base_1_BRONCE','cabina_1_BRONCE','alas_1_BRONCE','propulsor_1_BRONCE'];
  const DEFAULT_PARTS = { base: 'base_1_CIAN', cabina: 'cabina_1_CIAN', alas: 'alas_1_CIAN', propulsor: 'propulsor_1_CIAN' };
  (async () => {
    const earnedTiers = new Set();
    const getId = (n) => (typeof pilotIdFromName === 'function' ? pilotIdFromName(n) : null) || String(n || '').trim();
    const myId = getId(username);
    for (const mode of ['normal', 'fast', 'swingcopter']) {
      const res = await sendMessageToSW('getLeaderboard', { mode, limit: 3 });
      if (!res.ok || !res.data) continue;
      for (let i = 0; i < Math.min(res.data.length, 3); i++) {
        if (getId(res.data[i].name) === myId) earnedTiers.add(i);
      }
    }
    const earnedArr = [...earnedTiers].sort((a, b) => a - b);
    const prevEarnedStr = localStorage.getItem('dodgeRankTiers') || '[]';
    if (JSON.stringify(earnedArr) === prevEarnedStr) return;
    const bestTier = earnedArr.length > 0 ? earnedArr[0] : -1;
    localStorage.setItem('dodgeRankTiers', JSON.stringify(earnedArr));
    localStorage.setItem('dodgeRankTier', String(bestTier));
    const unlocked = loadUnlockedSkins();
    for (const key of ALL_PREMIUM) delete unlocked[key];
    for (const tierIdx of earnedArr) {
      if (tierIdx >= 0 && tierIdx < PREMIUM_TIERS.length) {
        for (const key of PREMIUM_TIERS[tierIdx].parts) unlocked[key] = true;
      }
    }
    saveUnlockedSkins(unlocked);
    const active = loadActiveSkins();
    let needsSave = false;
    for (const slot of ['base', 'cabina', 'alas', 'propulsor']) {
      if (active[slot] && ALL_PREMIUM.includes(active[slot]) && !unlocked[active[slot]]) {
        active[slot] = DEFAULT_PARTS[slot];
        needsSave = true;
      }
    }
    if (needsSave) {
      if (active.creacion) { active.creacion = null; }
      saveActiveSkins(active);
      applySkinLayers(playerEl, active);
    }
    const prevArr = JSON.parse(prevEarnedStr);
    const newTiers = earnedArr.filter(i => !prevArr.includes(i));
    if (newTiers.length > 0) {
      const bestNew = newTiers[0];
      const tier = PREMIUM_TIERS[bestNew];
      const toast = document.getElementById('achievement-toast');
      if (toast) {
        toast.innerHTML = `<div class="ach-icon">${bestNew === 0 ? '🥇' : bestNew === 1 ? '🥈' : '🥉'}</div>
          <div class="ach-info">
            <div class="ach-title">RANKING</div>
            <div class="ach-name">${i18n.t(tier.msg)}</div>
          </div>`;
        toast.classList.add('active');
        setTimeout(() => toast.classList.remove('active'), 3500);
      }
    }
  })();
}

async function checkIfScoreInTop100(mode, score) {
  if (betaModeActive) return false;
  if (!worldRecordEnabled) return false;
  if (lowestLeaderboardScore === null || typeof lowestLeaderboardScore === "undefined") return false;
  return score > lowestLeaderboardScore;
}

async function openLeaderboardOverlay(mode, forceRefresh = false) {
  leaderboardOverlay.classList.remove("hidden");
  if (leaderboardOverlay) leaderboardOverlay.scrollTop = 0;
  leaderboardListEl.innerHTML = `<div style='padding:6px;'>${i18n.t("status_loading")}</div>`;
  leaderboardListEl.scrollTop = 0;
  // Asegura que el panel se vea siempre desde la parte superior.
  // (ScrollTop del overlay ya se fuerza arriba al abrir).
  requestAnimationFrame(() => {
    try {
      if (leaderboardOverlay) leaderboardOverlay.scrollTop = 0;
      leaderboardListEl.scrollTop = 0;
    } catch (e) {}
  });
  leaderboardTabsOverlay.forEach(t => t.classList.toggle("active", t.dataset.mode === mode));
  const modeTitle = mode === 'fast' ? i18n.t("mode_fast_short") : mode === 'swingcopter' ? i18n.t("mode_zigzag_short") : i18n.t("mode_normal_short");
  leaderboardTitleEl.textContent = `${i18n.t("leaderboard_top100_title")} (${modeTitle})`;
  const res = await sendMessageToSW("getLeaderboard", { mode, limit: LEADERBOARD_LIMIT, forceRefresh });
  if (res.ok) {
    renderTop100(res.data || []);
    if (mode === currentLeaderboardMode) { renderTop3(res.data || []); worldRecordStatusEl.textContent = `${i18n.t("ranking_title_prefix")} (${modeTitle})`; }
    checkRankingSkins();
    let footer = document.getElementById("leaderboard-footer-timestamp");
    if (!footer) { footer = document.createElement("div"); footer.id = "leaderboard-footer-timestamp"; const fc = document.querySelector(".leaderboard-footer"); if (fc) fc.appendChild(footer); }
    footer.textContent = `${i18n.t("info_last_update", "")} ${new Date(res.timestamp).toLocaleString()}${res.offline ? " (Offline)" : ""}`;
    // Scroll automático a la posición del jugador si viene de la animación de ranking
    if (pendingPlayerRank > 0 && pendingPlayerRank <= 100) {
      const row = leaderboardListEl.querySelector(`tbody tr:nth-child(${pendingPlayerRank})`);
      if (row) {
        row.style.background = "rgba(0, 188, 212, 0.25)";
        row.style.transition = "background 0.4s ease";
        setTimeout(() => row.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
      }
      pendingPlayerRank = -1; // Resetear para que no se repita en futuras aperturas
    }
  } else { leaderboardListEl.innerHTML = `<div style='padding:6px;'>${i18n.t("status_error_ranking")}</div>`; }
}

// Eventos leaderboard
leaderboardTabs.forEach(t => t.addEventListener("click", () => { if (!canInteract(t)) return; leaderboardTabs.forEach(x => x.classList.remove("active")); t.classList.add("active"); playMenuClickSound(); loadLeaderboard(t.dataset.mode); }));
refreshLeaderboardBtn.addEventListener("click", () => { if (!canInteract(refreshLeaderboardBtn)) return; playMenuClickSound(); closeAllModals(); openLeaderboardOverlay(currentLeaderboardMode, false); });
if (leaderboardRefreshBtn) leaderboardRefreshBtn.addEventListener("click", () => { if (!canInteract(leaderboardRefreshBtn)) return; playMenuClickSound(); openLeaderboardOverlay(currentLeaderboardMode, true); });
leaderboardTabsOverlay.forEach(t => t.addEventListener("click", () => { if (!canInteract(t)) return; leaderboardTabsOverlay.forEach(x => x.classList.remove("active")); t.classList.add("active"); playMenuClickSound(); openLeaderboardOverlay(t.dataset.mode); }));
leaderboardCloseBtn.addEventListener("click", () => {
  leaderboardOverlay.classList.add("hidden");
  // Vuelve al inicio para que, al reabrir, no quede “a medias”.
  try {
    if (leaderboardOverlay) leaderboardOverlay.scrollTop = 0;
    if (leaderboardListEl) leaderboardListEl.scrollTop = 0;
  } catch (e) {}
});

// ============================================================
// INSTRUCCIONES / NOTICIAS
// ============================================================

instructionsBtn.addEventListener("click", () => {
  if (!canInteract(instructionsBtn)) return;
  playMenuClickSound();
  if (gameRunning && !gamePaused) togglePause();
  closeAllModals(); instructionsOverlay.classList.remove("hidden");
  const ic = document.getElementById("instructions-content"); if (ic) ic.scrollTop = 0;
});
closeInstructionsBtn.addEventListener("click", () => instructionsOverlay.classList.add("hidden"));

function _parseNewsDateToMs(dateStr) {
  // Formato local: d-m-yyyy (ej: 1-05-2026)
  // Acepta también 01-05-2026.
  try {
    if (!dateStr) return null;
    const m = String(dateStr).trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (!m) return null;
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const y = parseInt(m[3], 10);
    const dt = new Date(y, mo, d);
    const ms = dt.getTime();
    return isNaN(ms) ? null : ms;
  } catch (e) { return null; }
}

async function _extractLocaleNewsFromLocalJSON() {
  // lee `noticias.json` local y devuelve una lista normalizada: {docId,date,title,text}
  // formato de noticias.json (según el archivo actual): [{id,fecha,titulo:{lang:text},noticia:{lang:text}}, ...]
  const defaultLangOrder = ['es', 'ca', 'en', 'fr', 'de', 'it', 'ja', 'pt_PT'];
  const pickLang = () => {
    const loc = (i18n && i18n.currentLocale) ? i18n.currentLocale : 'es';
    if (defaultLangOrder.includes(loc)) return loc;
    return 'es';
  };

  const wantedLocale = pickLang();

  try {
    // En extension suele funcionar fetch('noticias.json') porque es un fichero empaquetado.
    // Si falla (por políticas), el caller lo manejará.
    const res = await fetch('noticias.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('noticias.json no es un array');

    const items = [];

    for (const x of data) {
      const docId = x?.fecha || x?.id || '';
      const date = x?.fecha || x?.id || '';
      const titulo = x?.titulo || {};
      const noticia = x?.noticia || {};

      const getByLang = (obj) => {
        if (!obj) return '';
        if (obj[wantedLocale]) return String(obj[wantedLocale]);
        // fallback: primer idioma que exista
        for (const l of defaultLangOrder) {
          if (obj[l]) return String(obj[l]);
        }
        return '';
      };

      const title = getByLang(titulo);
      const text = getByLang(noticia);

      if (!title && !text) continue;

      items.push({
        docId: docId ? String(docId) : '',
        date: date ? String(date) : '',
        title,
        text,
        _dateMs: _parseNewsDateToMs(date)
      });
    }

    items.sort((a, b) => (a._dateMs ?? -Infinity) - (b._dateMs ?? -Infinity));
    return items;
  } catch (e) {
    // si falla el local, devolvemos [] para que el renderNews muestre online o mensaje
    return [];
  }
}

function _getMergedOnlineOnTopOfLocal({ localItems, onlineItems, wantedLocale }) {

  const byDocId = new Map();
  for (const x of localItems) {
    if (!x.docId) continue;
    byDocId.set(String(x.docId), x);
  }
  for (const x of onlineItems) {
    if (!x.docId) continue;
    byDocId.set(String(x.docId), x);
  }

  const langs = ['es','en','ca','fr','de','it','ja','pt_PT'];
  const pickLang = (wanted) => (langs.includes(wanted) ? wanted : 'en');
  const fallbackLocale = pickLang(wantedLocale);

  const merged = Array.from(byDocId.values()).map(x => {
    // si es local: tiene title/text ya
    if (x && x.fields == null) return x;

    const fields = x.fields || {};

    const titleKey = `Titulo_${fallbackLocale}`;
    const textKey  = `Noticia_${fallbackLocale}`;

    const getFieldText = (key) => {
      const v = fields?.[key];
      if (v == null) return '';
      if (typeof v === 'string') return v;
      if (typeof v === 'object' && typeof v.stringValue === 'string') return v.stringValue;
      if (typeof v === 'object' && typeof v.integerValue === 'string') return v.integerValue;
      return '';
    };

    let title = getFieldText(titleKey);
    let text = getFieldText(textKey);

    if ((!title || !text)) {
      for (const l of langs) {
        const t = getFieldText(`Titulo_${l}`);
        const n = getFieldText(`Noticia_${l}`);
        if (t && n) { title = t; text = n; break; }
      }
    }

    x.title = title;
    x.text = text;
    x._dateMs = _parseNewsDateToMs(x.date);
    return x;
  });

  merged.sort((a, b) => {
    const da = (a._dateMs ?? -Infinity);
    const db = (b._dateMs ?? -Infinity);
    if (da !== db) return da - db;
    const ta = (a.title || '').toString();
    const tb = (b.title || '').toString();
    return ta.localeCompare(tb);
  });

  return merged;
}




function _renderNewsItems(newsItems) {
  const newsListEl = document.getElementById("news-list"); if (!newsListEl) return;
  let html = "";
  for (let i = 0; i < newsItems.length; i++) {
    const n = newsItems[i];
    const title = n.title || "";
    const date = n.date || "";
    const text = n.text || "";
    if (!title && !text) continue;
    html = `<div style="background:rgba(0,188,212,0.1);padding:10px;border-radius:8px;border-left:3px solid #00bcd4;margin-bottom:10px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;"><div style="font-weight:bold;color:#00bcd4;font-size:12px;">${title}</div><div style="font-size:10px;opacity:0.7;">${date}</div></div><div style="font-size:13px;">${text}</div></div>` + html;
  }
  newsListEl.innerHTML = html || "";
}

// ============================================================
// INDICADOR DE NUEVAS NOTICIAS (Nueva_Noticia.gif + badge rojo)
// ============================================================

const NEWS_SEEN_STORAGE_KEY = "dodgeLastNewsSeenId";

function _safeGetLastNewsIdFromItems(items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  // items vienen ordenadas asc por fecha (viejas primero) en ambos casos.
  const last = items[items.length - 1];
  const id = last?.docId ?? last?.date ?? last?.id ?? null;
  return id != null ? String(id) : null;
}

function getNewsIndicatorElements() {
  return {
    newsBtn: document.getElementById("news-btn"),
    newsIconImg: document.getElementById("news-btn-icon-img"),
    newsBadge: document.getElementById("news-btn-unread-badge"),
  };
}

function updateNewsIndicatorUI({ hasNew, latestId, unreadCount }) {
  const { newsIconImg, newsBadge } = getNewsIndicatorElements();
  if (!newsIconImg || !newsBadge) return;

  if (hasNew) {
    newsIconImg.src = "images/Nueva_Noticia.gif";
    newsBadge.classList.remove("hidden");
    // (Opcional) Pulso visual ya existe en CSS si activas animación desde JS
    newsBadge.style.animation = "newsBadgePulse 1s infinite";
    const displayCount = unreadCount > 9 ? "9+" : String(unreadCount);
    newsBadge.textContent = displayCount;
    newsBadge.setAttribute("aria-label", `${unreadCount} noticias nuevas`);
  } else {
    newsIconImg.src = "images/Noticias.gif";
    newsBadge.classList.add("hidden");
    newsBadge.style.animation = "";
    newsBadge.textContent = "";
  }
}

async function getMergedNewsForIndicator() {
  // OJO: esto debe usar la lista online descargada por el SW.
  // sendMessageToSW("getNewsWithCooldown") respeta el cooldown 24h en service-worker.js.
  const localItems = await _extractLocaleNewsFromLocalJSON();

  let onlineItems = null;
  try {
    const res = await sendMessageToSW("getNewsWithCooldown");
    if (res && res.ok && Array.isArray(res.data)) onlineItems = res.data;
  } catch (e) {}

  if (!onlineItems) {
    return localItems;
  }

  const locale = (i18n.currentLocale || i18n.currentLocale === '') ? i18n.currentLocale : 'en';
  const wantedLocale = ['es','en','ca','fr','de','it','ja','pt_PT'].includes(locale) ? locale : 'en';

  const merged = _getMergedOnlineOnTopOfLocal({
    localItems,
    onlineItems,
    wantedLocale
  });

  return merged;
}

async function updateNewsIndicator() {
  const { newsBtn } = getNewsIndicatorElements();
  if (!newsBtn) return;

  let mergedItems = [];
  try {
    mergedItems = await getMergedNewsForIndicator();
  } catch (e) {
    // fallback: local
    mergedItems = await _extractLocaleNewsFromLocalJSON();
  }

  const latestId = _safeGetLastNewsIdFromItems(mergedItems);
  const lastSeenId = localStorage.getItem(NEWS_SEEN_STORAGE_KEY);

  // Contar cuántas noticias hay después de la última vista
  // mergedItems están ordenadas asc (antiguas primero, nuevas al final)
  let unreadCount = 0;
  if (lastSeenId && Array.isArray(mergedItems) && mergedItems.length > 0) {
    let foundSeen = false;
    for (let i = mergedItems.length - 1; i >= 0; i--) {
      const itemId = String(mergedItems[i]?.docId ?? mergedItems[i]?.date ?? mergedItems[i]?.id ?? "");
      if (itemId === String(lastSeenId)) {
        foundSeen = true;
        break;
      }
      unreadCount++;
    }
    if (!foundSeen) {
      // La última vista ya no existe en la lista: todas son nuevas
      unreadCount = mergedItems.length;
    }
  } else if (!lastSeenId && mergedItems.length > 0) {
    // Primera vez: todas se consideran nuevas
    unreadCount = mergedItems.length;
  }

  const hasNew = unreadCount > 0;
  updateNewsIndicatorUI({ hasNew, latestId, unreadCount });
}

async function markNewsAsSeen() {
  // Se actualiza el estado según el latestId del merge (local+online del SW)
  const mergedItems = await getMergedNewsForIndicator();
  const latestId = _safeGetLastNewsIdFromItems(mergedItems);
  if (!latestId) return;
  localStorage.setItem(NEWS_SEEN_STORAGE_KEY, String(latestId));
  updateNewsIndicatorUI({ hasNew: false, latestId, unreadCount: 0 });
}

async function renderNews() {
  const newsListEl = document.getElementById("news-list"); if (!newsListEl) return;

  // 1) Local (nueva fuente): noticias.json
  const localItems = await _extractLocaleNewsFromLocalJSON();
  _renderNewsItems(localItems);


  // 2) Online (si existe). Traer y mezclar por docId=fecha.
  try {
    newsListEl.innerHTML = `<div style='padding:6px;'>${i18n.t("status_loading") || "Cargando..."}</div>`;
    const res = await sendMessageToSW("getNewsWithCooldown");
    if (!res || !res.ok || !Array.isArray(res.data)) {
      // Si falla, volvemos a mostrar local
      _renderNewsItems(localItems);
      return;
    }

    const onlineItems = res.data;

    const locale = (i18n.currentLocale || i18n.currentLocale === '') ? i18n.currentLocale : 'en';
    const wantedLocale = ['es','en','ca','fr','de','it','ja','pt_PT'].includes(locale) ? locale : 'en';

    const merged = _getMergedOnlineOnTopOfLocal({
      localItems,
      onlineItems,
      wantedLocale
    });

    _renderNewsItems(merged);


  } catch (e) {
    _renderNewsItems(localItems);
  }
}

newsBtn.addEventListener("click", async () => {
  if (!canInteract(newsBtn)) return;
  playMenuClickSound();
  if (gameRunning && !gamePaused) togglePause();
  closeAllModals();

  // Marcamos como leídas ANTES de renderizar.
  // Usamos lastNewsSeenId para que el indicador se quite en el botón.
  try {
    await markNewsAsSeen();
  } catch (e) {}

  void renderNews();
  newsOverlay.classList.remove("hidden");

  // Forzar que el panel se vea siempre desde la parte superior.
  requestAnimationFrame(() => {
    try {
      if (newsOverlay) newsOverlay.scrollTop = 0;
    } catch (e) {}
    try {
      const nl = document.getElementById('news-list');
      if (nl) nl.scrollTop = 0;
    } catch (e) {}
  });
});
newsCloseBtn.addEventListener("click", () => {
  newsOverlay.classList.add("hidden");
  try {
    if (newsOverlay) newsOverlay.scrollTop = 0;
  } catch (e) {}
  try {
    if (newsListEl) newsListEl.scrollTop = 0;
  } catch (e) {}
});


// Ranking animation helpers
// PERF FIX: Confetti reescrito con un solo rAF loop compartido en vez de 40 independientes.
// Cada partícula era un <div> con su propio requestAnimationFrame, lo que causaba 40+
// callbacks de animación competiendo con el game loop.
let _confettiParticles = [];
let _confettiRAF = null;

function createConfetti(container, x, y) {
  const colors = ["#ff4081", "#50e3c2", "#00bcd4", "#ffeb3b", "#ffffff", "#e040fb"];
  const count = 20; // PERF: reducido de 40 a 20 — visualmente suficiente
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div"); el.className = "confetti-particle";
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    el.style.left = x + "px"; el.style.top = y + "px"; container.appendChild(el);
    const angle = Math.random() * Math.PI * 2, velocity = 2 + Math.random() * 8;
    _confettiParticles.push({
      el, x, y, x0: x, y0: y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      opacity: 1
    });
  }
  // Iniciar el loop compartido si no está ya corriendo
  if (!_confettiRAF) _animateConfetti();
}

function _animateConfetti() {
  for (let i = _confettiParticles.length - 1; i >= 0; i--) {
    const p = _confettiParticles[i];
    p.x += p.vx; p.y += p.vy; p.opacity -= 0.02;
    p.el.style.transform = `translate(${p.x - p.x0}px,${p.y - p.y0}px) rotate(${p.x * 3}deg)`;
    p.el.style.opacity = p.opacity;
    if (p.opacity <= 0) {
      p.el.remove();
      _confettiParticles.splice(i, 1);
    }
  }
  if (_confettiParticles.length > 0) {
    _confettiRAF = requestAnimationFrame(_animateConfetti);
  } else {
    _confettiRAF = null;
  }
}

let isRankingAnimationRunning = false;
let rankingAnimSkipRequested = false;
let pendingPlayerRank = -1; // Posición del jugador en el ranking, para scroll automático

function runRankingAnimation(targetScore, submitPromise) {
  const overlay = document.getElementById('ranking-animation-overlay');
  const rankPositionValEl = document.getElementById('rank-position-val');
  const scoreValEl = document.getElementById('rank-score-val');
  const shipEl = overlay.querySelector('.ship-base');
  const asteroidsStatEl = document.getElementById('rank-stat-asteroids');
  const powerupsStatEl = document.getElementById('rank-stat-powerups');
  const rankShipContainer = document.getElementById('rank-ship-container');
  const btnsContainer = document.getElementById('rank-anim-btns');
  const shareBtn = document.getElementById('rank-anim-share-btn');

  const nickname = (typeof getPlayerNickname === 'function' ? getPlayerNickname() : '') || localStorage.getItem("dodgeUsername") || localStorage.getItem("dodgePlayerNickname") || i18n.t("label_anonymous");
  const nicknameEl = document.getElementById('diploma-nickname');
  if (nicknameEl) nicknameEl.textContent = nickname.toUpperCase();

  const modeEl = document.getElementById('diploma-mode');
  if (modeEl) {
    const modeKey = pendingMode === 'fast' ? "mode_fast" : (pendingMode === 'swingcopter' ? "mode_zigzag" : "mode_normal");
    modeEl.textContent = i18n.t(modeKey).toUpperCase();
  }

  overlay.querySelectorAll('.rank-error-text, .explosion, .rank-error-flash').forEach(el => el.remove());
  document.querySelectorAll('[data-diploma-clone]').forEach(el => el.remove());
  document.querySelectorAll('[data-diploma-parent-pos]').forEach(el => { el.style.position = ''; el.style.overflow = ''; el.removeAttribute('data-diploma-parent-pos'); el.removeAttribute('data-diploma-parent-overflow'); });
  document.querySelector('#rank-ship-container').style.background = '';
  const diplomaReset = document.getElementById('diploma-mini-preview');
  if (diplomaReset) diplomaReset.style.opacity = '';
  isRankingAnimationRunning = true;
  rankingAnimSkipRequested = false;
  if (shareBtn) shareBtn.textContent = i18n.t("btn_skip");

  shipEl.className = 'ship-base';
  applySkinLayers(shipEl, loadActiveSkins());
  overlay.classList.remove('hidden');
  if (btnsContainer) {
    btnsContainer.classList.add('show');
    btnsContainer.style.pointerEvents = 'auto';
  }
  rankShipContainer.classList.add('speeding');
  shipEl.style.display = 'block'; shipEl.classList.remove('enter-center'); shipEl.classList.add('flying-up');
  rankPositionValEl.textContent = "#999";
  scoreValEl.textContent = "0";
  scoreValEl.dataset.rawScore = targetScore;
  asteroidsStatEl.textContent = "0"; powerupsStatEl.textContent = "0";

  const duration = 4000;

  let targetRank = 101;
  let animTargetRank = 101;
  let animStartTime = 0;
  let errorTriggered = false;
  const _numFmt = new Intl.NumberFormat();
  let _lastCounterFrame = 0;

  function updateCounter(now) {
    if (errorTriggered || !isRankingAnimationRunning) return;
    if (now - _lastCounterFrame < 33) { requestAnimationFrame(updateCounter); return; }
    _lastCounterFrame = now;
    if (animStartTime === 0) animStartTime = now;
    let elapsed = now - animStartTime;
    if (rankingAnimSkipRequested) elapsed = duration;
    const linearProgress = Math.min(elapsed / duration, 1);
    const progress = 1 - Math.pow(1 - linearProgress, 3);
    asteroidsStatEl.textContent = String(Math.floor(sessionAsteroidsDestroyed * progress));
    powerupsStatEl.textContent = String(Math.floor(sessionPowerupsCollected * progress));
    scoreValEl.textContent = _numFmt.format(Math.floor(targetScore * progress));
    let currentRank = animTargetRank <= 100 ? Math.max(animTargetRank, Math.floor(999 - (999 - animTargetRank) * progress)) : Math.max(101, Math.floor(999 - 898 * progress));
    rankPositionValEl.textContent = linearProgress < 1 ? `#${_numFmt.format(currentRank)}` : (animTargetRank <= 100 ? `#${animTargetRank}` : "N/A");
    if (linearProgress < 1) { requestAnimationFrame(updateCounter); return; }
    if (shareBtn) shareBtn.textContent = i18n.t("btn_share");
    isRankingAnimationRunning = false;
    shipEl.style.display = 'none'; shipEl.classList.remove('flying-up');
    rankShipContainer.classList.remove('speeding');
    createConfetti(rankShipContainer, 52, 50); playHit();
    setTimeout(() => { shipEl.style.display = 'block'; shipEl.classList.add('enter-center'); }, 400);
  }

  requestAnimationFrame(updateCounter);

  sendMessageToSW("getLeaderboard", { mode: pendingMode, forceRefresh: false }).then(res => {
    if (errorTriggered) return;
    if (res.ok && res.data) for (let i = 0; i < res.data.length; i++) { if (targetScore >= res.data[i].score) { targetRank = i + 1; break; } }
    animTargetRank = targetRank;
    pendingPlayerRank = targetRank <= 100 ? targetRank : -1;
  });

  if (submitPromise) {
    submitPromise.then(ok => {
      if (ok === 'client_reject') {
        isRankingAnimationRunning = false;
        rankingAnimSkipRequested = false;
  overlay.querySelectorAll('.rank-error-text, .explosion, .rank-error-flash').forEach(el => el.remove());
  document.querySelectorAll('[data-diploma-clone]').forEach(el => el.remove());
  document.querySelectorAll('[data-diploma-parent-pos]').forEach(el => { el.style.position = ''; el.style.overflow = ''; el.removeAttribute('data-diploma-parent-pos'); el.removeAttribute('data-diploma-parent-overflow'); });
  document.querySelectorAll('.rank-error-close-btn').forEach(el => el.remove());
        document.querySelector('#rank-ship-container').style.background = '';
        const diplomaReset = document.getElementById('diploma-mini-preview');
        if (diplomaReset) diplomaReset.style.opacity = '';
        overlay.querySelector('.ship-base').classList.remove('flying-up');
        overlay.classList.add('hidden');
        setOverlayMode("menu"); overlayEl.scrollTop = 0;
        document.getElementById("gameover-overlay").classList.remove("hidden");
        return;
      }
      if (!ok) {
        errorTriggered = true;
        isRankingAnimationRunning = false;
        const rankCard = overlay.querySelector('#rank-card');
        shipEl.classList.remove('flying-up');
        shipEl.style.display = 'none';
        rankShipContainer.classList.remove('speeding');

        // Explosion at ship's current position
        const shipRect = shipEl.getBoundingClientRect();
        const containerRect = rankShipContainer.getBoundingClientRect();
        const exSize = 80;
        const explosion = document.createElement('div');
        explosion.className = 'explosion';
        explosion.style.cssText = `width:${exSize}px;height:${exSize}px;left:${shipRect.left - containerRect.left + shipRect.width / 2 - exSize / 2}px;top:${shipRect.top - containerRect.top + shipRect.height / 2 - exSize / 2}px`;
        rankShipContainer.appendChild(explosion);

        // Red overlay on ship container
        rankShipContainer.style.background = 'rgba(180,0,0,0.35)';

        // Error text inside ship container, pulsing in size
        const errWrap = document.createElement('div');
        errWrap.style.cssText = 'position:absolute;top:0;left:0;width:145px;height:100%;z-index:100;pointer-events:none;display:flex;align-items:center;justify-content:center;overflow:hidden;';
        const errorText = document.createElement('div');
        errorText.textContent = i18n.t('error_generic', 'ERROR');
        errorText.style.cssText = 'transform:rotate(-40deg);color:#ff1744;font-size:28px;font-weight:900;text-shadow:0 0 20px rgba(255,0,0,0.8),0 0 40px rgba(255,0,0,0.4);font-family:"Courier New",monospace;letter-spacing:6px;white-space:nowrap;animation:errorPulseScale 0.5s ease-in-out infinite alternate;';
        errWrap.appendChild(errorText);
        rankShipContainer.appendChild(errWrap);

        // Diploma split: clones inside parent with position:relative
        const diploma = document.getElementById('diploma-mini-preview');
        if (diploma) {
          const parent = diploma.parentNode;
          parent.style.position = 'relative';
          parent.style.overflow = 'hidden';
          // offsetLeft/offsetTop now relative to parent (position:relative)
          const coords = { left: diploma.offsetLeft, top: diploma.offsetTop };
          const dims = { w: diploma.offsetWidth, h: diploma.offsetHeight };
          const zigzag = '52% 2%,48% 5%,53% 8%,47% 12%,52% 15%,48% 20%,53% 25%,47% 30%,52% 35%,48% 40%,53% 45%,47% 50%,52% 55%,48% 60%,53% 65%,47% 70%,52% 75%,48% 80%,53% 85%,47% 90%,52% 95%,50% 100%';

          const cl = diploma.cloneNode(true);
          cl.setAttribute('data-diploma-clone', 'true');
          cl.style.cssText = `position:absolute;left:${coords.left}px;top:${coords.top}px;width:${dims.w}px;height:${dims.h}px;margin:0;z-index:10000;pointer-events:none;clip-path:inset(0);transform:none;transform-origin:right center;transition:transform 0.5s cubic-bezier(.55,0,.1,1),clip-path 0.5s cubic-bezier(.55,0,.1,1);`;

          const cr = diploma.cloneNode(true);
          cr.setAttribute('data-diploma-clone', 'true');
          cr.style.cssText = `position:absolute;left:${coords.left}px;top:${coords.top}px;width:${dims.w}px;height:${dims.h}px;margin:0;z-index:10000;pointer-events:none;clip-path:inset(0);transform:none;transform-origin:left center;transition:transform 0.5s cubic-bezier(.55,0,.1,1),clip-path 0.5s cubic-bezier(.55,0,.1,1);`;

          parent.setAttribute('data-diploma-parent-pos', 'true');
          parent.setAttribute('data-diploma-parent-overflow', 'true');
          parent.appendChild(cl);
          parent.appendChild(cr);
          diploma.style.opacity = '0';

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              cl.style.clipPath = `polygon(0% 0%,50% 0%,${zigzag},0% 100%)`;
              cl.style.transform = 'translateX(-35px) translateY(-25px) rotate(-12deg)';
              cr.style.clipPath = `polygon(100% 0%,50% 0%,${zigzag},100% 100%)`;
              cr.style.transform = 'translateX(35px) translateY(-20px) rotate(10deg)';
            });
          });
        }

        rankCard.classList.add('screen-shake');
        if (typeof playCollisionSound === 'function') playCollisionSound();
        setTimeout(() => rankCard.classList.remove('screen-shake'), 500);

        // On error: hide skip/share, show big centered close button
        const btnsContainer = document.getElementById('rank-anim-btns');
        if (btnsContainer) btnsContainer.style.display = 'none';
        const bottomContent = document.getElementById('rank-bottom-content');
        if (bottomContent) {
          const errClose = document.createElement('button');
          errClose.textContent = i18n ? i18n.t('btn_close') : 'Cerrar';
          errClose.className = 'rank-error-close-btn';
          errClose.style.cssText = 'display:block;margin:20px auto 0;padding:14px 40px;font-size:18px;font-weight:bold;border-radius:12px;background:linear-gradient(135deg,#ff1744,#d50000);color:#fff;border:none;cursor:pointer;box-shadow:0 0 20px rgba(255,23,68,0.6);';
          errClose.addEventListener('click', () => {
            document.getElementById('rank-anim-close-btn')?.click();
          });
          bottomContent.appendChild(errClose);
        }
      }
    }).catch(() => {});
  }

  playLevelUp();
}

document.getElementById('rank-anim-close-btn')?.addEventListener('click', () => {
  const overlay = document.getElementById('ranking-animation-overlay');
  isRankingAnimationRunning = false;
  rankingAnimSkipRequested = false;
  overlay.querySelectorAll('.rank-error-text, .explosion, .rank-error-flash').forEach(el => el.remove());
  document.querySelectorAll('[data-diploma-clone]').forEach(el => el.remove());
  document.querySelectorAll('[data-diploma-parent-pos]').forEach(el => { el.style.position = ''; el.style.overflow = ''; el.removeAttribute('data-diploma-parent-pos'); el.removeAttribute('data-diploma-parent-overflow'); });
  document.querySelector('#rank-ship-container').style.background = '';
  overlay.querySelector('.ship-base').classList.remove('flying-up');
  overlay.classList.add('hidden');
  document.getElementById("gameover-overlay").classList.add("hidden");
  openLeaderboardOverlay(pendingMode, true);
});

document.getElementById('rank-anim-share-btn')?.addEventListener('click', () => {
  if (isRankingAnimationRunning) {
    rankingAnimSkipRequested = true;
    playMenuClickSound();
    return;
  }
  const nickname = (typeof getPlayerNickname === 'function' ? getPlayerNickname() : '') || localStorage.getItem("dodgeUsername") || localStorage.getItem("dodgePlayerNickname") || i18n.t("label_anonymous");
  const scoreValEl = document.getElementById('rank-score-val');
  const scoreVal = parseInt(scoreValEl.dataset.rawScore) || parseInt(scoreValEl.textContent.replace(/\D/g, '')) || 0;
  const rankVal = document.getElementById('rank-position-val').textContent;
  shareRecord(nickname, scoreVal, rankVal, pendingMode, sessionAsteroidsDestroyed, sessionPowerupsCollected);
  playMenuClickSound();
});

// Review overlay
if (btnReviewRate) btnReviewRate.addEventListener("click", () => { localStorage.setItem("dodgeReviewDone", "true"); window.open("https://chromewebstore.google.com/detail/biehdpiiafehoplkpeiocmafobcfpcob/reviews", "_blank"); document.getElementById("review-overlay").classList.add("hidden"); });
if (btnReviewLater) btnReviewLater.addEventListener("click", () => document.getElementById("review-overlay").classList.add("hidden"));
if (btnReviewNever) btnReviewNever.addEventListener("click", () => { localStorage.setItem("dodgeReviewDone", "true"); document.getElementById("review-overlay").classList.add("hidden"); });

// ============================================================
// SELECTOR DE MODO
// ============================================================

function initMenuModeTabs() {
  document.querySelectorAll("#menu-section .mode-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      if (!canInteract(tab)) return;
      const newMode = tab.dataset.mode;
      const isCurrentlyNormal = !fastModeActive && !swingcopterModeActive;
      if ((newMode === 'normal' && isCurrentlyNormal) || (newMode === 'fast' && fastModeActive) || (newMode === 'swingcopter' && swingcopterModeActive)) return;
      playMenuClickSound();
      if (activeSlot !== null) { activeSlot = null; updateSlotButtonUI(); if (typeof updateSlotInfoPanel === 'function') updateSlotInfoPanel(); }
      fastModeActive = (newMode === 'fast');
      swingcopterModeActive = (newMode === 'swingcopter');
      broadcastGameStateChange('fastModeActive', fastModeActive);
      broadcastGameStateChange('swingcopterModeActive', swingcopterModeActive);
      updateModeUI();
      if (rememberModeToggle && rememberModeToggle.checked) saveSetting(SETTINGS_KEYS.lastMode, newMode);
    });
  });
}

function addModeSelectorListeners() {
  if (modeSelectBtn) {
    modeSelectBtn.addEventListener("click", () => {
      if (!canInteract(modeSelectBtn)) return;
      playMenuClickSound(); modeSelectorWrapper.classList.toggle("open"); modeOptions.classList.toggle("hidden");
    });
  }
  if (modeOptions) {
    modeOptions.addEventListener("click", (e) => {
      const target = e.target.closest(".mode-option");
      if (!target || target.classList.contains("disabled")) return;
      const newMode = target.dataset.mode;
      const isCurrentlyNormal = !fastModeActive && !swingcopterModeActive;
      if ((newMode === 'normal' && isCurrentlyNormal) || (newMode === 'fast' && fastModeActive) || (newMode === 'swingcopter' && swingcopterModeActive)) {
        modeSelectorWrapper.classList.remove("open"); modeOptions.classList.add("hidden"); return;
      }
      const fastModeSeen = localStorage.getItem("dodgeFastModeSeen") === "true";
      const zigzagModeSeen = localStorage.getItem("dodgeZigZagModeSeen") === "true";
      if (newMode === 'fast' && !fastModeSeen) showModeExplanation('fast');
      else if (newMode === 'swingcopter' && !zigzagModeSeen) showModeExplanation('swingcopter');
      else {
        if (activeSlot !== null) { activeSlot = null; updateSlotButtonUI(); if (typeof updateSlotInfoPanel === 'function') updateSlotInfoPanel(); }
        fastModeActive = (newMode === 'fast');
        swingcopterModeActive = (newMode === 'swingcopter');
        playMenuClickSound();
        broadcastGameStateChange('fastModeActive', fastModeActive);
        broadcastGameStateChange('swingcopterModeActive', swingcopterModeActive);
        updateModeUI();
        if (rememberModeToggle && rememberModeToggle.checked) saveSetting(SETTINGS_KEYS.lastMode, newMode);
      }
      modeSelectorWrapper.classList.remove("open"); modeOptions.classList.add("hidden");
    });
  }
  document.addEventListener('click', (e) => {
    if (modeSelectorWrapper && !modeSelectorWrapper.contains(e.target) && modeSelectorWrapper.classList.contains('open')) {
      modeSelectorWrapper.classList.remove('open'); modeOptions.classList.add('hidden');
    }
  });
}

// ============================================================
// TUTORIAL
// ============================================================

let currentTutorialStep = 0;
const tutorialSteps = [
  { titleKey: "tut_step1_title", textKey: "tut_step1_text", visual: '<span class="t-key">←</span> <span class="t-key">→</span>' },
  { titleKey: "tut_step2_title", textKey: "tut_step2_text", visual: '<span style="font-size:48px;">☄️</span>' },
  { titleKey: "tut_step3_title", textKey: "tut_step3_text", visual: '<span class="t-key">↑</span>' },
  { titleKey: "instr_powerups_title", textKey: "tut_step4_text", visual: '<div class="t-power" style="color:#4caf50;background:#4caf50"></div><div class="t-power" style="color:#f44336;background:#f44336"></div><div class="t-power" style="color:#2196f3;background:#2196f3"></div>' },
  { titleKey: "instr_lives_title", textKey: "tut_step5_text", visual: '<div class="t-life"><img src="images/Full.png" style="width:24px;height:24px;margin-right:8px;"><span style="color:#fff;font-size:16px">x10</span></div>' },
  { titleKey: "tut_step6_title", textKey: "tut_step6_text", visual: '<span class="t-key" style="width:100px">ESPACIO</span>' }
];

function checkFirstTime(){
  // Pancartas eliminadas: solo queda tutorial jugable
  if(localStorage.getItem("dodgeTutorialSeen")!=="true"){
    localStorage.setItem("dodgeTutorialSeen","true");
    localStorage.setItem("dodgeTutorialSkipped","false");
  }
  if(localStorage.getItem("dodgeFirstGameDone")!=="true" && localStorage.getItem("dodgeTutorialSkipped")!=="true") {
    const playBtn = document.getElementById("menu-play-btn");
    if (playBtn) playBtn.classList.add("glow-btn");
  }
}

function showTutorial(){ finishTutorial(true); return; }

function updateTutorialUI() {
  const step = tutorialSteps[currentTutorialStep];
  document.getElementById("tutorial-step-title").textContent = i18n.t(step.titleKey);
  document.getElementById("tutorial-step-text").textContent = i18n.t(step.textKey);
  const vb = document.getElementById("tutorial-visual-box"); if (vb) vb.innerHTML = step.visual;
  document.getElementById("tutorial-next-btn").textContent = currentTutorialStep === tutorialSteps.length - 1 ? i18n.t("btn_fly") : i18n.t("btn_next");
}

function tutorialNextHandler() {
  currentTutorialStep++;
  if (currentTutorialStep < tutorialSteps.length) updateTutorialUI();
  else finishTutorial(true);
}

function finishTutorial(showGlow = true) {
  document.getElementById("tutorial-overlay").classList.add("hidden");
  localStorage.setItem("dodgeTutorialSeen", "true");
  if (showGlow) { const playBtn = document.getElementById("menu-play-btn"); if (playBtn) playBtn.classList.add("glow-btn"); localStorage.setItem("dodgeTutorialSkipped", "false"); }
  else { localStorage.setItem("dodgeTutorialSkipped", "true"); }

  if (!localStorage.getItem('dodgeUsername')) {
    setTimeout(showUsernamePrompt, 300);
  }
}

function showModeExplanation(mode) {
  const vb = document.getElementById("tutorial-visual-box");
  const title = document.getElementById("tutorial-step-title");
  const text = document.getElementById("tutorial-step-text");
  const nextBtn = document.getElementById("tutorial-next-btn");
  const skipBtnT = document.getElementById("tutorial-skip-btn");
  if (skipBtnT) skipBtnT.style.display = "none";
  if (mode === 'fast') {
    title.textContent = i18n.t("mode_fast_explanation_title");
    text.textContent = i18n.t("mode_fast_explanation_text");
    vb.innerHTML = `<div class="t-key" style="color:#ffc107;border-color:#ffc107">${i18n.t("mode_fast_speed_tag")}</div>`;
  } else {
    title.textContent = i18n.t("mode_zigzag_explanation_title");
    text.textContent = i18n.t("mode_zigzag_explanation_text");
    vb.innerHTML = `<div class="t-key" style="color:#50e3c2;border-color:#50e3c2">${i18n.t("mode_zigzag_visual_tag")}</div>`;
  }
  nextBtn.textContent = i18n.t("btn_understood");
  document.getElementById("tutorial-overlay").classList.remove("hidden");
  const closeExp = () => {
    localStorage.setItem(mode === 'fast' ? "dodgeFastModeSeen" : "dodgeZigZagModeSeen", "true");
    if (modeSelectBtn) modeSelectBtn.classList.remove("glow-btn");
    document.getElementById("tutorial-overlay").classList.add("hidden");
    if (skipBtnT) skipBtnT.style.display = "inline-block";
    if (activeSlot !== null) { activeSlot = null; updateSlotButtonUI(); if (typeof updateSlotInfoPanel === 'function') updateSlotInfoPanel(); }
    fastModeActive = (mode === 'fast'); swingcopterModeActive = (mode === 'swingcopter');
    playMenuClickSound();
    broadcastGameStateChange('fastModeActive', fastModeActive);
    broadcastGameStateChange('swingcopterModeActive', swingcopterModeActive);
    updateModeUI(); updateBestScoreUI(); updateLivesUI(); updateOverlayLivesInfo();
    syncLeaderboardWithGameMode();
    if (rememberModeToggle && rememberModeToggle.checked) saveSetting(SETTINGS_KEYS.lastMode, mode);
    if (nextBtn._modeCloseExp) { nextBtn.removeEventListener("click", nextBtn._modeCloseExp); nextBtn._modeCloseExp = null; }
    nextBtn.addEventListener("click", tutorialNextHandler);
  };
  nextBtn.removeEventListener("click", tutorialNextHandler);
  if (nextBtn._modeCloseExp) nextBtn.removeEventListener("click", nextBtn._modeCloseExp);
  nextBtn._modeCloseExp = closeExp;
  nextBtn.addEventListener("click", closeExp);
}

document.getElementById("tutorial-skip-btn").addEventListener("click", () => finishTutorial(false));
document.getElementById("tutorial-next-btn").addEventListener("click", tutorialNextHandler);

function initLegalTerms() {
  const legalOverlay = document.getElementById('legal-overlay');
  const termsCheck = document.getElementById('terms-check');
  const privacyCheck = document.getElementById('privacy-check');
  const acceptBtn = document.getElementById('accept-legal-btn');
  if (!legalOverlay) return;
  if (localStorage.getItem('dodgeLegalAccepted') === 'true') { legalOverlay.classList.add('hidden'); checkFirstTime(); return; }
  const validate = () => { acceptBtn.disabled = !(termsCheck.checked && privacyCheck.checked); };
  termsCheck.addEventListener('change', validate);
  privacyCheck.addEventListener('change', validate);
  acceptBtn.addEventListener('click', () => {
    localStorage.setItem('dodgeLegalAccepted', 'true');
    try {
      const cur = (typeof getCurrentAppVersion === 'function') ? getCurrentAppVersion() : ((typeof Platform !== 'undefined' && Platform.manifest && Platform.manifest.version) ? Platform.manifest.version : CURRENT_VERSION);
      if (typeof VERSION_KEY !== 'undefined') localStorage.setItem(VERSION_KEY, cur);
    } catch(e) {}
    legalOverlay.classList.add('hidden');
    // Fix premio 1.0: si el bloqueo previo impidió crear el pending, crearlo ahora
    try { if (!localStorage.getItem('dodgeRewardPending') && !localStorage.getItem('dodgeNickNumber') && !localStorage.getItem('dodgeUsername') && !localStorage.getItem('dodgePlayerNickname')) { const hasBeta = localStorage.getItem('dodgeBetaMode') !== null; const reward = hasBeta ? 5000 : 1000; localStorage.setItem('dodgeRewardPending', JSON.stringify({ amount: reward, hasBeta })); } } catch(e){}
    checkFirstTime();
    try { if (typeof hasValidTermsForServer==='function' && hasValidTermsForServer()) { sendMessageToSW("checkAndRefreshCaches",{}).catch(()=>{}); if(typeof _loadSyncData==='function') _loadSyncData(); try{ if(typeof requestSyncServerTime==='function') requestSyncServerTime(); }catch(e){} try{ if(typeof updateNewsIndicator==='function') void updateNewsIndicator(); }catch(e){} try{ if(typeof renderNews==='function') void renderNews(); }catch(e){} } }catch(e){}
  });
}

function initTermsUpdateOverlay() {
  const overlay = document.getElementById('terms-update-overlay');
  const termsCheck = document.getElementById('terms-update-check');
  const privacyCheck = document.getElementById('privacy-update-check');
  const acceptBtn = document.getElementById('accept-terms-update-btn');
  if (!overlay || !termsCheck || !privacyCheck || !acceptBtn) return;
  const validate = () => { acceptBtn.disabled = !(termsCheck.checked && privacyCheck.checked); };
  termsCheck.addEventListener('change', validate);
  privacyCheck.addEventListener('change', validate);
  acceptBtn.addEventListener('click', () => {
    localStorage.setItem('dodgeLegalAccepted', 'true');
    try {
      const cur = (typeof getCurrentAppVersion === 'function') ? getCurrentAppVersion() : ((typeof Platform !== 'undefined' && Platform.manifest && Platform.manifest.version) ? Platform.manifest.version : CURRENT_VERSION);
      if (typeof VERSION_KEY !== 'undefined') localStorage.setItem(VERSION_KEY, cur);
    } catch(e) {}
    termsCheck.checked = false;
    privacyCheck.checked = false;
    acceptBtn.disabled = true;
    const rp = document.getElementById('terms-update-reject-panel');
    if (rp) rp.classList.add('hidden');
    overlay.classList.add('hidden');
    try { if (!localStorage.getItem('dodgeRewardPending') && !localStorage.getItem('dodgeNickNumber') && !localStorage.getItem('dodgeUsername') && !localStorage.getItem('dodgePlayerNickname')) { const hasBeta = localStorage.getItem('dodgeBetaMode') !== null; const reward = hasBeta ? 5000 : 1000; localStorage.setItem('dodgeRewardPending', JSON.stringify({ amount: reward, hasBeta })); } } catch(e){}
    checkFirstTime();
    try { if (typeof hasValidTermsForServer==='function' && hasValidTermsForServer()) { sendMessageToSW("checkAndRefreshCaches",{}).catch(()=>{}); if(typeof _loadSyncData==='function') _loadSyncData(); try{ if(typeof requestSyncServerTime==='function') requestSyncServerTime(); }catch(e){} try{ if(typeof updateNewsIndicator==='function') void updateNewsIndicator(); }catch(e){} try{ if(typeof renderNews==='function') void renderNews(); }catch(e){} } }catch(e){}
  });
  const rejectBtn = document.getElementById('reject-terms-update-btn');
  const rejectPanel = document.getElementById('terms-update-reject-panel');
  const rejectExportBtn = document.getElementById('reject-export-btn');
  const rejectCloseBtn = document.getElementById('reject-close-btn');
  if (rejectBtn) rejectBtn.addEventListener('click', () => { if (rejectPanel) rejectPanel.classList.remove('hidden'); });
  if (rejectExportBtn) rejectExportBtn.addEventListener('click', async () => {
    try {
      const encrypted = await encryptExportToBase64(JSON.stringify(getExportPayload()));
      const csv = `tipo,datos\njuego_ofuscado_v2,${encrypted}`;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'asteroid_rush_datos.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch(e) { try { if (typeof exportDataBtn !== 'undefined' && exportDataBtn) exportDataBtn.click(); } catch(_){} }
  });
  if (rejectCloseBtn) rejectCloseBtn.addEventListener('click', () => { if (rejectPanel) rejectPanel.classList.add('hidden'); });
}
