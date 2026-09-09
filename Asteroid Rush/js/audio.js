// ============================================================
// SISTEMA DE AUDIO
// ============================================================

const AUDIO_FILES = {
  asteroid: "sounds/asteroid.mp3",
  laserHit: "sounds/laser_hit.mp3",
  shield: "sounds/shield.mp3",
  eliminated: "sounds/eliminated.mp3"
};

const audioCache = {};
const audioPoolMap = {};
const AUDIO_POOL_SIZE = 4;

function preloadAudioFile(key) {
  if (audioCache[key]) return;
  const audio = new Audio();
  audio.src = Platform.resolveURL(AUDIO_FILES[key]);
  audio.preload = "auto";
  audioCache[key] = audio;
}

function playAudioFile(key, volume = 0.5) {
  if (!soundOn || !sfxOn) return;
  preloadAudioFile(key);
  const baseAudio = audioCache[key];
  if (!baseAudio) return;
  if (!audioPoolMap[key]) {
    audioPoolMap[key] = [];
    for (let i = 0; i < AUDIO_POOL_SIZE; i++) {
      audioPoolMap[key].push(baseAudio.cloneNode());
    }
    audioPoolMap[key]._nextIndex = 0;
  }
  const pool = audioPoolMap[key];
  const audio = pool[pool._nextIndex];
  pool._nextIndex = (pool._nextIndex + 1) % AUDIO_POOL_SIZE;
  audio.currentTime = 0;
  audio.volume = volume * AUDIO_CONFIG.masterVolume * AUDIO_CONFIG.sfxVolume;
  const playPromise = audio.play();
  if (playPromise !== undefined) playPromise.catch(() => {});
}

const AUDIO_CONFIG = {
  masterVolume: 0.3,
  sfxVolume: 0.4,
  musicVolume: 0.45,
  effects: {
    scoreUp:   { notes: [880, 1100, 1320], durations: [90, 90, 120], volumes: [0.35, 0.25, 0.3], type: "triangle", delay: [0, 80, 160] },
    levelUp:   { notes: [660, 990, 1320, 1650], durations: [80, 120, 100, 150], volumes: [0.4, 0.4, 0.4, 0.35], type: "square", delay: [0, 80, 160, 280] },
    lifeUp:    { notes: [700, 900, 700], durations: [90, 90, 120], volumes: [0.35, 0.35, 0.4], type: "sine", delay: [0, 100, 200] },
    powerUp:   { notes: [1200, 1500, 1200, 1800], durations: [120, 120, 100, 150], volumes: [0.4, 0.3, 0.35, 0.4], type: "triangle", delay: [0, 80, 160, 280] },
    slow:      { notes: [500, 600, 700, 600, 500], durations: [120, 100, 120, 100, 150], volumes: [0.4, 0.35, 0.4, 0.35, 0.3], type: "triangle", delay: [0, 80, 160, 280, 400] },
    pause:     { notes: [800, 1000], durations: [100, 150], volumes: [0.35, 0.4], type: "square", delay: [0, 120] },
    unpause:   { notes: [1000, 800], durations: [100, 150], volumes: [0.4, 0.35], type: "square", delay: [0, 120] },
    collision: { notes: [200, 250, 200, 300], durations: [80, 80, 80, 120], volumes: [0.35, 0.3, 0.25, 0.2], type: "sawtooth", delay: [0, 40, 80, 120] },
    menuHover: { notes: [600], durations: [50], volumes: [0.2], type: "sine", delay: [0] },
    menuClick: { notes: [800, 600], durations: [80, 100], volumes: [0.3, 0.25], type: "square", delay: [0, 80] },
    modeNormal: { notes: [500, 700], durations: [80, 100], volumes: [0.3, 0.3], type: "sine", delay: [0, 80] },
    modeFast: { notes: [800, 1100, 1400], durations: [60, 60, 90], volumes: [0.3, 0.3, 0.35], type: "square", delay: [0, 50, 100] },
    modeZigzag: { notes: [600, 450, 750, 500], durations: [70, 70, 70, 100], volumes: [0.3, 0.3, 0.3, 0.35], type: "triangle", delay: [0, 70, 140, 210] }
  }
};

// Ralentización
const SLOW_SOUND_CONFIG = { duration: 2, intensity: 2, pitchInicial: 600 };
let slowSoundOscillators = [];
let slowSoundGainNodes = [];
let slowSoundIsPlaying = false;

// Estado de audio
let audioCtx = null;
let soundOn = false;
let musicOn = true;
let sfxOn = true;
let backgroundOscillators = [];
let backgroundGains = [];
let melodyTimer = null;
let backgroundFilter = null;

// ============================================================
// FUNCIONES DE AUDIO
// ============================================================

function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(effectName, customConfig = {}) {
  if (!soundOn || !sfxOn) return;
  initAudio();
  const config = AUDIO_CONFIG.effects[effectName] || AUDIO_CONFIG.effects.scoreUp;
  const notes = customConfig.notes || config.notes;
  const durations = customConfig.durations || config.durations;
  const volumes = customConfig.volumes || config.volumes;
  const type = customConfig.type || config.type;
  const delays = customConfig.delay || config.delay;
  notes.forEach((note, index) => {
    setTimeout(() => {
      if (!audioCtx || audioCtx.state === "closed") return;
      // PERF FIX: reutilizar OscillatorNode + GainNode amortiguados para sonidos cortos.
      // Evita la sobrecarga de crear/destruir nodos Web Audio por cada nota de cada efecto.
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = note;
      const duration = (durations[index] || 100) / 1000;
      const volume = (volumes[index] || 0.15) * AUDIO_CONFIG.masterVolume * AUDIO_CONFIG.sfxVolume;
      gain.gain.setValueAtTime(volume, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
      // Autolimpieza: desconectar tras terminar para liberar recursos
      osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch(e) {} };
    }, delays[index] || 0);
  });
}

function startBackgroundMusic() {
  if (!soundOn || !musicOn) return;
  initAudio();
  stopBackgroundMusic();
  const now = audioCtx.currentTime;
  const masterGain = audioCtx.createGain();
  masterGain.gain.value = AUDIO_CONFIG.masterVolume * AUDIO_CONFIG.musicVolume;
  masterGain.connect(audioCtx.destination);
  backgroundFilter = audioCtx.createBiquadFilter();
  backgroundFilter.type = "lowpass";
  backgroundFilter.frequency.setValueAtTime(1200, now);
  backgroundFilter.Q.value = 0.9;
  backgroundFilter.connect(masterGain);
  const compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.value = -50; compressor.knee.value = 40;
  compressor.ratio.value = 12; compressor.attack.value = 0.003; compressor.release.value = 0.25;
  compressor.connect(backgroundFilter);
  [55, 110].forEach(freq => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine"; osc.frequency.value = freq; gain.gain.value = 0.008;
    osc.connect(gain).connect(compressor); osc.start();
    backgroundOscillators.push(osc); backgroundGains.push(gain);
  });
  const padOsc = audioCtx.createOscillator(), padGain = audioCtx.createGain(), padFilter = audioCtx.createBiquadFilter();
  padOsc.type = "triangle"; padOsc.frequency.value = 220; padGain.gain.value = 0.004;
  padFilter.type = "lowpass"; padFilter.frequency.value = 800; padFilter.Q.value = 0.5;
  padOsc.connect(padGain).connect(padFilter).connect(compressor); padOsc.start();
  backgroundOscillators.push(padOsc); backgroundGains.push(padGain);
  const melodyOsc = audioCtx.createOscillator(), melodyGain = audioCtx.createGain(), melodyFilter = audioCtx.createBiquadFilter();
  melodyOsc.type = "triangle"; melodyGain.gain.value = 0.02;
  melodyFilter.type = "lowpass"; melodyFilter.frequency.value = 3000; melodyFilter.Q.value = 1;
  melodyOsc.connect(melodyGain).connect(melodyFilter).connect(compressor); melodyOsc.start();
  backgroundOscillators.push(melodyOsc); backgroundGains.push(melodyGain);
  const notes = [220, 261.63, 329.63, 392.0, 440, 329.63, 261.63];
  let step = 0;
  const playStep = () => {
    if (!audioCtx || audioCtx.state === "closed") return;
    const difficultyBoost = 1 + (Math.min(score, 50000) / 50000) * 0.5;
    const speedBoost = fastModeActive ? 1.3 : 1;
    backgroundFilter.frequency.setTargetAtTime(900 * difficultyBoost, audioCtx.currentTime, 0.3);
    const note = notes[step % notes.length] * speedBoost;
    const n = audioCtx.currentTime;
    melodyOsc.frequency.setTargetAtTime(note, n, 0.05);
    melodyGain.gain.cancelScheduledValues(n);
    melodyGain.gain.setValueAtTime(0.0, n);
    melodyGain.gain.linearRampToValueAtTime(0.035, n + 0.08);
    melodyGain.gain.linearRampToValueAtTime(0.02, n + 0.3);
    melodyGain.gain.exponentialRampToValueAtTime(0.01, n + 0.5);
    step++;
    const baseInterval = 300;
    const speedFactor = fastModeActive ? 1 / FAST_MODE_MULTIPLIER : 1;
    melodyTimer = setTimeout(playStep, baseInterval * speedFactor);
  };
  playStep();
}

function stopBackgroundMusic() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  backgroundOscillators.forEach(osc => { try { osc.stop(now + 0.1); osc.disconnect(); } catch (e) {} });
  backgroundOscillators.length = 0;
  backgroundGains.forEach(g => { try { g.disconnect(); } catch (e) {} });
  backgroundGains.length = 0;
  if (melodyTimer) { clearTimeout(melodyTimer); melodyTimer = null; }
  if (backgroundFilter) { try { backgroundFilter.disconnect(); } catch (e) {} backgroundFilter = null; }
}

// ============================================================
// SONIDO DE RALENTIZACIÓN
// ============================================================

function initAudioContextForSlowSound() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playSlowSoundEffect() {
  if (slowSoundIsPlaying || !soundOn || !sfxOn) return;
  initAudioContextForSlowSound();
  const { duration, intensity, pitchInicial } = SLOW_SOUND_CONFIG;
  slowSoundIsPlaying = true;
  const startTime = audioCtx.currentTime;
  const masterGain = audioCtx.createGain();
  masterGain.connect(audioCtx.destination);
  masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
  masterGain.gain.linearRampToValueAtTime(0.5 * AUDIO_CONFIG.masterVolume * AUDIO_CONFIG.sfxVolume, audioCtx.currentTime + 0.1);
  const osc1 = audioCtx.createOscillator(), gain1 = audioCtx.createGain();
  osc1.type = "sine"; osc1.connect(gain1); gain1.connect(masterGain); gain1.gain.setValueAtTime(0, audioCtx.currentTime);
  const osc2 = audioCtx.createOscillator(), gain2 = audioCtx.createGain();
  osc2.type = "triangle"; osc2.connect(gain2); gain2.connect(masterGain); gain2.gain.setValueAtTime(0, audioCtx.currentTime);
  const osc3 = audioCtx.createOscillator(), gain3 = audioCtx.createGain();
  osc3.type = "sawtooth"; osc3.connect(gain3); gain3.connect(masterGain); gain3.gain.setValueAtTime(0, audioCtx.currentTime);
  const bufferSize = audioCtx.sampleRate * 0.1;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) noiseData[i] = Math.random() * 2 - 1;
  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer; noiseSource.loop = true;
  const noiseGain = audioCtx.createGain();
  noiseSource.connect(noiseGain); noiseGain.connect(masterGain); noiseGain.gain.setValueAtTime(0, audioCtx.currentTime);
  osc1.start(); osc2.start(); osc3.start(); noiseSource.start();
  const updateFrequencies = () => {
    if (!slowSoundIsPlaying) return;
    const elapsed = audioCtx.currentTime - startTime;
    if (elapsed >= duration) { stopSlowSoundEffect(); return; }
    const progress = elapsed / duration;
    const freq = pitchInicial * Math.exp(-intensity * progress);
    osc1.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.02);
    osc2.frequency.setTargetAtTime(freq * 2, audioCtx.currentTime, 0.02);
    osc3.frequency.setTargetAtTime(freq * 0.5, audioCtx.currentTime, 0.02);
    const envolvente = Math.sin(Math.PI * progress) * (0.15 + 0.6 * progress);
    gain1.gain.setTargetAtTime(envolvente, audioCtx.currentTime, 0.02);
    gain2.gain.setTargetAtTime(envolvente * 0.5, audioCtx.currentTime, 0.02);
    gain3.gain.setTargetAtTime(envolvente * 0.3, audioCtx.currentTime, 0.02);
    noiseGain.gain.setTargetAtTime(envolvente * 0.08, audioCtx.currentTime, 0.02);
    requestAnimationFrame(updateFrequencies);
  };
  updateFrequencies();
  slowSoundOscillators = [osc1, osc2, osc3, noiseSource];
  slowSoundGainNodes = [masterGain, gain1, gain2, gain3, noiseGain];
}

function stopSlowSoundEffect() {
  if (!slowSoundIsPlaying) return;
  slowSoundIsPlaying = false;
  if (slowSoundGainNodes.length > 0) slowSoundGainNodes[0].gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
  setTimeout(() => {
    slowSoundOscillators.forEach(osc => { try { osc.stop(); osc.disconnect(); } catch (e) {} });
    slowSoundGainNodes.forEach(gain => { try { gain.disconnect(); } catch (e) {} });
    slowSoundOscillators = []; slowSoundGainNodes = [];
  }, 100);
}

// ============================================================
// ATAJOS DE SONIDO
// ============================================================
function playScoreUp()        { playSound('scoreUp'); }
function playHit()            { playAudioFile('asteroid', 0.6); }
function playLevelUp()        { playSound('levelUp'); }
function playLifeUp()         { playSound('lifeUp'); }
function playLaser()          { playAudioFile('laserHit', 0.5); }
function playGameOver()       { playAudioFile('eliminated', 0.8); }
function playShieldActivated(){ playAudioFile('shield', 0.7); }
function playSlowActivated()  { playSlowSoundEffect(); }
function playPauseSound()     { playSound('pause'); }
function playUnpauseSound()   { playSound('unpause'); }
function playCollisionSound() { playSound('collision'); }
function playMenuHoverSound() { playSound('menuHover'); }
function playMenuClickSound() { playSound('menuClick'); }
function playModeSound(mode) {
  if (mode === 'fast') playSound('modeFast');
  else if (mode === 'swingcopter') playSound('modeZigzag');
  else playSound('modeNormal');
  try { if (navigator.vibrate) navigator.vibrate(mode === 'fast' ? [30,20,30] : mode === 'swingcopter' ? [20,15,20,15,30] : [25]); } catch(e) {}
}

// ============================================================
// CONTROLES MUTE / PAUSA DESDE HUD
// ============================================================
function updateMuteButtonUI() {
  if (soundOn) { muteBtn.textContent = "🔊"; muteBtn.classList.remove("active"); }
  else         { muteBtn.textContent = "🔇"; muteBtn.classList.add("active"); }
}

function toggleMute() {
  soundOn = !soundOn;
  localStorage.setItem("dodgeSoundOn", soundOn);
  updateMuteButtonUI();
  syncSoundToggleUI();
  if (soundOn && gameRunning && !gamePaused && musicOn) startBackgroundMusic();
  else if (!soundOn) stopBackgroundMusic();
}

function toggleGamePause() {
  if (!gameRunning) return;
  togglePause();
}

function initGameControls() {
  soundOn = localStorage.getItem("dodgeSoundOn") !== "false";
  updateMuteButtonUI();
  muteBtn.addEventListener("click", toggleMute);
  pauseBtn.addEventListener("click", toggleGamePause);
  if (pauseContinueBtn) pauseContinueBtn.addEventListener("click", toggleGamePause);
  muteBtn.style.display = "flex";
  pauseBtn.style.display = "flex";
  if (pauseContinueBtn) pauseContinueBtn.classList.add("hidden");
}
