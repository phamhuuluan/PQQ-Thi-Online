/**
 * Device + global rate limiting for Local API — mirrors Apps Script RateLimit.gs (T-904/T-905)
 */

const GLOBAL_LIMIT_PER_MIN = 300;

const DEVICE_LIMITS = {
  getScoreboard: 30,
  getData: 60,
  submitScore: 60,
  lockSheet: 20,
    approve: 10,
    approveScore: 10,
  default: 40,
};

const globalBuckets = new Map();
const deviceBuckets = new Map();

function pruneBuckets(map, bucket) {
  for (const key of map.keys()) {
    if (!key.endsWith('_' + bucket) && !key.startsWith('global_' + bucket)) {
      map.delete(key);
    }
  }
}

function checkGlobalLimit() {
  const bucket = Math.floor(Date.now() / 60000);
  const key = 'global_' + bucket;
  const count = globalBuckets.get(key) || 0;
  if (count >= GLOBAL_LIMIT_PER_MIN) {
    return {
      ok: false,
      error: {
        code: 'QUOTA_EXCEEDED',
        message: 'System rate limit reached, please retry in a few seconds',
        details: { retryAfterSeconds: 30 },
      },
    };
  }
  globalBuckets.set(key, count + 1);
  pruneBuckets(globalBuckets, bucket);
  return null;
}

function getActionGroup(action) {
  if (!action) return 'default';
  if (action === 'getScoreboard') return 'getScoreboard';
  if (action === 'getData') return 'getData';
  if (action === 'submitScore') return 'submitScore';
  if (action === 'lockSheet') return 'lockSheet';
  if (action === 'approve' || action === 'approveScore') return 'approve';
  return 'default';
}

function checkDeviceLimit(deviceId, action) {
  const group = getActionGroup(action);
  const limit = DEVICE_LIMITS[group] || DEVICE_LIMITS.default;
  const bucket = Math.floor(Date.now() / 60000);
  const key = deviceId + '_' + group + '_' + bucket;
  const count = deviceBuckets.get(key) || 0;
  if (count >= limit) {
    return {
      ok: false,
      error: {
        code: 'QUOTA_EXCEEDED',
        message: 'Rate limit reached for this device, please wait',
        details: { action, deviceId, limitPerMinute: limit },
      },
    };
  }
  deviceBuckets.set(key, count + 1);
  pruneBuckets(deviceBuckets, bucket);
  return null;
}

/**
 * Express middleware — attach before API routes.
 */
function rateLimitMiddleware(req, res, next) {
  const globalErr = checkGlobalLimit();
  if (globalErr) {
    return res.status(429).json(globalErr);
  }

  const action = req.body?.action || req.query?.action ||
    (req.path.includes('getScoreboard') ? 'getScoreboard' :
      req.path.includes('getData') ? 'getData' :
        req.path.replace('/api/', '').split('/')[0]);

  const deviceId = req.body?.deviceId || req.query?.deviceId || req.get('x-pqq-device-id') || 'anonymous';
  const deviceErr = checkDeviceLimit(deviceId, action);
  if (deviceErr) {
    return res.status(429).json(deviceErr);
  }

  next();
}

module.exports = {
  rateLimitMiddleware,
  checkGlobalLimit,
  checkDeviceLimit,
  DEVICE_LIMITS,
  GLOBAL_LIMIT_PER_MIN,
};
