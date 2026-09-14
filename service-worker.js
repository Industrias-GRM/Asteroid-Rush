// service-worker.js (MV3)
importScripts('keys.js');

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const COLLECTION_NAME = "Asteroid_Rush";

const NEWS_FIREBASE_CONFIG = {
  apiKey: NEWS_API_KEY,
  projectId: "asteroid-rush-news"
};
const NEWS_BASE_URL = `https://firestore.googleapis.com/v1/projects/${NEWS_FIREBASE_CONFIG.projectId}/databases/(default)/documents`;
const NEWS_COLLECTION_NAME = "Noticias";

const SCORE_RATE = 0.25;
const FAST_MODE_MULTIPLIER = 3;
const CHEAT_MARGIN = 2;

async function _captureServerDate(response) {
  try {
    const d = response && response.headers ? response.headers.get('date') : null;
    if (!d) return null;
    const serverMs = new Date(d).getTime();
    if (isNaN(serverMs)) return null;
    await chrome.storage.local.set({
      dodgeServerTime: serverMs,
      dodgeLastSyncDate: new Date(serverMs).toISOString().slice(0, 10)
    });
    return serverMs;
  } catch (e) { return null; }
}

async function syncServerTime(payload) {
  try {
    const mono = (payload && typeof payload.mono === 'number') ? payload.mono : Date.now();
    const res = await fetch(`${BASE_URL}?key=${API_KEY}&pageSize=1`);
    const serverMs = await _captureServerDate(res);
    if (serverMs === null) return { ok: false };
    await chrome.storage.local.set({ dodgeSyncMono: mono });
    return { ok: true, serverTime: serverMs };
  } catch (e) {
    return { ok: false, error: e && e.message };
  }
}

async function getSyncData() {
  try {
    const st = await chrome.storage.local.get(['dodgeServerTime', 'dodgeSyncMono', 'dodgeLastSyncDate']);
    return {
      ok: true,
      serverTime: typeof st.dodgeServerTime === 'number' ? st.dodgeServerTime : 0,
      syncMono:   typeof st.dodgeSyncMono   === 'number' ? st.dodgeSyncMono   : 0,
      lastSyncDate: typeof st.dodgeLastSyncDate === 'string' ? st.dodgeLastSyncDate : ''
    };
  } catch (e) {
    return { ok: false, serverTime: 0, syncMono: 0, lastSyncDate: '' };
  }
}

const REFRESH_COOLDOWN = 2 * 60 * 1000;
let lastRefreshTimestamps = { normal: 0, fast: 0, swingcopter: 0 };

let leaderboardCache = {
  normal: { data: null, timestamp: 0 },
  fast: { data: null, timestamp: 0 },
  swingcopter: { data: null, timestamp: 0 }
};
const CACHE_DURATION = 20 * 60 * 1000;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message;
  handleMessage(type, payload).then(sendResponse);
  return true;
});

async function handleMessage(type, payload) {
  try {
    switch (type) {
      case "resetLeaderboardCooldown":
        if (payload.mode) lastRefreshTimestamps[payload.mode] = 0;
        return { ok: true };
      case "submitScore":
        const res = await submitScore(payload);
        if (payload.mode) leaderboardCache[payload.mode].timestamp = 0;
        return res;
      case "deleteRankingScores":
        return await deleteRankingScores(payload);
      case "getLeaderboard":
        return await getLeaderboard(payload);
      case "isScoreInTop100":
        return await isScoreInTop100(payload);
      case "checkAndRefreshCaches":
        return await checkAndRefreshCaches();
      case "getNews":
        return await getNews(payload);
      case "getNewsWithCooldown":
        return await getNewsWithCooldown(payload);
      case "syncServerTime":
        return await syncServerTime(payload);
      case "getSyncData":
        return await getSyncData();
      default:
        return { ok: false, error: "Tipo desconocido" };
    }
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function checkAndRefreshCaches() {
  const modes = ["normal", "fast", "swingcopter"];
  const now = Date.now();
  const results = {};
  for (const mode of modes) {
    const cache = leaderboardCache[mode];
    if (!cache.data || (now - cache.timestamp >= CACHE_DURATION)) {
      await getLeaderboard({ mode, forceRefresh: false });
      results[mode] = "refreshed";
    } else {
      results[mode] = "from_cache";
    }
  }
  return { ok: true, results };
}

async function getLeaderboard({ mode, forceRefresh }) {
  const now = Date.now();
  const cache = leaderboardCache[mode];
  if (forceRefresh) {
    const timeSinceLastRefresh = now - (lastRefreshTimestamps[mode] || 0);
    if (timeSinceLastRefresh < REFRESH_COOLDOWN && cache.data) {
      return { ok: true, data: cache.data, timestamp: cache.timestamp, fromCache: true };
    }
  }
  if (!forceRefresh && cache.data && (now - cache.timestamp < CACHE_DURATION)) {
    return { ok: true, data: cache.data, timestamp: cache.timestamp, fromCache: true };
  }
  const docId = mode === "fast" ? "Rapido" : (mode === "swingcopter" ? "Swingcopter" : "Normal");
  const url = `${BASE_URL}/${encodeURIComponent(COLLECTION_NAME)}/${docId}?key=${API_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        leaderboardCache[mode] = { data: [], timestamp: now };
        return { ok: true, data: [], timestamp: now };
      }
      throw new Error("Network response was not ok");
    }
    const json = await response.json();
    const fields = json.fields || {};
    const entries = [];
    for (let i = 1; i <= 100; i++) {
      const scoreVal = fields[`puntuacion${i}`]?.integerValue;
      const nameVal = fields[`nombre${i}`]?.stringValue;
      const uidVal = fields[`uid${i}`]?.stringValue || '';
      if (scoreVal !== undefined && nameVal !== undefined) entries.push({ name: nameVal, score: parseInt(scoreVal, 10), uid: uidVal });
    }
    entries.sort((a, b) => b.score - a.score);
    lastRefreshTimestamps[mode] = now;
    leaderboardCache[mode] = { data: entries, timestamp: now };
    return { ok: true, data: entries, timestamp: now };
  } catch (error) {
    if (cache.data) {
      return { ok: true, data: cache.data, timestamp: cache.timestamp, fromCache: true, offline: true };
    }
    return { ok: false, error: error.message };
  }
}

async function submitScore({ mode, score, name, duration }) {
  leaderboardCache[mode].timestamp = 0;
  lastRefreshTimestamps[mode] = 0;
  if (duration && score > 1000) {
    if (score > (duration * (mode === 'fast' ? FAST_MODE_MULTIPLIER : 1) * SCORE_RATE) * CHEAT_MARGIN)
      return { ok: false, error: "Puntuación sospechosa." };
  }
  const MAX_RETRIES = 5;
  for (let i = 0; i < MAX_RETRIES; i++) {
    let docId = mode === "fast" ? "Rapido" : (mode === "swingcopter" ? "Swingcopter" : "Normal");
    const getUrl = `${BASE_URL}/${encodeURIComponent(COLLECTION_NAME)}/${docId}?key=${API_KEY}`;
    let entries = [];
    let updateTime = null;
    const getResponse = await fetch(getUrl);
    if (getResponse.ok) {
      const json = await getResponse.json();
      updateTime = json.updateTime;
      const fields = json.fields || {};
      for (let j = 1; j <= 100; j++) {
        const scoreVal = fields[`puntuacion${j}`]?.integerValue;
        const nameVal = fields[`nombre${j}`]?.stringValue;
        if (scoreVal !== undefined && nameVal !== undefined) entries.push({ name: nameVal, score: parseInt(scoreVal, 10) });
      }
    }
    const newScore = parseInt(score, 10);
    const safeNameStr = String(name);
    let userPrevBest = 0;
    for (const e of entries) {
      if (e.name === safeNameStr && e.score > userPrevBest) userPrevBest = e.score;
    }
    if (userPrevBest > 0 && newScore <= userPrevBest) {
      return { ok: false, error: "Puntuación igual o inferior a la anterior." };
    }
    entries = entries.filter(e => e.name !== safeNameStr);
    entries.push({ name, score: newScore });
    entries.sort((a, b) => b.score - a.score);
    entries = entries.slice(0, 100);
    while (entries.length < 100) entries.push({ name: "---", score: 0 });
    const fields = {};
    entries.forEach((entry, index) => {
      const j = index + 1;
      fields[`nombre${j}`] = { stringValue: entry.name };
      fields[`puntuacion${j}`] = { integerValue: String(entry.score) };
    });
    fields['score_actual'] = { integerValue: String(Math.floor(score)) };
    fields['tiempo'] = { integerValue: String(Math.floor(duration || 1)) };
    let writeUrl = `${BASE_URL}/${encodeURIComponent(COLLECTION_NAME)}/${docId}?key=${API_KEY}`;
    if (updateTime) writeUrl += `&currentDocument.updateTime=${encodeURIComponent(updateTime)}`;
    const writeResponse = await fetch(writeUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });
    if (writeResponse.ok) return { ok: true };
    let errorMsg = "Error al enviar.";
    try { const errJson = await writeResponse.json(); errorMsg = errJson?.error?.message || errorMsg; } catch(e) {}
    if (writeResponse.status !== 412 && writeResponse.status !== 409) return { ok: false, error: `${writeResponse.status}: ${errorMsg}` };
    await new Promise(resolve => setTimeout(resolve, 70 + Math.random() * 100));
  }
  return { ok: false, error: "Error al enviar." };
}

function _parseNewsDateToMs(dateStr) {
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

const NEWS_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const NEWS_LAST_REQUEST_KEY = "newsLastRequestAt";
let newsCache = { data: null, lastRequestAt: 0 };

async function _getPersistedNewsLastRequestAt() {
  try {
    const stored = await chrome.storage.local.get([NEWS_LAST_REQUEST_KEY]);
    const v = stored ? stored[NEWS_LAST_REQUEST_KEY] : null;
    return typeof v === "number" && isFinite(v) ? v : 0;
  } catch (e) { return 0; }
}

async function _setPersistedNewsLastRequestAt(ts) {
  try {
    await chrome.storage.local.set({ [NEWS_LAST_REQUEST_KEY]: ts });
  } catch (e) {}
}

async function getNewsWithCooldown({ forceRefresh = false } = {}) {
  const now = Date.now();
  const persistedLastRequestAt = await _getPersistedNewsLastRequestAt();
  const lastRequestAt = persistedLastRequestAt || (typeof newsCache.lastRequestAt === "number" ? newsCache.lastRequestAt : 0);
  const timeSinceLastRequest = now - (lastRequestAt || 0);
  const canUseCache = newsCache.data && !forceRefresh && timeSinceLastRequest <= NEWS_COOLDOWN_MS;
  if (canUseCache) {
    return { ok: true, data: newsCache.data, timestamp: lastRequestAt, fromCache: true };
  }
  newsCache.lastRequestAt = now;
  await _setPersistedNewsLastRequestAt(now);
  const res = await getNews();
  if (res && res.ok) {
    newsCache.data = res.data;
    return { ok: true, data: res.data, timestamp: now, fromCache: false };
  }
  if (newsCache.data) {
    return { ok: true, data: newsCache.data, timestamp: newsCache.lastRequestAt, fromCache: true, offline: true };
  }
  return res;
}

async function getNews() {
  const url = `${NEWS_BASE_URL}/${encodeURIComponent(NEWS_COLLECTION_NAME)}?key=${NEWS_FIREBASE_CONFIG.apiKey}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { ok: false, error: `Network response not ok: ${response.status}` };
    }
    const json = await response.json();
    const documents = json.documents || [];
    const items = documents.map(doc => {
      const name = doc?.name || '';
      const docId = name.split('/').pop() || '';
      const fields = doc?.fields || {};
      const date = docId;
      return { docId, date, fields };
    });
    items.sort((a, b) => (_parseNewsDateToMs(a.date) ?? -Infinity) - (_parseNewsDateToMs(b.date) ?? -Infinity));
    return { ok: true, data: items.map(x => ({ docId: x.docId, date: x.date, fields: x.fields })) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function deleteRankingScores({ name }) {
  const safeName = String(name || '').trim().slice(0, 20);
  if (!safeName || safeName === '---') return { ok: false, error: 'invalid name' };
  const modes = ['normal','fast','swingcopter'];
  const results = {};
  for (const mode of modes) {
    try {
      const docId = mode === 'fast' ? 'Rapido' : (mode === 'swingcopter' ? 'Swingcopter' : 'Normal');
      let done = false;
      for (let attempt = 0; attempt < 5 && !done; attempt++) {
        const getUrl = `${BASE_URL}/${encodeURIComponent(COLLECTION_NAME)}/${docId}?key=${API_KEY}`;
        const getResp = await fetch(getUrl);
        let entries = [];
        let updateTime = null;
        if (getResp.ok) {
          const j = await getResponse.json();
          updateTime = j.updateTime;
          const f = j.fields || {};
          for (let i = 1; i <= 100; i++) {
            const sv = f[`puntuacion${i}`]?.integerValue;
            const nv = f[`nombre${i}`]?.stringValue;
            if (sv !== undefined && nv !== undefined) entries.push({ name: nv, score: parseInt(sv,10) });
          }
        } else if (getResp.status === 404) {
          entries = [];
        } else {
          continue;
        }
        const filtered = entries.filter(e => e.name !== safeName);
        if (filtered.length === entries.length) { results[mode] = 'not_found'; done = true; break; }
        while (filtered.length < 100) filtered.push({ name: '---', score: 0 });
        const fields = {};
        filtered.slice(0,100).forEach((e,idx)=>{ const j=idx+1; fields[`nombre${j}`]={stringValue:e.name}; fields[`puntuacion${j}`]={integerValue:String(e.score)}; });
        let writeUrl = `${BASE_URL}/${encodeURIComponent(COLLECTION_NAME)}/${docId}?key=${API_KEY}`;
        if (updateTime) writeUrl += `&currentDocument.updateTime=${encodeURIComponent(updateTime)}`;
        const wResp = await fetch(writeUrl, { method: 'PATCH', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ fields }) });
        if (wResp.ok) { leaderboardCache[mode].timestamp = 0; lastRefreshTimestamps[mode]=0; results[mode]='deleted'; done=true; break; }
        if (wResp.status !== 412 && wResp.status !== 409) {
          let msg='Error'; try{ const ej=await wResp.json(); msg=ej?.error?.message||msg;}catch(e){}
          results[mode]=`error ${wResp.status}: ${msg}`; done=true; break;
        }
        await new Promise(r=>setTimeout(r,70+Math.random()*100));
      }
      if (!results[mode]) results[mode]='error';
    } catch(e){ results[mode]=e.message; }
  }
  return { ok: true, results };
}

async function isScoreInTop100({ mode, score, limit }) {
  const result = await getLeaderboard({ mode, forceRefresh: false });
  if (!result.ok) return { ok: false };
  const lastScore = result.data.length < (limit || 100) ? 0 : result.data[result.data.length - 1].score;
  return { ok: true, inTop: score > lastScore };
}

const STATIC_CACHE = 'asteroid-rush-static-v1';
const PRECACHE_URLS = [
  'popup.html',
  'popup.css',
  'js/constants.js',
  'js/state.js',
  'js/dom.js',
  'js/canvas.js',
  'js/game.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS).catch(()=>{})).then(() => self.skipWaiting()).catch(()=> self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  if (!url.startsWith('http')) return;
  const isStatic = url.match(/\.(png|jpg|gif|mp3|ttf|css|js|json)$/i) || url.includes('Asteroid Rush Skins') || url.includes('sounds/');
  if (!isStatic) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(event.request, clone).catch(()=>{})).catch(()=>{});
        }
        return res;
      }).catch(() => cached);
    })
  );
});