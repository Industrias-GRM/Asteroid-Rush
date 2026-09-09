// ============================================================
// PUNTUACIÓN
// ============================================================

function _afterScoreChanged() {
  const currentIntScore = Math.floor(score);
  if (currentIntScore !== lastIntScore) {
    if (Math.floor(lastIntScore / 1000) < Math.floor(currentIntScore / 1000)) {
      if (currentIntScore > 0) { playScoreUp(); checkSkinUnlocksFromScore(); }
    }
    checkAchievements();
    lastIntScore = currentIntScore;
    updateBestScoreUI();
  }
}

function addScorePoints(points) {
  if (!points) return;
  score += points;
  _afterScoreChanged();
}

// ============================================================
// TUTORIAL PRIMERA PARTIDA - guiado paso a paso, RNG sembrado, no guarda
// ============================================================
function ensureTutorialHintEl() {
  let el = document.getElementById('tutorial-game-hint');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'tutorial-game-hint';
  el.style.cssText = 'position:absolute;top:92px;left:50%;transform:translateX(-50%);background:rgba(10,20,40,0.92);color:#fff;padding:10px 16px;border-radius:12px;font-size:15px;font-weight:700;z-index:40;max-width:88%;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.45);border:1px solid rgba(0,188,212,0.35);pointer-events:none;opacity:0;transition:opacity 0.3s;display:none;line-height:1.3;';
  const stage = document.getElementById('stage') || document.body;
  stage.appendChild(el);
  return el;
}
function showTutorialHint(keyOrText, ms = 3500, opts = {}) {
  const el = ensureTutorialHintEl();
  let text = keyOrText;
  try { if (typeof i18n !== 'undefined' && i18n.t) { const tr = i18n.t(keyOrText); if (tr && tr !== keyOrText) text = tr; } } catch(e) {}
  if (opts.arrow) {
    const rot = opts.rotate ? `transform:rotate(${opts.rotate}deg);` : '';
    const arrowHtml = `<img src="${opts.arrow}" style="width:38px;height:38px;${rot}animation:tutArrowPulse 0.8s ease-in-out infinite;vertical-align:middle;margin-left:8px;filter:drop-shadow(0 0 6px rgba(0,188,212,0.9));">`;
    el.innerHTML = `<span>${text}</span>${arrowHtml}`;
    if (!document.getElementById('tutArrowStyle')) {
      const st = document.createElement('style');
      st.id = 'tutArrowStyle';
      st.textContent = '@keyframes tutArrowPulse{0%{transform:scale(1)}50%{transform:scale(1.25)}100%{transform:scale(1)}}';
      document.head.appendChild(st);
    }
  } else {
    el.textContent = text;
  }
  el.style.display = 'block';
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  if (_tutorialHintTimeout) clearTimeout(_tutorialHintTimeout);
  if (ms !== Infinity) _tutorialHintTimeout = setTimeout(hideTutorialHint, ms);
}
function hideTutorialHint() {
  const el = document.getElementById('tutorial-game-hint');
  if (!el) return;
  el.style.opacity = '0';
  setTimeout(() => { if (el) el.style.display = 'none'; }, 300);
  if (_tutorialHintTimeout) { clearTimeout(_tutorialHintTimeout); _tutorialHintTimeout = null; }
}
function tutorialSpawnGuidedMeteor() {
  const size = 36;
  const x = Math.max(0, Math.min(GAME_WIDTH - size, playerX + PLAYER_WIDTH/2 - size/2));
  const y = -size - 20;
  const speed = BASE_METEOR_SPEED * 0.55;
  meteors.push({ x, y, size, speed, speedX: 0, crater: 1, trailAngle: 0, sprite: null });
}
function tutorialSpawnFastThenSlow() {
  const size = 38;
  const x = Math.max(0, Math.min(GAME_WIDTH - size, playerX + PLAYER_WIDTH/2 - size/2));
  const y = -size - 20;
  const speed = BASE_METEOR_SPEED * 1.9;
  meteors.push({ x, y, size, speed, speedX: 0, crater: 1, trailAngle: 0, sprite: null });
  setTimeout(() => {
    if (tutorialGameActive && (tutorialGameStep===0 || tutorialGameStep===1)) {
      slowActive = true; slowElapsedTime = 0; slowSkipIntro = true;
    }
  }, 500);
}
function tutorialSpawnMeteorOnPlayer() {
  const size = 34;
  const x = Math.max(0, Math.min(GAME_WIDTH - size, playerX + PLAYER_WIDTH/2 - size/2));
  meteors.push({ x, y: -size-30, size, speed: BASE_METEOR_SPEED * 0.7, speedX: 0, crater: 2, trailAngle: 0, sprite: null });
}
function tutorialSpawnPowerupOpposite(type) {
  // Limpiar powerups anteriores del tutorial para evitar acumulación (muchos powerups)
  try { powerups.forEach(p=>{ if(p.el) p.el.remove(); }); } catch(e) {}
  powerups = powerups.filter(p=> !p.isTutorial);
  const isLeft = playerX < GAME_WIDTH/2;
  const px = isLeft ? 280 : 120;
  const el = document.createElement('div');
  el.classList.add('powerup');
  el.dataset.type = type;
  const size = POWERUP_SIZE;
  el.style.cssText = `width:${size}px;height:${size}px;left:${px}px;top:${-size-10}px;`;
  stageEl.appendChild(el);
  powerups.push({ x: px, y: -size - 10, size, speed: BASE_METEOR_SPEED * 0.6, el, type, isTutorial: true });
  if (type === 'shield') {
    setTimeout(() => { if (tutorialGameActive) tutorialSpawnMeteorOnPlayer(); }, 300);
  } else {
    const delays = [3000, 3800, 4600];
    delays.forEach((d,i)=>{
      setTimeout(() => {
        if (!tutorialGameActive) return;
        const size2 = 32 + tutorialRandom()*18;
        const x2 = tutorialRandom() * (GAME_WIDTH - size2);
        const speed2 = BASE_METEOR_SPEED * (0.9 + tutorialRandom()*0.4);
        meteors.push({ x: x2, y: -size2-20, size: size2, speed: speed2, speedX: 0, crater: 1+Math.floor(tutorialRandom()*3), trailAngle: 0, sprite: null });
      }, d + tutorialRandom()*400);
    });
    setTimeout(() => {
      if (!tutorialGameActive) return;
      const size2 = 32 + tutorialRandom()*18;
      const x2 = tutorialRandom() * (GAME_WIDTH - size2);
      const speed2 = BASE_METEOR_SPEED * (0.9 + tutorialRandom()*0.4);
      meteors.push({ x: x2, y: -size2-20, size: size2, speed: speed2, speedX: 0, crater: 1+Math.floor(tutorialRandom()*3), trailAngle: 0, sprite: null });
    }, 2320);
  }
}
function tutorialMeteorsGone() {
  return meteors.length===0 || meteors.every(m=> m.y > GAME_HEIGHT + m.size);
}
function setTutorialPauseButton() {
  if (!pauseBtn) return;
  pauseBtn.textContent = i18n.t('tut_pause_finish', 'FINALIZAR');
  pauseBtn.style.background = 'rgba(255,64,129,0.85)';
  pauseBtn.style.borderColor = '#ff4081';
  pauseBtn.style.color = '#fff';
  pauseBtn.title = i18n.t('tut_pause_finish_title', 'Finalizar tutorial');
  pauseBtn.dataset.tutorial = 'true';
}
function restorePauseButton() {
  if (!pauseBtn) return;
  pauseBtn.textContent = i18n.t('btn_pause_label', '⏸ PAUSA');
  pauseBtn.style.background = '';
  pauseBtn.style.borderColor = '';
  pauseBtn.style.color = '';
  pauseBtn.title = '';
  delete pauseBtn.dataset.tutorial;
}
function updateTutorialSteps(timestamp) {
  if (!tutorialGameActive) return;
  if (_tutorialAdvancePending) return;
  const now = timestamp;
  switch (tutorialGameStep) {
    case 0: {
      if (tutorialStepStartTime === 0) {
        tutorialStepStartTime = now;
        setTutorialPauseButton();
        playerX = (GAME_WIDTH - PLAYER_WIDTH)/2;
        showTutorialHint('tut_hint_meteor', Infinity);
        tutorialSpawnFastThenSlow();
        setTimeout(() => {
          if (tutorialGameActive && tutorialGameStep===0) {
            showTutorialHint('tut_hint_dodge_right', Infinity, { arrow: 'images/Derecha.png' });
          }
        }, 550);
      }
      if (playerX > (GAME_WIDTH - PLAYER_WIDTH)/2 + 30) {
        if (!_tutorialAdvancePending) {
          _tutorialAdvancePending = true;
          setTimeout(()=>{ if(!tutorialGameActive) return; hideTutorialHint(); if(slowActive){ slowSkipIntro=false; slowElapsedTime = SLOW_DURATION * 0.75; } }, 500);
          const wait = setInterval(()=>{
            if (!tutorialGameActive) { clearInterval(wait); return; }
            if (tutorialMeteorsGone()) { clearInterval(wait); FxCanvas.wipe(); tutorialGameStep=1; tutorialStepStartTime=0; _tutorialAdvancePending=false; }
          }, 100);
        }
      } else if (now - tutorialStepStartTime > 7000 && !_tutorialAdvancePending) {
        _tutorialAdvancePending = true;
        const wait2 = setInterval(()=>{
          if (!tutorialGameActive) { clearInterval(wait2); return; }
          if (tutorialMeteorsGone()) { clearInterval(wait2); hideTutorialHint(); if(slowActive){ slowSkipIntro=false; slowElapsedTime = SLOW_DURATION * 0.75; } FxCanvas.wipe(); tutorialGameStep=1; tutorialStepStartTime=0; _tutorialAdvancePending=false; }
        }, 100);
      }
      break;
    }
    case 1: {
      if (tutorialStepStartTime === 0) {
        tutorialStepStartTime = now;
        showTutorialHint('tut_hint_another', Infinity);
        tutorialSpawnFastThenSlow();
        setTimeout(() => {
          if (tutorialGameActive && tutorialGameStep===1) {
            showTutorialHint('tut_hint_dodge_left', Infinity, { arrow: 'images/Izquierda.png' });
          }
        }, 550);
      }
      if (playerX < (GAME_WIDTH - PLAYER_WIDTH)/2 - 30) {
        if (!_tutorialAdvancePending) {
          _tutorialAdvancePending = true;
          setTimeout(()=>{ if(!tutorialGameActive) return; hideTutorialHint(); if(slowActive){ slowSkipIntro=false; slowElapsedTime = SLOW_DURATION * 0.75; } }, 500);
          const wait = setInterval(()=>{
            if (!tutorialGameActive) { clearInterval(wait); return; }
            if (tutorialMeteorsGone()) { clearInterval(wait); FxCanvas.wipe(); tutorialGameStep=2; tutorialStepStartTime=now; _tutorialAdvancePending=false; }
          }, 100);
        }
      } else if (now - tutorialStepStartTime > 7000 && !_tutorialAdvancePending) {
        _tutorialAdvancePending = true;
        const wait2 = setInterval(()=>{
          if (!tutorialGameActive) { clearInterval(wait2); return; }
          if (tutorialMeteorsGone()) { clearInterval(wait2); hideTutorialHint(); if(slowActive){ slowSkipIntro=false; slowElapsedTime = SLOW_DURATION * 0.75; } FxCanvas.wipe(); tutorialGameStep=2; tutorialStepStartTime=now; _tutorialAdvancePending=false; }
        }, 100);
      }
      break;
    }
    case 2: {
      if (tutorialStepStartTime === 0) {
        tutorialStepStartTime = now;
        tutorialSmallLaserCount = 0;
        showTutorialHint('tut_hint_good_controls', 1800);
      } else if (now - tutorialStepStartTime > 1900 && now - tutorialStepStartTime < 2100) {
        showTutorialHint('tut_hint_try_laser', Infinity, { arrow: 'images/Disparar.png', rotate: 90 });
      } else if (now - tutorialStepStartTime > 2200) {
        if (keys.up) {
          _tutorialAdvancePending = true;
          setTimeout(() => {
            hideTutorialHint();
            const wait = setInterval(()=>{
              if (tutorialMeteorsGone()) { clearInterval(wait); tutorialGameStep=3; tutorialStepStartTime=0; _tutorialAdvancePending=false; }
            }, 100);
          }, 500);
        } else if (now - tutorialStepStartTime > 6500 && !_tutorialAdvancePending) {
          _tutorialAdvancePending = true;
          setTimeout(() => {
            hideTutorialHint();
            const wait2 = setInterval(()=>{
              if (tutorialMeteorsGone()) { clearInterval(wait2); tutorialGameStep=3; tutorialStepStartTime=0; _tutorialAdvancePending=false; }
            }, 100);
          }, 500);
        }
      }
      break;
    }
    case 3: {
      if (tutorialStepStartTime === 0) {
        tutorialStepStartTime = now;
        showTutorialHint('tut_hint_shield_intro', 2500);
        tutorialSpawnPowerupOpposite('shield');
      }
      if (shieldActive && !_tutorialAdvancePending) {
        _tutorialAdvancePending = true;
        setTimeout(() => { if(!tutorialGameActive) return; hideTutorialHint(); showTutorialHint('tut_hint_shield_active', 2500); }, 500);
        setTimeout(() => { if(!tutorialGameActive) return; tutorialGameStep=4; tutorialStepStartTime=0; _tutorialAdvancePending=false; }, 1000);
      } else if (powerups.length===0 && !shieldActive && !_tutorialAdvancePending) {
        _tutorialAdvancePending = true;
        setTimeout(() => { if(!tutorialGameActive) return; hideTutorialHint(); tutorialGameStep=4; tutorialStepStartTime=0; _tutorialAdvancePending=false; }, 500);
      }
      break;
    }
    case 4: {
      if (tutorialStepStartTime === 0) {
        tutorialStepStartTime = now;
        showTutorialHint('tut_hint_laser_intro', 2500);
        tutorialSpawnPowerupOpposite('laser');
      }
      if (laserActive && !_tutorialAdvancePending) {
        _tutorialAdvancePending = true;
        setTimeout(() => { if(!tutorialGameActive) return; hideTutorialHint(); showTutorialHint('tut_hint_laser_ready', 2500); }, 500);
        setTimeout(()=>{ if(tutorialGameActive) tutorialSpawnGuidedMeteor(); }, 800);
        setTimeout(()=>{ if(tutorialGameActive) tutorialSpawnGuidedMeteor(); }, 1600);
        setTimeout(()=>{ if(tutorialGameActive) tutorialSpawnGuidedMeteor(); }, 2400);
        setTimeout(() => { if(!tutorialGameActive) return; tutorialGameStep=5; tutorialStepStartTime=0; _tutorialAdvancePending=false; }, 1000);
      } else if (powerups.length===0 && !laserActive && !_tutorialAdvancePending) {
        _tutorialAdvancePending = true;
        setTimeout(() => { if(!tutorialGameActive) return; hideTutorialHint(); tutorialGameStep=5; tutorialStepStartTime=0; _tutorialAdvancePending=false; }, 500);
      }
      break;
    }
    case 5: {
      if (tutorialStepStartTime === 0) {
        tutorialStepStartTime = now;
        tutorialSlowCollected = false;
        showTutorialHint('tut_hint_slow_intro', 2500);
        tutorialSpawnPowerupOpposite('slow');
      }
      if (tutorialSlowCollected && !_tutorialAdvancePending) {
        _tutorialAdvancePending = true;
        setTimeout(() => { if(!tutorialGameActive) return; hideTutorialHint(); }, 500);
        slowActive = true; slowElapsedTime = 0; slowSkipIntro = false;
        setTimeout(() => {
          const wait = setInterval(()=>{
            if (!tutorialGameActive) { clearInterval(wait); return; }
            if (tutorialMeteorsGone()) { clearInterval(wait); slowActive=false; tutorialGameStep=6; tutorialPracticeStart=0; tutorialStepStartTime=0; _tutorialAdvancePending=false; }
          }, 100);
        }, 800);
      } else if (powerups.length===0 && !tutorialSlowCollected && !_tutorialAdvancePending) {
        // Si no lo coges no se bloquea — avanza igual (como escudo/láser)
        _tutorialAdvancePending = true;
        setTimeout(() => { if(!tutorialGameActive) return; hideTutorialHint(); tutorialGameStep=6; tutorialPracticeStart=0; tutorialStepStartTime=0; _tutorialAdvancePending=false; }, 500);
      }
      break;
    }
    case 6: {
      if (tutorialStepStartTime === 0) tutorialStepStartTime = now;
      if (tutorialPracticeStart===0) {
        tutorialPracticeStart=now;
        showTutorialHint('tut_hint_well_done', 3000);
      }
      if (score >= 15000 && !_tutorialAdvancePending) {
        _tutorialAdvancePending = true;
        try { localStorage.setItem('dodgeFirstGameDone', 'true'); } catch(e) {}
        try { localStorage.setItem('dodgeTutorialSeen', 'true'); } catch(e) {} // extra persist
  try { localStorage.setItem('dodgeFirstGameDone', 'true'); } catch(e) {}
        setTimeout(() => { tutorialGameStep=7; _tutorialAdvancePending=false; }, 500);
      }
      break;
    }
    case 7: {
      completeTutorialGame();
      break;
    }
  }
}
function completeTutorialGame() {
  if (!tutorialGameActive) return;
  tutorialGameActive = false;
  hideTutorialHint();
  try { localStorage.setItem('dodgeFirstGameDone', 'true'); } catch(e) {}
  try { localStorage.setItem('dodgeTutorialSeen', 'true'); } catch(e) {} // extra persist
  try { localStorage.setItem('dodgeFirstGameDone', 'true'); } catch(e) {}
  score = 15000; lastIntScore = 15000; updateProgressBar(100, 16);
  updateBestScoreUI();
  stopBackgroundMusic(); stopSlowSoundEffect();
  clearCutsceneTimeouts();
  try {
    meteors.forEach((m, index) => {
      const tId = setTimeout(() => {
        createExplosion(m.x, m.y, m.size); try{ playHit(); }catch(e){}
        const idx = meteors.indexOf(m);
        if (idx !== -1) meteors.splice(idx, 1);
      }, index * 80);
      cutsceneTimeouts.push(tId);
    });
  } catch(e) {}
  powerups.forEach(p=>{try{p.el.remove();}catch(e){}}); powerups=[]; projectiles=[];
  isDying = false;
  stageEl.classList.remove('playing');
  slowActive = false; shieldActive = false; laserActive = false;
  if (laserBeamEl) laserBeamEl.classList.remove('active');
  cutsceneActive = true; activeCutsceneName = 'marsTakeoff';
  if (skipBtn) skipBtn.classList.remove('hidden');
  const flame = playerEl.querySelector('.flame');
  if (flame) flame.style.transform = "scale(3.5) translateY(8px)";
  playerEl.style.transition = "none";
  playerEl.style.transform = `translate3d(${playerX}px, 0, 0)`;
  void playerEl.offsetWidth;
  setTimeout(()=>{
    // Empieza lenta y acaba rápida (ease-in pronunciado)
    playerEl.style.transition = "transform 1.4s cubic-bezier(0.62, 0.05, 0.91, 0.42)";
    requestAnimationFrame(()=>{ playerEl.style.transform = `translate3d(${playerX}px, -800px, 0)`; });
  }, 400);
  triggerScreenShake();
  setTimeout(()=> triggerScreenShake(), 250);
  const _finalDelay = Math.max(2100, meteors.length * 80 + 1300);
  cutsceneTimeouts.push(setTimeout(() => {
    // Forzar panel visible incluso si hay error previo
    try {
      const ovDbg = document.getElementById('tutorial-complete-overlay');
      if (ovDbg) { ovDbg.classList.remove('hidden'); ovDbg.style.display = 'flex'; ovDbg.style.opacity = '1'; ovDbg.style.zIndex = '6000'; }
    } catch(e) {}
    gamePaused = false;
    cutsceneActive = false; activeCutsceneName = null;
    gameRunning = false;
    if (flame) flame.style.transform = "";
    playerEl.classList.remove("takeoff-anim");
    restorePauseButton();
    pauseBtn.style.display = 'none'; muteBtn.style.display = 'none';
    if (skipBtn) skipBtn.classList.add('hidden');
    // No wipe aquí — deja que la explosión se vea detrás del overlay; se limpia al cerrar
    // FxCanvas.wipe();
    playerEl.style.transition = "";
    playerEl.style.display = 'none';
    playerEl.classList.remove('fast-visual');
    score = 0; lastIntScore = 0; updateProgressBar(0,1);
    updateBestScoreUI(); updateLivesUI(); updateDustUI();
    const ov = document.getElementById('tutorial-complete-overlay');
    if (ov) {
      ov.classList.remove('hidden');
      ov.style.display = 'flex';
      ov.style.opacity = '1';
      ov.style.visibility = 'visible';
      ov.style.zIndex = '6000';
      const ic = document.getElementById('tutorial-complete-icon'); if (ic) ic.textContent = '🎓';
      const ti = document.getElementById('tutorial-complete-title'); if (ti) ti.textContent = i18n.t('tut_complete_title', '¡Tutorial completo!');
      const de = document.getElementById('tutorial-complete-desc'); if (de) de.innerHTML = i18n.t('tut_complete_desc', 'Has aprendido los controles básicos.<br>¡Ahora el sistema solar es tuyo!');
      const rb = document.getElementById('btn-tutorial-complete-restart'); if (rb) rb.classList.add('hidden');
      ov.classList.remove('hidden');
      // Asegurar overlay visible y mensaje correcto
      ov.style.display = 'flex';
      const btn = document.getElementById('btn-tutorial-complete-continue');
      if (btn) { try { btn.textContent = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t('btn_continue', 'Continuar') : 'Continuar'; } catch(e) { btn.textContent = 'Continuar'; } btn.onclick = () => {
        ov.classList.add('hidden');
        ov.style.display = '';
        FxCanvas.wipe();
        setOverlayMode('menu'); overlayEl.scrollTop = 0;
        document.getElementById('gameover-overlay').classList.add('hidden');
        if (typeof updateSlotInfoPanel === 'function') updateSlotInfoPanel();
        try {
          let pending = null;
          try { pending = JSON.parse(localStorage.getItem('dodgeRewardPending')); } catch(e) {}
          if (!pending && !localStorage.getItem('dodgeNickNumber') && !localStorage.getItem('dodgeUsername')) {
            pending = { amount: 1000, hasBeta: false };
          }
          if (pending && typeof _dust !== 'undefined') {
            _dust += pending.amount;
            try { saveEconomy(); updateDustUI(); } catch(e) {}
            localStorage.removeItem('dodgeRewardPending');
            const rov = document.getElementById('reward-overlay');
            const desc = document.getElementById('reward-desc');
            if (rov && desc) {
              const fallback = '¡Has recibido ' + pending.amount.toLocaleString() + ' 💎 de bienvenida!';
              try { desc.textContent = i18n.t(pending.hasBeta ? 'reward_beta_desc' : 'reward_welcome_desc', fallback).replace('{amount}', pending.amount.toLocaleString()); } catch(e) { desc.textContent = fallback; }
              rov.classList.remove('hidden');
              const b2 = document.getElementById('reward-collect-btn');
              if (b2) b2.onclick = () => {
                rov.classList.add('hidden');
                try { playLevelUp(); } catch(e) {}
                try { checkOldSkinsReward(); showSkinRewardScreen(); } catch(e) {}
              };
              return;
            }
          }
          try { checkOldSkinsReward(); showSkinRewardScreen(); } catch(e) {}
        } catch(e) {}
       };
      }
      } else {
        setOverlayMode('menu');
      }
   }, _finalDelay));
}

function addScoreFromTime(deltaMs) {
  if (!deltaMs) return;
  score += deltaMs * SCORE_RATE;
  _afterScoreChanged();
}

// ============================================================
// OVERLAY MODE SWITCHING
// ============================================================

function setOverlayMode(mode) {
  overlayEl.classList.remove("mode-menu", "mode-pause", "mode-gameover");
  if (mode) overlayEl.classList.add("mode-" + mode);
  overlayEl.classList.remove("hidden");
}

function hideOverlay() {
  overlayEl.classList.add("hidden");
}

// ============================================================
// VISIBILIDAD DE ENTIDADES (PAUSA)
// ============================================================

function setGameElementsVisibility(visible) {
  const val = visible ? "" : "none";
  // Meteoros, proyectiles y explosiones viven ahora en el canvas: al pausar
  // simplemente lo limpiamos; al reanudar se redibuja en el siguiente frame.
  powerups.forEach(p => { if (p.el) p.el.style.display = val; });
  document.querySelectorAll(".floating-text").forEach(el => el.style.display = val);
  if (!visible) FxCanvas.wipe();
  if (playerEl) playerEl.style.display = visible ? "block" : "none";
  if (laserBeamEl) laserBeamEl.style.display = val;
}

// ============================================================
// FINALIZAR GAME OVER
// ============================================================

function finalizeGameOver() {
  gameRunning = false; isDying = false;
  stageEl.classList.remove("playing");
  updateTouchControlsVisibility();

  // Las animaciones de estadísticas se gestionan ahora en runRankingAnimation en menus.js
  // para evitar conflictos y asegurar que se ejecuten en el momento correcto.

  meteors = [];
  powerups.forEach(p => { try { if (p.el) p.el.remove(); } catch (e) { } }); powerups = [];
  projectiles = [];
  FxCanvas.wipe();
  playerEl.classList.remove("landing-sequence", "landing-anim", "takeoff-anim");
  playerEl.style.transition = "";
  if (marsHorizonEl) { marsHorizonEl.style.opacity = "0"; marsHorizonEl.style.transform = ""; }
  if (containerEl) containerEl.style.background = "";
  if (marsOverlayEl) marsOverlayEl.classList.add("hidden");
  const flame = playerEl.querySelector('.flame');
    const _fl2 = playerEl.querySelector('.flame'); if (_fl2) _fl2.style.transform = "";
  playerEl.style.display = "block";
  pauseBtn.style.display = "none"; muteBtn.style.display = "none";
  if (skipBtn) skipBtn.classList.add("hidden");

  let mode = "normal";
  if (fastModeActive) mode = "fast";
  else if (swingcopterModeActive) mode = "swingcopter";
  if (localStorage.getItem("dodgeFirstGameDone") !== "true") localStorage.setItem("dodgeFirstGameDone", "true");

  const intScore = Math.floor(score);
  pendingScore = intScore; pendingMode = mode; pendingDuration = gameDuration;

  setOverlayMode("menu"); overlayEl.scrollTop = 0;

  // Identidad del piloto (garantía: asignar si se llega aquí sin panel)
  let storedUsername = (typeof getPlayerNickname === 'function') ? getPlayerNickname() : localStorage.getItem('dodgeUsername');
  if (!storedUsername && typeof assignPilotNumber === 'function') {
    assignPilotNumber();
    storedUsername = (typeof getPlayerNickname === 'function') ? getPlayerNickname() : '';
  }

  if (storedUsername) {
    const submitPromise = trySubmitScoreToLeaderboard(mode, intScore, storedUsername, gameDuration);
    runRankingAnimation(intScore, submitPromise);
  } else {
    // Última red: nick efímero sin persistir — solo números, el prefijo se añade al mostrar según idioma
    const fallbackNum = String(Math.floor(1000 + Math.random() * 9000));
    const submitPromise = trySubmitScoreToLeaderboard(mode, intScore, fallbackNum, gameDuration);
    runRankingAnimation(intScore, submitPromise);
  }
}

// ============================================================
// GAME OVER
// ============================================================

function gameOver(options = {}) {
  // Si había algún panel de info abierto, cerrarlo antes de la animación para que no falle
  try { if (typeof closeAllModals === 'function') closeAllModals(); } catch(e) {}
  // Asegurar que no quede pausa bloqueando la animación
  try { gamePaused = false; } catch(e) {}
  if (typeof tutorialGameActive !== 'undefined' && tutorialGameActive) {
    tutorialGameActive = false;
    _tutorialAdvancePending = false;
    hideTutorialHint();
    slowActive=false; slowElapsedTime=0; slowSkipIntro=false;
    isDying = true; gamePaused = false;
    laserActive = false;
    if (laserBeamEl) laserBeamEl.classList.remove("active");
    stopBackgroundMusic(); stopSlowSoundEffect();
    clearCutsceneTimeouts();
    try { playGameOver(); } catch(e) {}
    const cx2 = playerX + PLAYER_WIDTH/2, cy2 = 480 - 30 - PLAYER_HEIGHT/2;
    // FIX tutorial muerte: explosión nave + resto de meteoros (sin duplicar el que ya explotó en la colisión)
    try { createExplosion(cx2 - 35, cy2 - 35, 70); } catch(e) {}
    try { createShipDebris(cx2, cy2); } catch(e) {}
    triggerScreenShake();
    try { playHit(); } catch(e) {}
    // Mitar meteoros restantes con delay capturando coords, excluyendo el que colisionó (ya explotó)
    const _filteredMeteors = meteors.filter(m => {
      const mx = m.x + m.size/2, my = m.y + m.size/2;
      const dx = mx - cx2, dy = my - cy2;
      return Math.hypot(dx, dy) > 60;
    });
    try {
      _filteredMeteors.forEach((m, index) => {
        const mx = m.x, my = m.y, ms = m.size;
        const tId = setTimeout(() => { try{ createExplosion(mx, my, ms); }catch(e){} }, 70 + index * 70);
        cutsceneTimeouts.push(tId);
      });
    } catch(e) {}
    playerEl.style.display = 'none';
    meteors.length = 0; powerups.forEach(p=>{try{p.el.remove();}catch(e){}}); powerups.length = 0; projectiles.length = 0;
    lastSpawnTime = performance.now() + 999999;
    const _deathDelay = Math.max(1300, _filteredMeteors.length * 70 + 900);
    cutsceneTimeouts.push(setTimeout(() => {
      slowActive=false; shieldActive=false; laserActive=false;
      restorePauseButton();
      stageEl.classList.remove('playing');
      pauseBtn.style.display='none'; muteBtn.style.display='none'; if(skipBtn) skipBtn.classList.add('hidden');
      // Mantener nave oculta y partículas visibles detrás del panel (wipe solo al cerrar/reiniciar)
      playerEl.style.display = 'none';
      score=0; lastIntScore=0; updateProgressBar(0,1);
      updateBestScoreUI(); updateLivesUI(); updateDustUI();
      const ov2 = document.getElementById('tutorial-complete-overlay');
      if (ov2) {
        const ic = document.getElementById('tutorial-complete-icon'); if (ic) ic.textContent = '💥';
        const ti = document.getElementById('tutorial-complete-title'); if (ti) ti.textContent = i18n.t('tut_hit_title', '¡Te han dado!');
        const de = document.getElementById('tutorial-complete-desc'); if (de) de.innerHTML = i18n.t('tut_hit_desc', 'Has chocado durante el tutorial.<br>¿Quieres intentarlo de nuevo?');
        const br = document.getElementById('btn-tutorial-complete-restart'); if (br) br.classList.remove('hidden');
        ov2.classList.remove('hidden'); ov2.style.display = 'flex'; ov2.style.opacity = '1'; ov2.style.visibility = 'visible'; ov2.style.zIndex = '6000'; ov2.style.display = 'flex';
        const btnCont = document.getElementById('btn-tutorial-complete-continue');
        if (btnCont) {
          btnCont.textContent = i18n.t('tut_continue_anyway', 'Continuar de todos modos');
          btnCont.onclick = () => {
            ov2.classList.add('hidden');
            isDying=false; gameRunning=false; FxCanvas.wipe();
            try { localStorage.setItem('dodgeFirstGameDone', 'true'); } catch(e) {}
            try { localStorage.setItem('dodgeTutorialSeen', 'true'); } catch(e) {} // extra persist
  try { localStorage.setItem('dodgeFirstGameDone', 'true'); } catch(e) {}
            setOverlayMode('menu'); document.getElementById('gameover-overlay').classList.add('hidden');
            try{
              let pending=null; try{pending=JSON.parse(localStorage.getItem('dodgeRewardPending'));}catch(e){}
              if(pending){ _dust+=pending.amount; try{saveEconomy();updateDustUI();}catch(e){} localStorage.removeItem('dodgeRewardPending'); const ov=document.getElementById('reward-overlay'); const desc=document.getElementById('reward-desc'); if(ov&&desc){ const fb='¡Has recibido '+pending.amount.toLocaleString()+' 💎 de bienvenida!'; try{desc.textContent=i18n.t(pending.hasBeta?'reward_beta_desc':'reward_welcome_desc',fb).replace('{amount}',pending.amount.toLocaleString());}catch(e){desc.textContent=fb;} ov.classList.remove('hidden'); const btn=document.getElementById('reward-collect-btn'); if(btn) btn.onclick=()=>{ov.classList.add('hidden'); try{playLevelUp();}catch(e){} try{checkOldSkinsReward(); showSkinRewardScreen();}catch(e){}}; return; } }
              try{checkOldSkinsReward(); showSkinRewardScreen();}catch(e){}
            }catch(e){}
          };
        }
        const btnRes = document.getElementById('btn-tutorial-complete-restart');
        if (btnRes) btnRes.onclick = () => {
          ov2.classList.add('hidden');
          isDying=false; gameRunning=false; FxCanvas.wipe();
          try { startGame(); } catch(e) {}
        };
      } else {
        setOverlayMode('menu');
      }
    }, _deathDelay));
    return;
  }
  if (isDying) return;
  isDying = true; gamePaused = false;
  laserActive = false;
  if (laserBeamEl) laserBeamEl.classList.remove("active");
  stopBackgroundMusic(); stopSlowSoundEffect();
  clearCutsceneTimeouts();
  cutsceneActive = true; activeCutsceneName = 'death';

  if (!options.manualFinish) {
    if (skipBtn) skipBtn.classList.remove("hidden");
    muteBtn.style.display = "flex"; pauseBtn.style.display = "none";
    playGameOver();
    const centerX = playerX + PLAYER_WIDTH / 2, centerY = GAME_HEIGHT - 30 - PLAYER_HEIGHT / 2;
    createExplosion(centerX - 35, centerY - 35, 70);
    createShipDebris(centerX, centerY);
    playerEl.style.display = "none";
  } else { playerEl.style.display = "none"; }

  if (autosaveInterval) clearInterval(autosaveInterval);
  clearTimeout(marsLandingTimeout);
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
  // Fix #1: safeParseInt con fallback + try/catch para evitar NaN permanente
  let prevTotal = 0; try { const v = parseInt(localStorage.getItem('dodgeTotalGameTime') || '0', 10); prevTotal = isNaN(v) ? 0 : v; } catch(e) {}
  try { localStorage.setItem('dodgeTotalGameTime', String(prevTotal + gameDuration)); } catch(e) {}
  let prevAst = 0; try { const v = parseInt(localStorage.getItem('dodgeTotalAsteroids') || '0', 10); prevAst = isNaN(v) ? 0 : v; } catch(e) {}
  try { localStorage.setItem('dodgeTotalAsteroids', String(prevAst + sessionAsteroidsDestroyed)); } catch(e) {}
  const countdownOverlay = document.getElementById('countdown-overlay');
  if (countdownOverlay) countdownOverlay.classList.add('hidden');

  playerX = (GAME_WIDTH - PLAYER_WIDTH) / 2; playerVelocity = 0;
  playerEl.style.transform = `translate3d(${playerX}px, 0, 0)`;
  playerEl.style.left = "0px";
  playerEl.classList.remove("fast-visual");
  if (earthHorizonEl) earthHorizonEl.style.display = "none";

  let lifeWasLost = false;
  if (postMarsDeathImmunity) { postMarsDeathImmunity = false; }
  else if (!isDeletingData && !options.noLifeLoss) {
    let currentLives = getCurrentLives();
    currentLives = Math.max(0, currentLives - 1);
    setCurrentLives(currentLives);
    saveLives();
    if (typeof updatePlayButtonState === 'function') updatePlayButtonState();
    lifeWasLost = true;
  }
  if (activeSlot !== null) try { localStorage.removeItem(`dodge_save_slot_${activeSlot}`); } catch(e) {}

  const intScore = Math.floor(score);
  // Modo BETA: el récord local (ni siquiera en memoria) ni los desbloqueos
  // de skins se actualizan mientras esté activo.
  if (!betaModeActive && intScore > getCurrentBestScore()) { setCurrentBestScore(intScore); saveBestScore(); checkSkinUnlocksFromScore(); }
  // Economía: 1 polvo por cada 100 puntos (0 en BETA).
  sessionDustEarned = 0;
  if (!betaModeActive) {
    const earned = Math.floor(intScore / DUST_PER_POINTS);
    if (earned > 0) { addDust(earned); sessionDustEarned = earned; }
  }

  const isMarsCompletion = options.noLifeLoss || (!lifeWasLost && marsSequenceTriggered);
  const isPerfectRun = !lifeWasLost && marsSequenceTriggered;

  // Game over title
  const goTitleEl = document.querySelector("#gameover-overlay .gameover-title");
  if (goTitleEl) goTitleEl.textContent = isMarsCompletion ? i18n.t("msg_game_completed", "Juego Completado") : i18n.t("msg_game_over", "Game Over");

  // Score display
  const goScoreDisplay = document.getElementById("gameover-score-display");
  if (goScoreDisplay) goScoreDisplay.textContent = intScore.toLocaleString();

  // Score label (with perfect run indicator)
  const goScoreLabel = document.querySelector(".gameover-score-label");
  if (goScoreLabel) {
    if (isPerfectRun) {
      goScoreLabel.innerHTML = `${i18n.t("table_header_score")} — <span style="color:#50e3c2;">${i18n.t("msg_perfect_run", "Perfect run")}</span>`;
    } else {
      goScoreLabel.textContent = i18n.t("table_header_score", "Puntuación");
    }
  }

  // Stats
  const goAst = document.getElementById("gameover-asteroids");
  if (goAst) goAst.textContent = sessionAsteroidsDestroyed;
  const goPwr = document.getElementById("gameover-powerups");
  if (goPwr) goPwr.textContent = sessionPowerupsCollected;
  const goTime = document.getElementById("gameover-time");
  if (goTime) {
    const totalSec = Math.floor(gameDuration / 1000);
    goTime.textContent = `${Math.floor(totalSec / 60)}:${(totalSec % 60).toString().padStart(2, "0")}`;
  }

  // Dust
  const goDust = document.getElementById("gameover-dust");
  if (goDust) {
    goDust.textContent = sessionDustEarned > 0
      ? `💨 +${sessionDustEarned} ${i18n.t("dust_name", "polvo")}`
      : "";
  }

  if (!worldRecordEnabled) worldRecordStatusEl.textContent = i18n.t("submit_disabled");

  updateBestScoreUI(); updateLivesUI(); updateTouchControlsVisibility(); updateDustUI();
  if (btnSaveQuit) btnSaveQuit.classList.add("hidden");
  if (btnFinishRun) btnFinishRun.classList.add("hidden");
  if (pauseContinueBtn) pauseContinueBtn.classList.add("hidden");
  updateOverlayLivesInfo();

  if (options.manualFinish || document.body.classList.contains("no-smooth")) { skipDeathSequence(); return; }
  cutsceneTimeouts.push(setTimeout(skipDeathSequence, 2000));
}

// ============================================================
// INICIAR PARTIDA
// ============================================================

function startGame() {
  if (!canInteract(restartBtn) && !canInteract(document.getElementById("menu-play-btn"))) return;
  const playBtn = document.getElementById("menu-play-btn");
  if (playBtn) playBtn.classList.remove("glow-btn");
  stopSlowSoundEffect();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

  // Invitado por defecto: si no hay piloto, asignar silenciosamente antes de jugar
  if (!getPilotNumber()) {
    try { assignPilotNumber(); } catch(e) {}
    try { if (typeof updateAccountUI === 'function') updateAccountUI(); } catch(e) {}
  }

  const _isFirstGameForTutorial = localStorage.getItem('dodgeFirstGameDone') !== 'true';
  const _wasSkipped = localStorage.getItem('dodgeTutorialSkipped') === 'true';
  if (_isFirstGameForTutorial && !_wasSkipped && !betaModeActive) {
    tutorialGameActive = true;
    tutorialGameStep = 0;
    tutorialStepStartTime = 0;
    tutorialPracticeStart = 0;
    tutorialDeterministicIndex = 0;
    try { tutorialRngReset(1337); } catch(e) {}
  } else {
    tutorialGameActive = false;
  }

  if (getCurrentLives() <= 0) {
    overlayLivesInfo.style.display = "block"; setOverlayMode("menu");
    if (typeof openLivesShop === 'function') setTimeout(()=>openLivesShop(), 80);
    return;
  }

  // Evita lecturas fuera de rango si activeSlot se manipula.
  if (activeSlot !== null && typeof MAX_SLOTS === "number" && (activeSlot < 0 || activeSlot >= MAX_SLOTS)) activeSlot = null;
  if (activeSlot !== null) {
    let slotData = null; try { const raw = localStorage.getItem(`dodge_save_slot_${activeSlot}`); slotData = raw ? JSON.parse(raw) : null; } catch(e) { slotData = null; }
    if (slotData && slotData.betaModeActive && !betaModeActive) {
      setOverlayMode("menu");
      const menuErrorEl = document.getElementById("menu-error-text");
      if (menuErrorEl) { menuErrorEl.innerHTML = '⚠️ ' + (i18n ? i18n.t('beta_slot_warning', 'Este slot contiene datos del modo BETA. Actívalo en Ajustes para jugar esta partida.') : 'Este slot contiene datos del modo BETA. Actívalo en Ajustes para jugar esta partida.'); menuErrorEl.classList.remove("hidden"); }
      return;
    }
    if (slotData) {
      resumeGameFromLoad(slotData);
      if (autosaveInterval) clearInterval(autosaveInterval);
      autosaveInterval = setInterval(performAutosave, 5000);
      return;
    }
  }

  if (swingcopterModeActive) swingcopterDirection = 1;
  keys = { left: false, right: false, up: false, lastDir: null };
  sessionPowerupsCollected = 0; sessionShieldsCollected = 0; sessionLasersCollected = 0; sessionSlowsCollected = 0; sessionLaserFiredCount = 0; sessionAsteroidsDestroyed = 0;
  sessionDustEarned = 0;
  isDying = false; setNoLivesMessageShown(false);
  powerUpPityCounter = 0;
  updateStageScale();
  playerX = (GAME_WIDTH - PLAYER_WIDTH) / 2; playerVelocity = 0;
  playerEl.style.left = "0px";

  meteors = [];
  powerups.forEach(p => { try { p.el.remove(); } catch (e) { } }); powerups = [];
  projectiles = [];
  FxCanvas.wipe();

  shieldActive = false; laserActive = false; slowActive = false; slowElapsedTime = 0;
  shieldEl.classList.remove("active");
  if (laserBeamEl) laserBeamEl.classList.remove("active");
  betaFreezeEndTime = 0;
  const freezeOverlay = document.getElementById("beta-freeze-overlay");
  if (freezeOverlay) freezeOverlay.style.display = "none";
  if (playerEl) playerEl.style.opacity = "";

  marsSequenceTriggered = false; cutsceneActive = false; postMarsDeathImmunity = false;
  playerEl.classList.remove("landing-sequence"); playerEl.style.transition = "";
  marsHorizonEl.style.opacity = "0"; containerEl.style.background = "";
  if (earthHorizonEl) earthHorizonEl.style.opacity = "0";
  gameDuration = 0;

  // Modo BETA: arrancar desde una puntuación inicial configurada.
  if (betaModeActive && betaStartingScore > 0) {
    score = betaStartingScore;
    level = Math.floor(score / 1000) + 1;
    currentLevelBase = Math.floor(score / 1000) * 1000;
    nextLevelTarget = currentLevelBase + 1000;
    difficultyFactor = 1 + (Math.min(score, 500000) / 500000) * (MAX_DIFFICULTY - 1);
    levelProgress = (nextLevelTarget - currentLevelBase) > 0
      ? Math.max(0, Math.min(score - currentLevelBase, nextLevelTarget - currentLevelBase)) / (nextLevelTarget - currentLevelBase)
      : 1;
    updateProgressBar(levelProgress * 100, level);
  } else {
    score = 0; lastIntScore = 0; level = 1; currentLevelBase = 0;
    nextLevelTarget = 1000; levelProgress = 0;
    updateProgressBar(0, 1);
    difficultyFactor = 1;
  }
  lastIntScore = Math.floor(score);
  lastSpawnTime = 0; lastFrameTime = null;
  meteorSpawnCount = 0; lastRenderedLives = -1;
  gameRunning = true; gamePaused = false;
  stageEl.classList.add("playing");

  hideOverlay();
  document.getElementById("gameover-overlay").classList.add("hidden");
  playerEl.style.display = "block";
  if (fastModeActive) playerEl.classList.add("fast-visual");
  else playerEl.classList.remove("fast-visual");
  pauseBtn.style.display = "flex";
  if (skipBtn) skipBtn.classList.add("hidden");
  muteBtn.style.display = "flex";
  if (pauseContinueBtn) pauseContinueBtn.classList.add("hidden");

  lastAutoShootTime = performance.now();
  startBackgroundMusic(); updateBestScoreUI(); updateTouchControlsVisibility();
  checkAchievements(); updateLivesInGameRealtime(); updateAutoShootProgress(performance.now());
  triggerEarthLaunch();

  if (autosaveInterval) clearInterval(autosaveInterval);
  if (activeSlot !== null) autosaveInterval = setInterval(performAutosave, 5000); // PERF: era 1000ms (1s) → 5000ms (5s)
}

// ============================================================
// PAUSA
// ============================================================

function togglePause() {
  if (typeof tutorialGameActive !== 'undefined' && tutorialGameActive) {
    if (!isDying) gameOver();
    return;
  }
  if (cutsceneActive) {
    if (activeCutsceneName === 'earthLaunch') skipEarthLaunch();
    else if (activeCutsceneName === 'marsLanding') skipMarsLanding();
    else if (activeCutsceneName === 'marsTakeoff') skipMarsTakeoff();
    else if (activeCutsceneName === 'death') skipDeathSequence();
    return;
  }
  gamePaused = !gamePaused;
  keys = { left: false, right: false, up: false, lastDir: null };
  updateTouchControlsVisibility();

  if (gamePaused) {
    stageEl.classList.remove("playing");
    pauseStartTime = performance.now(); playPauseSound();
    updateOverlayLivesInfo();
    setGameElementsVisibility(false);
    const isFirstGame = localStorage.getItem("dodgeFirstGameDone") !== "true";
    if (btnSaveQuit) { if (isFirstGame) btnSaveQuit.classList.add("hidden"); else btnSaveQuit.classList.remove("hidden"); }
    if (btnFinishRun) btnFinishRun.classList.remove("hidden");
    if (pauseContinueBtn) { pauseContinueBtn.classList.remove("hidden"); pauseContinueBtn.classList.add("pulse-active"); }
    setOverlayMode("pause"); overlayEl.scrollTop = 0;
    stopBackgroundMusic();
    pauseBtn.style.display = "none"; muteBtn.style.display = "none";
    if (skipBtn) skipBtn.classList.add("hidden");
  } else {
    if (pauseStartTime > 0) {
      const duration = performance.now() - pauseStartTime;
      lastSpawnTime += duration; lastAutoShootTime += duration;
      if (shieldActive) shieldEndTime += duration;
      if (laserActive) laserEndTime += duration;
      if (immunityEndTime > performance.now()) immunityEndTime += duration;
      pauseStartTime = 0;
    }
    stageEl.classList.add("playing");
    setGameElementsVisibility(true);
    playUnpauseSound();
    hideOverlay();
    if (pauseContinueBtn) { pauseContinueBtn.classList.add("hidden"); pauseContinueBtn.classList.remove("pulse-active"); }
    lastFrameTime = null; updateStageScale(); startBackgroundMusic();
    pauseBtn.style.display = "flex"; muteBtn.style.display = "flex";
    requestGameLoopFrame();
  }
}

// ============================================================
// LOOP PRINCIPAL
// ============================================================

function requestGameLoopFrame() {
  if (gameLoopFramePending) return;
  gameLoopFramePending = true;
  requestAnimationFrame(gameLoop);
}

function drawCanvasEntities() {
  if (typeof FxCanvas === 'undefined' || !FxCanvas.isReady()) return;
  FxCanvas.clear();
  for (let i = 0; i < projectiles.length; i++) { const p = projectiles[i]; if (p) FxCanvas.drawProjectile(p); }
  for (let i = 0; i < meteors.length; i++) { const m = meteors[i]; if (m && typeof m.size === 'number') FxCanvas.drawMeteor(m); }
  if (FxCanvas.hasParticles()) FxCanvas.drawParticles();
  FxCanvas.drawDebugRects();
}

function gameLoop(timestamp) {
  gameLoopFramePending = false;
  if (!lastFrameTime) lastFrameTime = timestamp;
  if (timestamp - (_lastGlobalLivesUpdate || 0) > 200) {
    updateGlobalLives(timestamp);
    _lastGlobalLivesUpdate = timestamp;
  }

  const delta = timestamp - lastFrameTime;
  lastFrameTime = timestamp;

  // Pacing fijo a TARGET_FPS (30fps): capar render tanto en partida como en menú
  const step = FRAME_TIME;
  if (typeof _fpsAccumulator !== "number") _fpsAccumulator = 0;
  _fpsAccumulator = Math.min(step * 3, _fpsAccumulator + delta);

  // Si no ha pasado un step completo, saltar render para capar a 30fps (también en menú)
  if (_fpsAccumulator < step) {
    requestGameLoopFrame();
    return;
  }

  // Actualización: como máximo 2 pasos para evitar espirales de catch-up.
  let steps = 0;
  while (_fpsAccumulator >= step && steps < 2) {
    _fpsAccumulator -= step;
    steps++;
  }

  // Contador FPS integrado: contar solo frames realmente renderizados (capados a 30) tanto en menú como en partida
  if (showFPS) {
    if (!window.__fpsLabel) {
      const el = document.createElement("div");
      el.style.cssText = "position:absolute;bottom:4px;right:4px;font-size:10px;background:rgba(0,0,0,0.6);padding:2px 6px;border-radius:6px;z-index:9999;font-family:monospace;";
      el.id = "fps-label"; containerEl.appendChild(el);
      window.__fpsLabel = el; window.__fpsLastTime = performance.now(); window.__fpsCount = 0;
    }
    window.__fpsCount++;
    const now = performance.now();
    if (now - window.__fpsLastTime >= 500) {
      window.__fpsLabel.textContent = `${Math.round((window.__fpsCount / (now - window.__fpsLastTime)) * 1000)} FPS`;
      window.__fpsLastTime = now; window.__fpsCount = 0;
    }
  } else if (window.__fpsLabel) { window.__fpsLabel.remove(); window.__fpsLabel = null; }

  if (gamePaused || !gameRunning) {
    requestGameLoopFrame(); return;
  }

  const baseDelta = steps * step;
  // Tutorial siempre a velocidad normal, ignore modo rápido
  const isTutorial = (typeof tutorialGameActive !== 'undefined' && tutorialGameActive);
  const effectiveDelta = isTutorial ? baseDelta : baseDelta * (fastModeActive ? FAST_MODE_MULTIPLIER : 1);

  if (!gameRunning || gamePaused) { requestGameLoopFrame(); return; }

  // Helper: dibujar llavero en canvas
  const _drawKeychain = () => {
    if (!keychain || !keychain.imageLoaded || isDying) return;
    const oldDiv = document.querySelector('#skin-lavero');
    if (oldDiv) oldDiv.style.display = 'none';
    const baseLevel = keychain.lastBaseLevel || 1;
    const llavOff = getLlaveroOffset(baseLevel, fastModeActive || swingcopterModeActive);
    const rightPx = parseFloat(llavOff.right) || 0;
    const bottomPx = parseFloat(llavOff.bottom) || 0;
    const laveroW = 33;
    const laveroH = 33;
    const fixationScaled = 15 * (33 / 50);
    const anchorX = playerX + PLAYER_WIDTH - rightPx - laveroW / 2;
    // Follow ship's CSS animation transform during launch cutscene
    let animY = 0;
    if (cutsceneActive && activeCutsceneName === 'earthLaunch' && playerEl) {
      const tf = getComputedStyle(playerEl).transform;
      if (tf && tf !== 'none') {
        const vals = tf.replace(/^matrix\(|^matrix3d\(|\)$/g, '').split(',').map(Number);
        // matrix: 6 values (tx=4, ty=5); matrix3d: 16 values (tx=12, ty=13)
        animY = vals.length > 6 ? (vals[13] || 0) : (vals[5] || 0);
      }
    }
    const anchorY = GAME_HEIGHT - 30 + bottomPx + laveroH - fixationScaled - 13 + animY;
    keychain.setAnchor(anchorX, anchorY);
    keychain.update(playerX);
    keychain.draw(FxCanvas.getCtx());
  };

  // Durante cutscenes (no death): limpiar canvas, dibujar llavero y partículas, luego retornar
  if (cutsceneActive && activeCutsceneName !== 'death') {
    FxCanvas.clear();
    if (FxCanvas.hasParticles()) {
      FxCanvas.updateParticles(baseDelta);
      FxCanvas.drawParticles();
    }
    _drawKeychain();
    requestGameLoopFrame();
    return;
  }

  if (steps === 0) {
    if (FxCanvas.hasParticles()) FxCanvas.updateParticles(baseDelta);
    FxCanvas.clear();
    drawCanvasEntities();
    requestGameLoopFrame();
    return;
  }

  if (!isDying) {
    gameDuration += baseDelta;
    updateLivesInGameRealtime(); updatePlayer(baseDelta);
    const _isTutorialArrowSlow = typeof tutorialGameActive !== 'undefined' && tutorialGameActive && (tutorialGameStep===0 || tutorialGameStep===1) && slowActive;
    const _slowFactorForScore = _isTutorialArrowSlow ? calculateSlowSpeedFactor() : 1;
    if (tutorialGameActive) {
      updateDifficultyByLevel();
      updateTutorialSteps(timestamp);
      updateStoryBackground();
      if (!betaFreezeEndTime || performance.now() >= betaFreezeEndTime) {
        addScoreFromTime(baseDelta * _slowFactorForScore);
      }
    } else {
      updateDifficultyByLevel();
      updateStoryBackground();
      if (!betaFreezeEndTime || performance.now() >= betaFreezeEndTime) {
        addScoreFromTime(effectiveDelta);
      }
    }
  }

  const _physDelta = (typeof tutorialGameActive !== 'undefined' && tutorialGameActive) ? baseDelta : effectiveDelta;
  updateProjectiles(_physDelta); updateMeteors(_physDelta); updatePowerUps(_physDelta);

  if (FxCanvas.hasParticles()) FxCanvas.updateParticles(baseDelta);

  if (!marsSequenceTriggered && score >= 250000 && !isDying) triggerMarsLanding();

  const frozen = betaFreezeEndTime && performance.now() < betaFreezeEndTime;
  let spawnIntervalMultiplier = slowActive ? 4 : 1;
  let spawnInterval;
  if (tutorialGameActive) {
    if (tutorialGameStep === 2) {
      if (tutorialSmallLaserCount >= 4) {
        spawnInterval = 999999;
      } else {
        spawnInterval = 850;
        if (timestamp - lastSpawnTime > spawnInterval && !isDying && !frozen) {
          spawnMeteor(timestamp);
          tutorialSmallLaserCount++;
        }
      }
    } else if (tutorialGameStep === 6) {
      if (typeof tutorialPracticeStart !== 'undefined' && tutorialPracticeStart && timestamp - tutorialPracticeStart < 3000) {
        spawnInterval = 999999;
      } else {
        spawnInterval = 850;
        if (timestamp - lastSpawnTime > spawnInterval && !isDying && !frozen) {
          spawnMeteor(timestamp);
        }
      }
    } else {
      spawnInterval = 999999;
    }
  } else {
    spawnInterval = (BASE_SPAWN_INTERVAL * spawnIntervalMultiplier) /
      Math.min(difficultyFactor + 0.1, MAX_DIFFICULTY) / (fastModeActive ? FAST_MODE_MULTIPLIER : 1);
    if (!isDying && !frozen && timestamp - lastSpawnTime > spawnInterval) {
      spawnMeteor(timestamp);
      const pityBonus = powerUpPityCounter * 0.02;
      if (Math.random() < (POWERUP_PROB + pityBonus)) spawnPowerUp();
      else powerUpPityCounter++;
    }
  }

  const shootInterval = (typeof tutorialGameActive !== 'undefined' && tutorialGameActive) ? AUTO_SHOOT_INTERVAL_NORMAL : (fastModeActive ? AUTO_SHOOT_INTERVAL_FAST : AUTO_SHOOT_INTERVAL_NORMAL);
  if (!isDying && !frozen && keys.up && timestamp - lastAutoShootTime > shootInterval) {
    spawnAutoLaser(); lastAutoShootTime = timestamp;
  }
  updateAutoShootProgress(timestamp);

  // Dibujar entidades del canvas: proyectiles, meteoros y partículas.
  drawCanvasEntities();

  // Dibujar llavero (después de drawCanvasEntities que limpia el canvas)
  _drawKeychain();

  // Hitboxes de depuración: encima de todo.
  requestGameLoopFrame();
}
