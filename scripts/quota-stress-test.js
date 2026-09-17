#!/usr/bin/env node
/**
 * T-908: Quota stress simulation — N scoreboards × poll interval
 * Estimates Apps Script daily URL fetch quota usage.
 * Run: node scripts/quota-stress-test.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));

// Simulation parameters (DEC-DEP-04 B conservative design)
const SCENARIOS = [
  { name: 'Kỳ điển hình', scoreboards: 2, dashboards: 2, judges: 15, examHours: 4 },
  { name: 'Kỳ lớn (ước lượng)', scoreboards: 6, dashboards: 4, judges: 40, examHours: 6 },
  { name: 'Stress (3 miền)', scoreboards: 12, dashboards: 6, judges: 80, examHours: 8 },
];

const POLL_MS = config.scoreboardPollingInterval || 10000;
const CACHE_TTL_S = config.scoreboardCacheTtlSeconds || 18;
const GLOBAL_LIMIT_PER_MIN = 300;
const SB_DEVICE_LIMIT = 30;

// Apps Script free tier: ~20,000 URL fetches/day (conservative estimate for planning)
const DAILY_URL_FETCH_QUOTA = 20000;

function requestsPerMinute(count, intervalMs) {
  return count * (60000 / intervalMs);
}

function effectiveScoreboardRpm(scoreboards) {
  // With CacheService TTL ~18s, backend reads Sheets at most once per TTL per exam
  // Client still polls every 10s but many get UNCHANGED from cache
  const clientRpm = requestsPerMinute(scoreboards, POLL_MS);
  const cacheHitRatio = 1 - (POLL_MS / 1000 / CACHE_TTL_S);
  const backendReadsPerMin = scoreboards * (60 / CACHE_TTL_S);
  return {
    clientRpm: Math.round(clientRpm * 10) / 10,
    backendReadsPerMin: Math.round(backendReadsPerMin * 10) / 10,
    cacheHitRatio: Math.round(cacheHitRatio * 100),
  };
}

const results = SCENARIOS.map(function(scenario) {
  const sb = effectiveScoreboardRpm(scenario.scoreboards);
  const dashboardRpm = requestsPerMinute(scenario.dashboards, config.pollingInterval || 10000);
  const submitRpm = scenario.judges * 0.1; // ~1 submit per 10 min per judge avg
  const totalClientRpm = sb.clientRpm + dashboardRpm + submitRpm;
  const examMinutes = scenario.examHours * 60;
  const totalRequests = Math.round(totalClientRpm * examMinutes);
  const withinGlobalLimit = totalClientRpm <= GLOBAL_LIMIT_PER_MIN;
  const withinDeviceLimit = sb.clientRpm / scenario.scoreboards <= SB_DEVICE_LIMIT;
  const quotaHeadroom = Math.round((1 - totalRequests / DAILY_URL_FETCH_QUOTA) * 100);

  return {
    scenario: scenario.name,
    scoreboards: scenario.scoreboards,
    examHours: scenario.examHours,
    scoreboardClientRpm: sb.clientRpm,
    scoreboardBackendReadsPerMin: sb.backendReadsPerMin,
    cacheHitRatioPct: sb.cacheHitRatio,
    totalClientRpm: Math.round(totalClientRpm * 10) / 10,
    estimatedRequestsPerExam: totalRequests,
    withinGlobalRateLimit: withinGlobalLimit,
    withinDeviceRateLimit: withinDeviceLimit,
    dailyQuotaHeadroomPct: quotaHeadroom,
    risk: quotaHeadroom < 20 ? 'HIGH' : quotaHeadroom < 50 ? 'MEDIUM' : 'LOW',
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  config: {
    scoreboardPollingIntervalMs: POLL_MS,
    scoreboardCacheTtlSeconds: CACHE_TTL_S,
    globalLimitPerMin: GLOBAL_LIMIT_PER_MIN,
    scoreboardDeviceLimitPerMin: SB_DEVICE_LIMIT,
  },
  assumptions: [
    'Apps Script URL fetch quota ~20,000/day (conservative planning figure)',
    'CacheService TTL reduces Sheets reads; clients still hit Web App endpoint',
    'Dashboard polls at pollingInterval; judges submit ~6 scores/hour average',
  ],
  scenarios: results,
  recommendation: results.every(function(r) { return r.risk === 'LOW'; })
    ? 'Conservative polling config is adequate for modeled scenarios.'
    : 'Consider increasing cache TTL or poll interval for high-scoreboard scenarios.',
};

const outPath = path.join(ROOT, 'docs', 'QUOTA_STRESS_REPORT.md');
const md = `# Quota Stress Report — Phase 9 (T-908)

> Generated: ${report.generatedAt}

## Configuration verified

| Parameter | Value |
|-----------|-------|
| Scoreboard poll interval | ${POLL_MS}ms |
| Cache TTL (backend) | ${CACHE_TTL_S}s |
| Global rate limit | ${GLOBAL_LIMIT_PER_MIN}/min |
| Scoreboard device limit | ${SB_DEVICE_LIMIT}/min |

## Scenarios

| Scenario | Scoreboards | Hours | Client RPM | Backend reads/min | Est. requests/exam | Quota headroom | Risk |
|----------|-------------|-------|------------|-------------------|--------------------|----------------|------|
${results.map(function(r) {
  return `| ${r.scenario} | ${r.scoreboards} | ${r.examHours} | ${r.totalClientRpm} | ${r.scoreboardBackendReadsPerMin} | ${r.estimatedRequestsPerExam} | ${r.dailyQuotaHeadroomPct}% | ${r.risk} |`;
}).join('\n')}

## Assumptions

${report.assumptions.map(function(a) { return '- ' + a; }).join('\n')}

## Recommendation

${report.recommendation}

## Rate limit safeguards (T-904/T-905)

- Per-device throttle on all endpoints via \`RateLimit.gs\`
- Global cap ${GLOBAL_LIMIT_PER_MIN} requests/minute across all clients
- Scoreboard cache hit ratio ~${results[0].cacheHitRatioPct}% reduces backend load
`;

fs.writeFileSync(outPath, md);
console.log('Quota stress test complete.');
console.log(JSON.stringify(report, null, 2));
console.log('\nReport written to:', outPath);

process.exit(0);
