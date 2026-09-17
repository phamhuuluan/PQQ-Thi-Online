# Quota Stress Report — Phase 9 (T-908)

> Generated: 2026-07-29T10:20:05.130Z

## Configuration verified

| Parameter | Value |
|-----------|-------|
| Scoreboard poll interval | 10000ms |
| Cache TTL (backend) | 18s |
| Global rate limit | 300/min |
| Scoreboard device limit | 30/min |

## Scenarios

| Scenario | Scoreboards | Hours | Client RPM | Backend reads/min | Est. requests/exam | Quota headroom | Risk |
|----------|-------------|-------|------------|-------------------|--------------------|----------------|------|
| Kỳ điển hình | 2 | 4 | 25.5 | 6.7 | 6120 | 69% | LOW |
| Kỳ lớn (ước lượng) | 6 | 6 | 64 | 20 | 23040 | -15% | HIGH |
| Stress (3 miền) | 12 | 8 | 116 | 40 | 55680 | -178% | HIGH |

## Assumptions

- Apps Script URL fetch quota ~20,000/day (conservative planning figure)
- CacheService TTL reduces Sheets reads; clients still hit Web App endpoint
- Dashboard polls at pollingInterval; judges submit ~6 scores/hour average

## Recommendation

Consider increasing cache TTL or poll interval for high-scoreboard scenarios.

## Rate limit safeguards (T-904/T-905)

- Per-device throttle on all endpoints via `RateLimit.gs`
- Global cap 300 requests/minute across all clients
- Scoreboard cache hit ratio ~44% reduces backend load
