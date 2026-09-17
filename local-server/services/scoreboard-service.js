/**
 * Scoreboard service — getScoreboard (public)
 * Mirrors apps-script/Scoreboard.gs (T-501–T-504)
 */

const { success, fail } = require('../lib/envelope');
const repo = require('../repositories');

const CACHE_TTL_MS = 18000; // 18s (T-502: 15–20s)
const RATE_LIMIT_PER_MIN = 30;
const cache = new Map();
const rateBuckets = new Map();

function checkDeviceRateLimit(deviceId) {
  const bucket = Math.floor(Date.now() / 60000);
  const key = `${deviceId}_${bucket}`;
  const count = rateBuckets.get(key) || 0;
  if (count >= RATE_LIMIT_PER_MIN) {
    return fail('QUOTA_EXCEEDED', 'Scoreboard rate limit reached, please wait');
  }
  rateBuckets.set(key, count + 1);
  for (const k of rateBuckets.keys()) {
    const b = parseInt(k.split('_').pop(), 10);
    if (b < bucket - 1) rateBuckets.delete(k);
  }
  return null;
}

function sortRanking(ranking) {
  return ranking.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    const aMax = Math.max(a.p1, a.p2, a.p3);
    const bMax = Math.max(b.p1, b.p2, b.p3);
    if (bMax !== aMax) return bMax - aMax;
    const aMin = Math.min(a.p1, a.p2, a.p3);
    const bMin = Math.min(b.p1, b.p2, b.p3);
    return aMin - bMin;
  });
}

function getScoreboard(params) {
  const { examId, roomId, sinceVersion, deviceId } = params;

  if (!examId) {
    return fail('VALIDATION_ERROR', 'examId is required');
  }

  const rateErr = checkDeviceRateLimit(deviceId || 'anonymous');
  if (rateErr) return rateErr;

  const cacheKey = `${examId}_${roomId || 'ALL'}`;
  const cached = cache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    if (sinceVersion && sinceVersion === cached.data.version) {
      return success({
        unchanged: true,
        version: cached.data.version,
        timestamp: cached.data.timestamp,
      });
    }
    return success(cached.data);
  }

  const scores = repo.findApprovedScores(examId, roomId || null);

  const byStudent = {};
  for (const s of scores) {
    const sid = s.STUDENT_ID;
    const entry = {
      studentId: sid,
      studentName: s.STUDENT_NAME,
      studentCode: s.STUDENT_CODE || '',
      clubOrRegion: s.CLUB_OR_REGION || '',
      p1: Number(s.P1) || 0,
      p2: Number(s.P2) || 0,
      p3: Number(s.P3) || 0,
      total: Number(s.TOTAL) || 0,
    };
    if (!byStudent[sid] || entry.total > byStudent[sid].total) {
      byStudent[sid] = entry;
    }
  }

  let ranking = Object.values(byStudent);
  ranking = sortRanking(ranking);
  ranking.forEach((r, i) => { r.rank = i + 1; });

  const version = Date.now().toString(36);
  const result = {
    examId,
    roomId: roomId || null,
    ranking,
    version,
    timestamp: new Date().toISOString(),
    topScore: ranking.length > 0 ? ranking[0].total : null,
  };

  cache.set(cacheKey, { data: result, cachedAt: now });

  if (sinceVersion && sinceVersion === version) {
    return success({ unchanged: true, version, timestamp: result.timestamp });
  }

  return success(result);
}

module.exports = { getScoreboard, sortRanking };
