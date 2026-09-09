// ============================================================
// CAPA DE COMPATIBILIDAD: Extensión Chrome ↔ Web directa
// ============================================================
// Centraliza toda la lógica de detección y proporciona funciones
// universales que funcionan en ambos entornos.

const Platform = (() => {
  'use strict';

  // --- Detección del entorno ---
  const _isExtension = typeof chrome !== 'undefined'
    && !!chrome.runtime
    && !!chrome.runtime.id
    && typeof chrome.runtime.getURL === 'function';

  // --- URL del script actual (para resolver rutas relativas) ---
  const _scriptSrc = (() => {
    try {
      const scripts = document.getElementsByTagName('script');
      for (const s of scripts) {
        if (s.src && s.src.includes('platform.js')) return s.src;
      }
    } catch (e) {}
    return '';
  })();

  // --- Directorio base del proyecto ---
  const _baseUrl = (() => {
    if (_isExtension) {
      // En extensión, chrome.runtime.getURL('') devuelve el root
      return chrome.runtime.getURL('');
    }
    // En web, deducimos la base desde la URL del script actual
    if (_scriptSrc) {
      const idx = _scriptSrc.indexOf('js/platform.js');
      if (idx !== -1) return _scriptSrc.substring(0, idx);
    }
    // Último recurso: directorio actual
    try {
      const base = new URL('.', window.location.href);
      return base.href;
    } catch (e) {
      return './';
    }
  })();

  // --- Datos del manifest (extensión) vs fallback hardcodeado (web) ---
  const _manifest = (() => {
    if (_isExtension) {
      try { return chrome.runtime.getManifest(); } catch (e) {}
    }
    // Fallback para web: se lee el manifest.json manualmente
    return {
      version: '1.0',
      name: 'Asteroid Rush BETA'
    };
  })();

  // --- ID del runtime (extensión) vs string fijo (web) ---
  const _runtimeId = _isExtension ? chrome.runtime.id : 'asteroid-rush-web';

  // --- Idioma del navegador ---
  function getUILanguage() {
    if (_isExtension) {
      try { return chrome.i18n.getUILanguage(); } catch (e) {}
    }
    return navigator.language || 'en';
  }

  // --- Mensaje i18n desde chrome.i18n (extensión) vs vacío (web usa _locales) ---
  function getI18nMessage(key) {
    if (_isExtension) {
      try { return chrome.i18n.getMessage(key); } catch (e) {}
    }
    return '';
  }

  // --- Obtener URL de un recurso interno ---
  function resolveURL(path) {
    if (_isExtension) {
      try { return chrome.runtime.getURL(path); } catch (e) {}
    }
    // En web: las rutas relativas funcionan si se abren desde el mismo directorio
    return _baseUrl + path;
  }

  // --- Abrir en nueva pestaña (extensión) vs fullscreen web ---
  function openTab(url) {
    if (_isExtension) {
      try { chrome.tabs.create({ url }); return true; } catch (e) {}
    }
    // En web: intentamos abrir en nueva pestaña
    try { window.open(url, '_blank'); return true; } catch (e) {}
    return false;
  }

  // --- Enviar mensaje al Service Worker (extensión) vs no-op (web) ---
  function sendMessage(message, callback) {
    if (_isExtension && chrome.runtime.sendMessage) {
      try {
        chrome.runtime.sendMessage(message, callback);
        return;
      } catch (e) {}
    }
    // En web: no hay service worker, resolver con error amigable
    if (typeof callback === 'function') {
      try { callback({ ok: false, error: 'web_mode' }); } catch (e) {}
    }
  }

  // --- Escuchar mensajes del runtime (extensión) vs no-op (web) ---
  function onMessage(listener) {
    if (_isExtension && chrome.runtime.onMessage) {
      try { chrome.runtime.onMessage.addListener(listener); return true; } catch (e) {}
    }
    return false;
  }

  // --- API pública ---
  return {
    get isExtension() { return _isExtension; },
    get isWeb()      { return !_isExtension; },
    get baseUrl()    { return _baseUrl; },
    get manifest()   { return _manifest; },
    get runtimeId()  { return _runtimeId; },

    getUILanguage,
    getI18nMessage,
    resolveURL,
    openTab,
    sendMessage,
    onMessage
  };
})();
