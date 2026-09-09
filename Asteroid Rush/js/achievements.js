// ============================================================
// SISTEMA DE LOGROS
// ============================================================

const ACHIEVEMENTS_DATA = [
  { id: 'first_steps',       icon: '🚀', nameKey: 'ach_first_steps_name',       descKey: 'ach_first_steps_desc' },
  { id: 'bronze_medal',      icon: '🥉', nameKey: 'ach_bronze_name',             descKey: 'ach_bronze_desc' },
  { id: 'explorer',          icon: '🌌', nameKey: 'ach_explorer_name',           descKey: 'ach_explorer_desc' },
  { id: 'asteroid_buster',   icon: '💥', nameKey: 'ach_asteroid_buster_name',    descKey: 'ach_asteroid_buster_desc' },
  { id: 'silver_medal',      icon: '<span class="ach-skin-stack"><img src="images/Asteroid Rush Skins/M. 1 BLANCO.png" class="ach-skin-icon"><span class="ach-medal-overlay">🥈</span></span>', nameKey: 'ach_silver_name', descKey: 'ach_silver_desc' },
  { id: 'caza_recompensas',  icon: '<img src="images/Asteroid Rush Skins/M. 3 BLANCO.png" class="ach-skin-icon">', nameKey: 'ach_bounty_name', descKey: 'ach_bounty_desc' },
  { id: 'iron_pilot',        icon: '🛡️', nameKey: 'ach_iron_pilot_name',         descKey: 'ach_iron_pilot_desc' },
  { id: 'pacifist',          icon: '☮️', nameKey: 'ach_pacifist_name',           descKey: 'ach_pacifist_desc' },
  { id: 'fast_elite',        icon: '⚡', nameKey: 'ach_fast_elite_name',         descKey: 'ach_fast_elite_desc' },
  { id: 'zigzag_pro',        icon: '🔄', nameKey: 'ach_zigzag_pro_name',         descKey: 'ach_zigzag_pro_desc' },
  { id: 'gold_medal',        icon: '🥇', nameKey: 'ach_gold_name',               descKey: 'ach_gold_desc' },
  { id: 'destructor_estelar', icon: '<img src="images/Asteroid Rush Skins/M. 4 BLANCO.png" class="ach-skin-icon">', nameKey: 'ach_destructor_name', descKey: 'ach_destructor_desc' },
  { id: 'mars_hero',         icon: '🪐', nameKey: 'ach_mars_hero_name',          descKey: 'ach_mars_hero_desc' },
  { id: 'viajero',           icon: '<img src="images/Asteroid Rush Skins/M. 2 BLANCO.png" class="ach-skin-icon">', nameKey: 'ach_viajero_name',            descKey: 'ach_viajero_desc' },
  { id: 'galactic_legend',   icon: '🏆', nameKey: 'ach_galactic_legend_name',    descKey: 'ach_galactic_legend_desc' },
  { id: 'mars_trio',         icon: '🌠', nameKey: 'ach_mars_trio_name',          descKey: 'ach_mars_trio_desc' },
  { id: 'impossible_score',  icon: '💀', nameKey: 'ach_impossible_name',         descKey: 'ach_impossible_desc' }
];

function showAchievementToast(ach) {
  if (achievementQueue.some(a => a.id === ach.id)) return;
  achievementQueue.push(ach);
  if (!isShowingAchievement) processAchievementQueue();
}

function processAchievementQueue() {
  if (achievementQueue.length === 0) { isShowingAchievement = false; return; }
  isShowingAchievement = true;
  const ach   = achievementQueue.shift();
  const toast = document.getElementById('achievement-toast');
  if (!toast) { isShowingAchievement = false; return; }
  toast.innerHTML = `
    <div class="ach-icon">${ach.icon}</div>
    <div class="ach-info">
      <div class="ach-title">${i18n.t('btn_achievements', 'LOGRO')}</div>
      <div class="ach-name">${i18n.t(ach.nameKey)}</div>
    </div>`;
  toast.classList.add('active');
  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(processAchievementQueue, 600);
  }, 3500);
}

function checkAchievements() {
  // En tutorial no se conceden logros. En modo BETA tampoco.
  if (typeof tutorialGameActive !== 'undefined' && tutorialGameActive) return;
  if (betaModeActive) return;
  // FIX: no dar logros antes de aceptar términos (bug reportado)
  try { if (localStorage.getItem('dodgeLegalAccepted') !== 'true') return; } catch(e) { return; }
  // Recargar desde localStorage por si la variable en memoria se perdió (ej. recarga de página)
  try { const storedAch = localStorage.getItem("dodgeAchievements"); if (storedAch) unlockedAchievements = JSON.parse(storedAch); } catch(e) {}
  const newUnlocks = [];
  const curNormal = (!fastModeActive && !swingcopterModeActive) ? Math.max(score, bestScoreNormal) : bestScoreNormal;
  const curFast   = fastModeActive   ? Math.max(score, bestScoreFast)   : bestScoreFast;
  const curSwing  = swingcopterModeActive ? Math.max(score, bestScoreSwingcopter) : bestScoreSwingcopter;
  const maxBest   = Math.max(curNormal, curFast, curSwing);

  const check = (id, condition) => {
    if (!unlockedAchievements.includes(id) && condition) { unlockedAchievements.push(id); newUnlocks.push(id); }
  };

  check('first_steps',     gameDuration > 500 || score > 0);
  check('explorer',        curNormal >= 5000 && curFast >= 5000 && curSwing >= 5000);
  check('bronze_medal',    maxBest >= 10000);
  check('silver_medal',    maxBest >= 100000);
  check('gold_medal',      maxBest >= 150000);
  check('galactic_legend', maxBest >= 500000);
  check('impossible_score',maxBest >= 1000000);
  check('mars_hero',       marsSequenceTriggered);
  check('mars_trio',       (()=>{ try{ return ['normal','fast','swingcopter'].every(m=> localStorage.getItem('dodgeMarsReached_'+m)==='true'); }catch(e){return false;} })());
  check('iron_pilot',      level >= 25 && sessionPowerupsCollected === 0);
  check('asteroid_buster', sessionAsteroidsDestroyed >= 50);
  check('pacifist',        level >= 25 && sessionLaserFiredCount === 0);
  check('fast_elite',      fastModeActive && score >= 100000);
  check('zigzag_pro',      swingcopterModeActive && score >= 100000);

  let _totTime = 0; try { const v = parseInt(localStorage.getItem('dodgeTotalGameTime') || '0', 10); _totTime = isNaN(v)?0:v; } catch(e) {}
  let _totAst = 0; try { const v = parseInt(localStorage.getItem('dodgeTotalAsteroids') || '0', 10); _totAst = isNaN(v)?0:v; } catch(e) {}
  check('viajero',           (_totTime + gameDuration) >= 7200000);
  check('caza_recompensas',  unlockedAchievements.length >= 5);
  check('destructor_estelar', (_totAst + sessionAsteroidsDestroyed) >= 250);

  if (newUnlocks.length > 0) {
    try { localStorage.setItem("dodgeAchievements", JSON.stringify(unlockedAchievements)); } catch(e) {}
    newUnlocks.forEach(id => {
      showAchievementToast(ACHIEVEMENTS_DATA.find(a => a.id === id));
      if (id === 'silver_medal')       unlockSkin('montaje_1_BLANCO');
      if (id === 'viajero')            unlockSkin('montaje_2_BLANCO');
      if (id === 'caza_recompensas')   unlockSkin('montaje_3_BLANCO');
      if (id === 'destructor_estelar') unlockSkin('montaje_4_BLANCO');
      if (id === 'mars_trio')          unlockSkin('llavero_3');
    });
    playLevelUp();
  }
}

function renderAchievements() {
  try { const storedAch = localStorage.getItem("dodgeAchievements"); if (storedAch) unlockedAchievements = JSON.parse(storedAch); } catch(e) {}
  achievementsListEl.innerHTML = "";
  try { achievementsListEl.scrollTop = 0; } catch (e) {}

  ACHIEVEMENTS_DATA.forEach(ach => {
    const isUnlocked = unlockedAchievements.includes(ach.id);
    const item = document.createElement("div");
    item.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`;
    item.innerHTML = `
      <div class="ach-icon">${ach.icon}</div>
      <div class="ach-info">
        <div class="ach-name">${i18n.t(ach.nameKey)}</div>
        <div class="ach-desc">${i18n.t(ach.descKey)}</div>
      </div>
      <div class="ach-status">${isUnlocked ? '<span style="color:#4caf50;">✔</span>' : '<span>🔒</span>'}</div>`;
    achievementsListEl.appendChild(item);
  });
}

// ============================================================
// EVENTOS
// ============================================================

achievementsBtn.addEventListener("click", () => {
  if (!canInteract(achievementsBtn)) return;
  playMenuClickSound();
  if (gameRunning && !gamePaused) togglePause();
  closeAllModals();
  renderAchievements();
  achievementsOverlay.classList.remove("hidden");
  // Forzar que el panel se vea siempre desde arriba.
  requestAnimationFrame(() => {
    try {
      if (achievementsOverlay) achievementsOverlay.scrollTop = 0;
      if (achievementsListEl) achievementsListEl.scrollTop = 0;
    } catch (e) {}
  });
});


achievementsCloseBtn.addEventListener("click", () => {
  achievementsOverlay.classList.add("hidden");
  try {
    if (achievementsOverlay) achievementsOverlay.scrollTop = 0;
    if (achievementsListEl) achievementsListEl.scrollTop = 0;
  } catch (e) {}
});

