/**
 * API Adapter — resolves backend from exam.mode (not hostname).
 *
 * SoT nghiệp vụ:
 *   System → Admin tạo kỳ → chọn Online|Offline → exam.mode
 *   Data plane ngày thi chọn backend theo exam.mode của kỳ đang chọn.
 *
 * | exam.mode | Backend                                      |
 * |-----------|----------------------------------------------|
 * | online    | config.onlineApiUrl (Apps Script)            |
 * | offline   | config.localApiBase hoặc same-origin /api/*  |
 *
 * Hostname/LAN chỉ còn là gợi ý kết nối (Local Server host), không định nghĩa mode hệ thống.
 */

var PqqAdapter = (function() {
  'use strict';

  var _config = null;
  var EXAM_CONFIG_KEY = 'pqq_exam_config';
  var EXAM_MODE_KEY = 'pqq_exam_mode';

  function loadConfig() {
    if (_config) return Promise.resolve(_config);
    return fetch('/config.json')
      .then(function(resp) { return resp.json(); })
      .then(function(cfg) { _config = cfg; return _config; })
      .catch(function() {
        _config = { onlineApiUrl: '', localApiBase: '' };
        return _config;
      });
  }

  /** True when page is served from a LAN / localhost host (capability hint only). */
  function isLocalServerHost() {
    var host = window.location.hostname;
    return host.endsWith('.local') ||
      /^192\.168\./.test(host) ||
      /^10\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      host === 'localhost' ||
      host === '127.0.0.1';
  }

  function parseExamMode(examConfig) {
    if (!examConfig) return null;
    if (examConfig.MODE === 'offline' || examConfig.mode === 'offline') return 'offline';
    if (examConfig.MODE === 'online' || examConfig.mode === 'online') return 'online';
    var raw = examConfig.SETTINGS != null ? examConfig.SETTINGS : examConfig.settings;
    if (raw == null || raw === '') return null;
    try {
      var settings = typeof raw === 'string' ? JSON.parse(raw || '{}') : raw;
      if (settings && settings.mode === 'offline') return 'offline';
      if (settings && settings.mode === 'online') return 'online';
    } catch (e) { /* ignore */ }
    return null;
  }

  function getStoredExamConfig() {
    try {
      var raw = localStorage.getItem(EXAM_CONFIG_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setExamContext(examConfig) {
    if (!examConfig) return null;
    localStorage.setItem(EXAM_CONFIG_KEY, JSON.stringify(examConfig));
    var mode = parseExamMode(examConfig) || 'online';
    localStorage.setItem(EXAM_MODE_KEY, mode);
    return mode;
  }

  function getExamMode() {
    if (typeof PqqSession !== 'undefined' && PqqSession.get) {
      var session = PqqSession.get();
      if (session && session.examMode) return session.examMode;
    }
    var stored = localStorage.getItem(EXAM_MODE_KEY);
    if (stored === 'offline' || stored === 'online') return stored;
    return parseExamMode(getStoredExamConfig());
  }

  function usesLocalApi(mode) {
    var m = mode || getExamMode();
    return m === 'offline';
  }

  /**
   * Resolve API base for a given exam mode.
   * offline → localApiBase (or '' same-origin on Local Server host)
   * online  → onlineApiUrl
   * admin/control-plane → always onlineApiUrl (forceOnline)
   */
  function resolveApiBase(mode, options) {
    options = options || {};
    return loadConfig().then(function(config) {
      if (options.forceOnline) {
        return config.onlineApiUrl || '';
      }
      var m = mode || getExamMode();
      if (m === 'offline') {
        if (config.localApiBase) return config.localApiBase.replace(/\/$/, '');
        // Same-origin when PWA is served by Local Server
        if (isLocalServerHost()) return '';
        return config.localApiBase || '';
      }
      return config.onlineApiUrl || '';
    });
  }

  function getApiBase(options) {
    return resolveApiBase(getExamMode(), options);
  }

  function getOnlineApiBase() {
    return loadConfig().then(function(config) {
      return config.onlineApiUrl || '';
    });
  }

  function getConfig() {
    return loadConfig();
  }

  /** @deprecated Use getExamMode() — hostname is not system mode. */
  function isOfflineEnvironment() {
    return usesLocalApi();
  }

  /** @deprecated Use getExamMode() */
  function getMode() {
    return getExamMode() || (isLocalServerHost() ? 'offline' : 'online');
  }

  return {
    loadConfig: loadConfig,
    getConfig: getConfig,
    getApiBase: getApiBase,
    getOnlineApiBase: getOnlineApiBase,
    resolveApiBase: resolveApiBase,
    getExamMode: getExamMode,
    parseExamMode: parseExamMode,
    setExamContext: setExamContext,
    getStoredExamConfig: getStoredExamConfig,
    usesLocalApi: usesLocalApi,
    isLocalServerHost: isLocalServerHost,
    // backward-compatible aliases
    isOfflineEnvironment: isOfflineEnvironment,
    getMode: getMode,
  };
})();

if (typeof window !== 'undefined') {
  window.PqqAdapter = PqqAdapter;
  window.getApiBase = function(options) { return PqqAdapter.getApiBase(options); };
  window.getConfig = function() { return PqqAdapter.getConfig(); };
  window.getExamMode = function() { return PqqAdapter.getExamMode(); };
  window.isLocalServerHost = PqqAdapter.isLocalServerHost;
  // Deprecated aliases — kept so older pages keep working during transition
  window.isOfflineEnvironment = function() { return PqqAdapter.usesLocalApi(); };
  window.getApiMode = function() { return PqqAdapter.getExamMode() || PqqAdapter.getMode(); };
}
