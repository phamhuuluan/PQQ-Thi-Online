/**
 * Rate limiting — deviceId throttle (T-904) + global quota (T-905)
 */

var RateLimit = (function() {

  // T-905: Global script quota — conservative cap per minute
  var GLOBAL_LIMIT_PER_MIN = 300;

  // T-904: Per-device limits per action group (requests/minute)
  var DEVICE_LIMITS = {
    getScoreboard: 30,
    getData: 60,
    submitScore: 60,
    lockSheet: 20,
    approve: 10,
    approveScore: 10,
    default: 40,
  };

  function getActionGroup(action) {
    if (!action) return 'default';
    if (action === 'getScoreboard') return 'getScoreboard';
    if (action === 'getData') return 'getData';
    if (action === 'submitScore') return 'submitScore';
    if (action === 'lockSheet') return 'lockSheet';
    if (action === 'approve' || action === 'approveScore') return 'approve';
    return 'default';
  }

  function getDeviceIdFromPayload(payload, params) {
    var source = payload || params || {};
    return source.deviceId || 'anonymous';
  }

  /**
   * Check global + device rate limits before handling request.
   * @param {string} action
   * @param {object} payloadOrParams
   * @returns {object|null} error envelope or null if OK
   */
  function check(action, payloadOrParams) {
    var globalErr = checkGlobalLimit_();
    if (globalErr) return globalErr;

    var deviceId = getDeviceIdFromPayload(payloadOrParams, payloadOrParams);
    return checkDeviceLimit_(deviceId, action);
  }

  /** T-905: aggregate Apps Script rate limit */
  function checkGlobalLimit_() {
    var bucket = Math.floor(Date.now() / 60000);
    var key = 'global_rate_' + bucket;
    var cache = CacheService.getScriptCache();
    var count = parseInt(cache.get(key) || '0', 10);
    if (count >= GLOBAL_LIMIT_PER_MIN) {
      return fail('QUOTA_EXCEEDED', 'System rate limit reached, please retry in a few seconds', {
        retryAfterSeconds: 30,
      });
    }
    cache.put(key, String(count + 1), 90);
    return null;
  }

  /** T-904: deviceId throttle for all endpoints */
  function checkDeviceLimit_(deviceId, action) {
    var group = getActionGroup(action);
    var limit = DEVICE_LIMITS[group] || DEVICE_LIMITS.default;
    var bucket = Math.floor(Date.now() / 60000);
    var key = 'dev_rate_' + deviceId + '_' + group + '_' + bucket;
    var cache = CacheService.getScriptCache();
    var count = parseInt(cache.get(key) || '0', 10);
    if (count >= limit) {
      return fail('QUOTA_EXCEEDED', 'Rate limit reached for this device, please wait', {
        action: action,
        deviceId: deviceId,
        limitPerMinute: limit,
      });
    }
    cache.put(key, String(count + 1), 90);
    return null;
  }

  return {
    check: check,
    checkDeviceLimit_: checkDeviceLimit_,
    checkGlobalLimit_: checkGlobalLimit_,
    DEVICE_LIMITS: DEVICE_LIMITS,
    GLOBAL_LIMIT_PER_MIN: GLOBAL_LIMIT_PER_MIN,
  };
})();
