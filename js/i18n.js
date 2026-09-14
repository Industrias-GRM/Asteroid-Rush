// ============================================================
// SISTEMA MULTILINGÜE
// ============================================================

const i18n = {
  carouselPos: 0, carouselVelocity: 0, baseSpeed: -0.5,
  isDragging: 0, hoverFactor: 1, isHovered: false, trackEl: null,
  names: { es:'Español', en:'English', ca:'Català', fr:'Français', de:'Deutsch', it:'Italiano', ja:'日本語', pt_PT:'Português' },
  displayCodes: { es:'ES', en:'EN', ca:'CAT', fr:'FR', de:'DE', it:'IT', ja:'JP', pt_PT:'PT' },
  legalSuffix: { es:'es', en:'en', ca:'cat', fr:'fr', de:'de', it:'it', ja:'ja', pt_PT:'pt' },
  currentLocale: 'en',
  messages: {},
  fallbackMessages: {},

  async _loadFallbackMessages() {
    try {
      const r = await fetch(Platform.resolveURL(`_locales/en/messages.json`));
      if (r.ok) this.fallbackMessages = await r.json();
    } catch(e) { this.fallbackMessages = {}; }
  },

  async loadMessages(locale) {
    try {
      const response = await fetch(Platform.resolveURL(`_locales/${locale}/messages.json`));
      if (!response.ok) {
        this.currentLocale = Platform.getUILanguage().split('-')[0];
        const fb = await fetch(Platform.resolveURL(`_locales/${this.currentLocale}/messages.json`));
        if (!fb.ok) { this.messages = {}; return; }
        this.messages = await fb.json();
      } else {
        this.messages = await response.json();
        this.currentLocale = locale;
      }
      // siempre tener inglés como fallback
      if (locale !== 'en' && !Object.keys(this.fallbackMessages).length) await this._loadFallbackMessages();
      if (locale === 'en') this.fallbackMessages = this.messages;
    } catch (e) { this.messages = {}; }
  },

  async init() {
    const candidates = ['es','en','ca','fr','de','it','ja','pt_PT'];
    const availableLangs = candidates;
    let preferredLang = localStorage.getItem('dodgePreferredLanguage');
    if (!preferredLang || !availableLangs.includes(preferredLang)) {
      preferredLang = Platform.getUILanguage().split('-')[0];
      if (!availableLangs.includes(preferredLang)) preferredLang = 'en';
    }
    await this.loadMessages(preferredLang);

    // Fast critical path: aplicar traducciones y UI esencial sin bloquear con carrusel
    this.apply();
    // Marcar layout como listo antes del primer paint (evita shift 0.196 a 385ms)
    try { document.documentElement.classList.add('i18n-ready'); } catch(e) {}
    updateModeUI();
    const initialDisplayEl = document.querySelector('#settings-lang-focused-wrapper .current-value');
    if (initialDisplayEl) initialDisplayEl.textContent = this.names[this.currentLocale] || this.currentLocale.toUpperCase();

    // Fallback: si por alguna razón apply no se ejecutó a tiempo, forzar visible en 800ms
    setTimeout(() => { try { document.documentElement.classList.add('i18n-ready'); } catch(e){} }, 800);

    // Deferir creación pesada de carruseles a idle para reducir Longest Task (79ms -> <50ms)
    const defer = window.requestIdleCallback ? (cb) => requestIdleCallback(cb, { timeout: 800 }) : (cb) => setTimeout(cb, 0);
    defer(() => this._initLanguageGrids(availableLangs));
  },

  _initLanguageGrids(availableLangs) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = "bold 12px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

    const langTrigger = document.querySelector('#settings-lang-focused-wrapper .custom-select-trigger');
    const langOptions = document.querySelector('#settings-lang-focused-wrapper .focused-lang-options');

    // Carrusel LEGAL — usar DocumentFragment para batch DOM (1 reflow)
    const legalGrid = document.getElementById('legal-lang-grid');
    if (legalGrid) {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < 2; i++) {
        availableLangs.forEach(lang => {
          const btn = document.createElement('button');
          btn.className = 'lang-square-btn'; btn.dataset.value = lang;
          const shortName = this.displayCodes[lang] || lang.toUpperCase();
          const fullName = (this.names[lang] || lang).toUpperCase();
          btn.textContent = shortName;
          const measuredWidth = ctx.measureText(fullName).width;
          btn.style.setProperty('--expanded-width', Math.max(50, Math.ceil(measuredWidth + 24)) + 'px');
          btn.addEventListener('mouseenter', () => { this.isHovered = true; btn.textContent = fullName; });
          btn.addEventListener('mouseleave', () => { this.isHovered = false; btn.textContent = shortName; });
          btn.addEventListener('click', async () => {
            localStorage.setItem('dodgePreferredLanguage', lang);
            await this.loadMessages(lang);
            this.apply();
            const el = document.querySelector('#settings-lang-focused-wrapper .current-value');
            if (el) el.textContent = this.names[lang] || lang.toUpperCase();
            playMenuClickSound();
          });
          frag.appendChild(btn);
        });
      }
      legalGrid.innerHTML = '';
      legalGrid.appendChild(frag);
      this.trackEl = legalGrid;

      const moveLeftBtn = document.getElementById('legal-move-left');
      const moveRightBtn = document.getElementById('legal-move-right');
      const tripleBoost = 3;
      const holdIntervalMs = 70;
      let holdTimer = null;
      let holdDir = 0;
      const startHold = (dir) => {
        holdDir = dir;
        this.isHovered = false;
        if (holdTimer) return;
        const applyBoost = () => {
          const boost = Math.abs(this.baseSpeed) * tripleBoost;
          if (holdDir === -1) {
            this.carouselVelocity = Math.max(-8, Math.min(8, this.carouselVelocity + boost));
          } else if (holdDir === 1) {
            this.carouselVelocity = Math.max(-8, Math.min(8, this.carouselVelocity - boost));
          }
        };
        applyBoost();
        playMenuClickSound();
        holdTimer = setInterval(applyBoost, holdIntervalMs);
      };
      const stopHold = () => {
        holdDir = 0;
        if (holdTimer) {
          clearInterval(holdTimer);
          holdTimer = null;
        }
      };
      if (moveLeftBtn) {
        moveLeftBtn.addEventListener('mousedown', () => startHold(-1));
        moveLeftBtn.addEventListener('mouseup', stopHold);
        moveLeftBtn.addEventListener('mouseleave', stopHold);
        moveLeftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startHold(-1); }, { passive: false });
        moveLeftBtn.addEventListener('touchend', stopHold);
      }
      if (moveRightBtn) {
        moveRightBtn.addEventListener('mousedown', () => startHold(1));
        moveRightBtn.addEventListener('mouseup', stopHold);
        moveRightBtn.addEventListener('mouseleave', stopHold);
        moveRightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startHold(1); }, { passive: false });
        moveRightBtn.addEventListener('touchend', stopHold);
      }
      // Solo arrancar carrusel si overlay visible para no gastar main thread en bg
      const legalOverlay = document.getElementById('legal-overlay');
      if (!legalOverlay || !legalOverlay.classList.contains('hidden')) {
        this.startCarouselEngine();
      }
    }

    // Grid AJUSTES — también con fragment
    const settingsGrid = document.getElementById('settings-lang-grid');
    if (settingsGrid) {
      const frag2 = document.createDocumentFragment();
      availableLangs.forEach(lang => {
        const btn = document.createElement('button');
        btn.className = 'lang-square-btn'; btn.dataset.value = lang;
        const fullName = this.names[lang] || (lang.charAt(0).toUpperCase() + lang.slice(1).toLowerCase());
        btn.textContent = fullName;
        btn.addEventListener('click', async () => {
          localStorage.setItem('dodgePreferredLanguage', lang);
          await this.loadMessages(lang);
          this.apply();
          const displayEl = document.querySelector('#settings-lang-focused-wrapper .current-value');
          if (displayEl) displayEl.textContent = fullName;
          langTrigger?.classList.remove('open');
          langOptions?.classList.add('hidden');
          playMenuClickSound();
        });
        frag2.appendChild(btn);
      });
      settingsGrid.innerHTML = '';
      settingsGrid.appendChild(frag2);
    }

    if (langTrigger && langOptions) {
      langTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        langTrigger.classList.toggle('open');
        langOptions.classList.toggle('hidden');
        playMenuClickSound();
      });
      document.addEventListener('click', (e) => {
        if (!langTrigger.contains(e.target)) {
          langTrigger.classList.remove('open');
          langOptions.classList.add('hidden');
        }
      });
    }
  },

  t(key, fallback = '') {
    if (this.messages[key]?.message) return this.messages[key].message;
    if (this.fallbackMessages[key]?.message) return this.fallbackMessages[key].message;
    const chromeMessage = Platform.getI18nMessage(key);
    if (chromeMessage && chromeMessage !== `__MSG_${key}__`) return chromeMessage;
    // si el fallback pasado es español y existe inglés, preferir inglés
    if (this.fallbackMessages[key]?.message) return this.fallbackMessages[key].message;
    return fallback;
  },

  getLegalUrl(type) {
    const suffix = this.legalSuffix[this.currentLocale] || 'en';
    return Platform.resolveURL(`archivosLegales/${type}_${suffix}.html`);
  },

  apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const m = this.t(el.getAttribute('data-i18n'));
      if (!m) return;
      // Por defecto usamos textContent. Para cadenas que incluyen HTML deliberado (<kbd>, <b>, etc),
      // se marca el elemento con data-i18n-html="true".
      if (el.getAttribute('data-i18n-html') === 'true') el.innerHTML = m;
      else el.textContent = m;
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => { const m = this.t(el.getAttribute('data-i18n-title')); if (m) el.title = m; });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { const m = this.t(el.getAttribute('data-i18n-placeholder')); if (m) el.placeholder = m; });
    document.querySelectorAll('[data-legal-link]').forEach(el => {
      const url = this.getLegalUrl(el.getAttribute('data-legal-link'));
      if (el.tagName === 'A') el.href = url;
      else el.setAttribute('data-link', url);
    });
    document.querySelectorAll('.read-link').forEach(el => { el.onclick = (e) => { e.preventDefault(); window.open(el.href, '_blank'); }; });
    updateModeUI(); updateBestScoreUI(); updateLivesUI(); updateOverlayLivesInfo();
    if (typeof achievementsOverlay !== 'undefined' && !achievementsOverlay.classList.contains("hidden")) renderAchievements();
    if (typeof leaderboardOverlay !== 'undefined' && !leaderboardOverlay.classList.contains("hidden")) loadLeaderboard(currentLeaderboardMode, true);
    const tutorialOverlay = document.getElementById("tutorial-overlay");
    if (tutorialOverlay && !tutorialOverlay.classList.contains("hidden")) updateTutorialUI();
    if (typeof generateSkinSelector === 'function') generateSkinSelector();
    try { document.documentElement.classList.add('i18n-ready'); } catch(e) {}
  },

  startCarouselEngine() {
    this.halfWidth = this.trackEl ? this.trackEl.scrollWidth / 2 : 0;
    const animate = () => {
      if (!this.trackEl || this.halfWidth === 0) return;
      const legalOverlay = document.getElementById('legal-overlay');
      if (legalOverlay && legalOverlay.classList.contains('hidden')) { this.carouselRafId = 0; return; }
      const accel = 0.4, friction = 0.94, maxExtraVel = 8;
      if (this.isDragging !== 0) this.carouselVelocity += this.isDragging * accel;
      this.carouselVelocity = Math.max(-maxExtraVel, Math.min(maxExtraVel, this.carouselVelocity));
      this.carouselVelocity *= friction;
      const targetFactor = this.isHovered ? 0 : 1;
      this.hoverFactor += (targetFactor - this.hoverFactor) * 0.1;
      this.carouselPos += (this.baseSpeed + this.carouselVelocity) * this.hoverFactor;
      if (this.carouselPos <= -this.halfWidth) this.carouselPos += this.halfWidth;
      if (this.carouselPos > 0) this.carouselPos -= this.halfWidth;
      this.trackEl.style.transform = `translate3d(${this.carouselPos}px, 0, 0)`;
      this.carouselRafId = requestAnimationFrame(animate);
    };
    if (this.carouselRafId) return;
    this.carouselRafId = requestAnimationFrame(animate);
  }
};
