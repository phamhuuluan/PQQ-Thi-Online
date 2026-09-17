/**
 * Scoreboard — public getScoreboard endpoint (no auth)
 * T-501: public endpoint
 * T-502: CacheService TTL 15–20s
 * T-503: sinceVersion / UNCHANGED
 * T-504: deviceId light rate limit
 */

var Scoreboard = (function() {

  var CACHE_TTL = 18; // seconds (T-502: 15–20s)

  function get(params) {
    var examId = params.examId;
    if (!examId) {
      return fail('VALIDATION_ERROR', 'examId is required');
    }

    // T-504/T-904: deviceId rate limit handled centrally in Code.gs → RateLimit.check

    var cacheKey = 'scoreboard_' + examId + '_' + (params.roomId || 'ALL');
    var cache = CacheService.getScriptCache();
    var cached = cache.get(cacheKey);

    if (cached) {
      var parsed = JSON.parse(cached);
      // T-503: sinceVersion → UNCHANGED
      if (params.sinceVersion && params.sinceVersion === parsed.version) {
        return success({
          unchanged: true,
          version: parsed.version,
          timestamp: parsed.timestamp
        });
      }
      return success(parsed);
    }

    // Fetch fresh from Sheets
    var scores = getAllRows(examId, 'SCORES');

    // Only OFFICIALLY_APPROVED (SB-01 B)
    scores = scores.filter(function(s) {
      return s.STATUS === 'OFFICIALLY_APPROVED';
    });

    if (params.roomId) {
      scores = scores.filter(function(s) { return s.ROOM_ID === params.roomId; });
    }

    // Aggregate: best score per student (1 score per student for ranking — SB-02)
    var byStudent = {};
    scores.forEach(function(s) {
      var sid = s.STUDENT_ID;
      var entry = {
        studentId: sid,
        studentName: s.STUDENT_NAME,
        studentCode: s.STUDENT_CODE || '',
        clubOrRegion: s.CLUB_OR_REGION || '',
        p1: Number(s.P1) || 0,
        p2: Number(s.P2) || 0,
        p3: Number(s.P3) || 0,
        total: Number(s.TOTAL) || 0
      };
      if (!byStudent[sid] || entry.total > byStudent[sid].total) {
        byStudent[sid] = entry;
      }
    });

    var ranking = Object.keys(byStudent).map(function(k) { return byStudent[k]; });

    // T-507 / SB-03: tiebreak sort
    ranking = sortRanking_(ranking);

    for (var i = 0; i < ranking.length; i++) {
      ranking[i].rank = i + 1;
    }

    var version = Date.now().toString(36);
    var result = {
      examId: examId,
      roomId: params.roomId || null,
      ranking: ranking,
      version: version,
      timestamp: new Date().toISOString(),
      topScore: ranking.length > 0 ? ranking[0].total : null
    };

    cache.put(cacheKey, JSON.stringify(result), CACHE_TTL);

    // T-503: client sent sinceVersion but cache expired — return fresh
    if (params.sinceVersion && params.sinceVersion === version) {
      return success({ unchanged: true, version: version, timestamp: result.timestamp });
    }

    return success(result);
  }

  /** SB-03: highest total → highest single column → lowest column */
  function sortRanking_(ranking) {
    return ranking.sort(function(a, b) {
      if (b.total !== a.total) return b.total - a.total;
      var aMax = Math.max(a.p1, a.p2, a.p3);
      var bMax = Math.max(b.p1, b.p2, b.p3);
      if (bMax !== aMax) return bMax - aMax;
      var aMin = Math.min(a.p1, a.p2, a.p3);
      var bMin = Math.min(b.p1, b.p2, b.p3);
      return aMin - bMin;
    });
  }

  return { get: get, sortRanking_: sortRanking_ };
})();
