/**
 * API Client — HTTP + envelope parsing.
 * Backend is chosen by exam.mode (via adapter), not by hostname.
 *
 * Control-plane Admin actions always hit Apps Script (forceOnline).
 * Sync pull/push only when the active exam is offline.
 */

const ApiClient = (function () {
  var ADMIN_ACTIONS = {
    createExamRoom: true,
    importStudents: true,
    configureJudges: true,
    rotateRolePasswords: true,
    generateQrLinks: true,
    generatePdf: true,
  };

  function usesLocalApi(options) {
    options = options || {};
    if (options.forceOnline) return false;
    if (typeof PqqAdapter !== 'undefined' && PqqAdapter.usesLocalApi) {
      return PqqAdapter.usesLocalApi();
    }
    return typeof isOfflineEnvironment === 'function' && isOfflineEnvironment();
  }

  async function getBase(options) {
    options = options || {};
    if (typeof getApiBase === 'function') {
      return getApiBase(options);
    }
    return '';
  }

  function offlineEndpoint(action) {
    var map = {
      approveScore: 'approve',
      approve: 'approve',
    };
    return '/api/' + (map[action] || action);
  }

  function generateIdempotencyKey() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function getOrCreateDeviceId() {
    var key = 'pqq_device_id';
    var id = localStorage.getItem(key);
    if (!id) {
      id = 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
      localStorage.setItem(key, id);
    }
    return id;
  }

  function withDeviceId(payload) {
    return Object.assign({ deviceId: getOrCreateDeviceId() }, payload || {});
  }

  async function request(action, payload, options) {
    options = options || {};
    var forceOnline = options.forceOnline === true || !!ADMIN_ACTIONS[action];
    var reqOptions = { forceOnline: forceOnline };
    var base = await getBase(reqOptions);
    var local = usesLocalApi(reqOptions) && !forceOnline;
    var maxRetries = options.retries !== undefined ? options.retries : 2;
    var idempotencyKey = options.idempotencyKey || (payload && payload.idempotencyKey) || generateIdempotencyKey();
    var showErrorToast = options.showErrorToast === true;

    var lastError = null;

    for (var attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        var body = withDeviceId(Object.assign({ action: action }, payload || {}, {
          idempotencyKey: idempotencyKey,
        }));

        var url;
        if (local) {
          url = offlineEndpoint(action);
        } else {
          if (!base) {
            return {
              ok: false,
              error: 'Online API URL chưa cấu hình (config.onlineApiUrl)',
              code: 'CONFIG_ERROR',
            };
          }
          url = base;
        }

        var resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          redirect: 'follow',
        });

        if (!resp.ok) {
          if (resp.status === 429) {
            var envelope429 = await resp.json().catch(function() { return {}; });
            var result429 = {
              ok: false,
              error: envelope429.error || { code: 'QUOTA_EXCEEDED', message: 'Rate limit exceeded' },
              code: (envelope429.error && envelope429.error.code) || 'QUOTA_EXCEEDED',
            };
            if (showErrorToast && window.PqqErrorHandler) {
              PqqErrorHandler.handleApiError(result429, {
                retry: attempt < maxRetries ? function() { request(action, payload, options); } : undefined,
              });
            }
            return result429;
          }
          throw new Error('HTTP ' + resp.status + ': ' + resp.statusText);
        }

        var envelope = await resp.json();

        if (envelope.ok) {
          return { ok: true, data: envelope.data };
        }

        var result = {
          ok: false,
          error: envelope.error || 'Unknown error',
          code: (envelope.error && envelope.error.code) || envelope.code,
        };

        if (showErrorToast && window.PqqErrorHandler && !options.silent) {
          PqqErrorHandler.handleApiError(result);
        }

        return result;
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries && isRetryable(err)) {
          await sleep(Math.pow(2, attempt) * 500);
          continue;
        }
      }
    }

    var failResult = {
      ok: false,
      error: (lastError && lastError.message) || 'Request failed',
      code: 'NETWORK_ERROR',
    };
    if (showErrorToast && window.PqqErrorHandler && !options.silent) {
      PqqErrorHandler.handleApiError(failResult, { retry: options.onRetry });
    }
    return failResult;
  }

  async function getData(params) {
    params = params || {};
    var base = await getBase();
    var queryParams = withDeviceId(params);
    var url;

    if (usesLocalApi()) {
      url = '/api/getData?' + new URLSearchParams(queryParams).toString();
    } else {
      if (!base) {
        return { ok: false, error: 'Online API URL chưa cấu hình', code: 'CONFIG_ERROR' };
      }
      var query = new URLSearchParams(Object.assign({ action: 'getData' }, queryParams)).toString();
      url = base + (base.indexOf('?') >= 0 ? '&' : '?') + query;
    }

    return getJson(url, params);
  }

  async function getScoreboard(params) {
    params = params || {};
    var base = await getBase();
    var queryParams = withDeviceId(params);
    var url;

    if (usesLocalApi()) {
      url = '/api/getScoreboard?' + new URLSearchParams(queryParams).toString();
    } else if (base) {
      var query = new URLSearchParams(Object.assign({ action: 'getScoreboard' }, queryParams)).toString();
      url = base + (base.indexOf('?') >= 0 ? '&' : '?') + query;
    } else {
      return { ok: false, error: 'Online API URL chưa cấu hình', code: 'CONFIG_ERROR' };
    }

    return getJson(url, params);
  }

  async function getExamConfig(examId) {
    if (!examId) {
      return { ok: false, error: 'examId is required', code: 'VALIDATION_ERROR' };
    }

    // Prefer Local Server list when this host serves offline exams
    if (typeof PqqAdapter !== 'undefined' && PqqAdapter.isLocalServerHost && PqqAdapter.isLocalServerHost()) {
      try {
        var localResp = await fetch('/api/getExamConfig?examId=' + encodeURIComponent(examId));
        if (localResp.ok) {
          var localEnv = await localResp.json();
          if (localEnv.ok && localEnv.data) {
            if (PqqAdapter.setExamContext) PqqAdapter.setExamContext(localEnv.data);
            return { ok: true, data: localEnv.data };
          }
        }
      } catch (e) { /* fall through to online */ }
    }

    var base = await getOnlineApiBaseSafe();
    if (!base) {
      return { ok: false, error: 'Không tải được cấu hình kỳ thi', code: 'CONFIG_ERROR' };
    }
    var url = base + (base.indexOf('?') >= 0 ? '&' : '?') +
      'action=getExamConfig&examId=' + encodeURIComponent(examId);
    var result = await getJson(url, { silent: true });
    if (result.ok && result.data && typeof PqqAdapter !== 'undefined' && PqqAdapter.setExamContext) {
      PqqAdapter.setExamContext(result.data);
    }
    return result;
  }

  async function listExams() {
    // Local Server: exams already pulled into SQLite
    try {
      var resp = await fetch('/api/exams');
      if (resp.ok) {
        var env = await resp.json();
        if (env.ok && env.data) return { ok: true, data: env.data };
      }
    } catch (e) { /* not on Local Server */ }
    return { ok: false, error: 'Danh sách kỳ chỉ có trên Local Server (kỳ Offline đã pull)', code: 'UNAVAILABLE' };
  }

  async function getOnlineApiBaseSafe() {
    if (typeof PqqAdapter !== 'undefined' && PqqAdapter.getOnlineApiBase) {
      return PqqAdapter.getOnlineApiBase();
    }
    try {
      var cfg = await (await fetch('/config.json')).json();
      return cfg.onlineApiUrl || '';
    } catch (e) {
      return '';
    }
  }

  async function getJson(url, params) {
    var showErrorToast = params && params.showErrorToast === true;
    try {
      var resp = await fetch(url, { redirect: 'follow' });
      if (!resp.ok) {
        if (resp.status === 429) {
          var envelope = await resp.json().catch(function() { return {}; });
          var result = {
            ok: false,
            error: envelope.error,
            code: (envelope.error && envelope.error.code) || 'QUOTA_EXCEEDED',
          };
          if (showErrorToast && window.PqqErrorHandler) PqqErrorHandler.handleApiError(result);
          return result;
        }
        throw new Error('HTTP ' + resp.status);
      }
      var envelopeOk = await resp.json();
      if (envelopeOk.ok) return { ok: true, data: envelopeOk.data };
      var failBody = {
        ok: false,
        error: envelopeOk.error,
        code: envelopeOk.error && envelopeOk.error.code,
      };
      if (showErrorToast && window.PqqErrorHandler && !(params && params.silent)) {
        PqqErrorHandler.handleApiError(failBody);
      }
      return failBody;
    } catch (err) {
      var netFail = { ok: false, error: err.message, code: 'NETWORK_ERROR' };
      if (showErrorToast && window.PqqErrorHandler && !(params && params.silent)) {
        PqqErrorHandler.handleApiError(netFail);
      }
      return netFail;
    }
  }

  async function checkHealth() {
    try {
      var base = '';
      if (typeof PqqAdapter !== 'undefined' && PqqAdapter.resolveApiBase) {
        base = await PqqAdapter.resolveApiBase('offline');
      }
      var url = (base || '') + '/api/health';
      var resp = await fetch(url);
      if (!resp.ok) return { ok: false, error: 'Server unreachable' };
      var envelope = await resp.json();
      return envelope.ok ? { ok: true, data: envelope.data } : { ok: false, error: envelope.error };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async function syncPull(payload) {
    return syncRequest('pull', payload);
  }

  async function syncPush(payload) {
    return syncRequest('push', payload);
  }

  async function getSyncLog(params) {
    params = params || {};
    if (!usesLocalApi()) {
      return { ok: false, error: 'Sync log chỉ dùng cho kỳ thi Offline', code: 'FORBIDDEN' };
    }
    var query = new URLSearchParams(withDeviceId(params)).toString();
    var url = '/api/sync/log' + (query ? '?' + query : '');
    return getJson(url, { silent: true });
  }

  async function syncRequest(action, payload) {
    if (!usesLocalApi()) {
      return { ok: false, error: 'Sync chỉ dùng cho kỳ thi Offline (exam.mode=offline)', code: 'FORBIDDEN' };
    }
    try {
      var resp = await fetch('/api/sync/' + action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withDeviceId(payload || {})),
      });
      var envelope = await resp.json();
      if (envelope.ok) return { ok: true, data: envelope.data };
      return { ok: false, error: envelope.error, code: envelope.error && envelope.error.code };
    } catch (err) {
      return { ok: false, error: err.message, code: 'NETWORK_ERROR' };
    }
  }

  function isRetryable(err) {
    if (!err) return false;
    var msg = err.message || '';
    return msg.indexOf('Failed to fetch') >= 0 ||
      msg.indexOf('NetworkError') >= 0 ||
      msg.indexOf('HTTP 5') >= 0;
  }

  function sleep(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
  }

  return {
    request: request,
    getData: getData,
    getScoreboard: getScoreboard,
    getExamConfig: getExamConfig,
    listExams: listExams,
    checkHealth: checkHealth,
    syncPull: syncPull,
    syncPush: syncPush,
    getSyncLog: getSyncLog,
    getOrCreateDeviceId: getOrCreateDeviceId,
    generateIdempotencyKey: generateIdempotencyKey,
    usesLocalApi: usesLocalApi,
  };
})();

if (typeof window !== 'undefined') {
  window.ApiClient = ApiClient;
}
