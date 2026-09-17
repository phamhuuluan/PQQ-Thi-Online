/**
 * T-1004: Integration — Local API ↔ SQLite
 * T-1005: Offline flow submit → lock → approve
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { setupTestDb, teardownTestDb, seedMinimalExam, buildSubmitPayload } = require('../helpers/test-db');

const EXAM = 'PQQ-API-TEST-001';
let dbPath;
let baseUrl;
let server;

function listen(app) {
  return new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
}

async function post(path, body) {
  const resp = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: resp.status, json: await resp.json() };
}

async function get(path) {
  const resp = await fetch(`${baseUrl}${path}`);
  return { status: resp.status, json: await resp.json() };
}

describe('Local API service layer (SQLite)', () => {
  let scoresService;
  let dashboardService;
  let scoreboardService;

  before(() => {
    dbPath = setupTestDb('local-api');
    seedMinimalExam(EXAM);
    scoresService = require('../../local-server/services/scores-service');
    dashboardService = require('../../local-server/services/dashboard-service');
    scoreboardService = require('../../local-server/services/scoreboard-service');
  });

  after(() => {
    teardownTestDb(dbPath);
  });

  it('submitScore → getData → lockSheet → approve → scoreboard', () => {
    const payload = buildSubmitPayload(EXAM);
    const submit = scoresService.submitScore(payload);
    assert.equal(submit.ok, true);
    assert.equal(submit.data.status, 'DRAFT');
    assert.equal(submit.data.total, 24.5);

    const data = dashboardService.getData({ examId: EXAM, role: 'secretary' });
    assert.equal(data.ok, true);
    assert.ok(data.data.scores.length >= 1);

    const lock = scoresService.lockSheet({
      examId: EXAM,
      roomId: 'ROOM_A',
      boutId: payload.boutId,
      studentId: 'VS-001',
      session: { role: 'secretary' },
    });
    assert.equal(lock.ok, true);
    assert.equal(lock.data.status, 'PENDING_APPROVAL');

    const approve = scoresService.approveScore({
      examId: EXAM,
      targets: [{ idempotencyKey: payload.idempotencyKey }],
      approveIdempotencyKey: 'approve-' + Date.now(),
      session: { role: 'cck' },
    });
    assert.equal(approve.ok, true);
    assert.ok(approve.data.approved.includes(payload.idempotencyKey));

    const sb = scoreboardService.getScoreboard({ examId: EXAM, deviceId: 'test-device' });
    assert.equal(sb.ok, true);
    assert.equal(sb.data.ranking.length, 1);
    assert.equal(sb.data.ranking[0].total, 24.5);
  });
});

describe('Local API HTTP (LAN mirror)', () => {
  before(async () => {
    dbPath = setupTestDb('local-http');
    seedMinimalExam(EXAM);
    const serverPath = require.resolve('../../local-server/server');
    delete require.cache[serverPath];
    const app = require('../../local-server/server');
    await listen(app);
  });

  after(async () => {
    if (server) await new Promise((r) => server.close(r));
    teardownTestDb(dbPath);
  });

  it('GET /api/health returns healthy', async () => {
    const { status, json } = await get('/api/health');
    assert.equal(status, 200);
    assert.equal(json.ok, true);
    assert.equal(json.data.status, 'healthy');
  });

  it('POST /api/submitScore via HTTP', async () => {
    const payload = buildSubmitPayload(EXAM);
    const { status, json } = await post('/api/submitScore', payload);
    assert.equal(status, 200);
    assert.equal(json.ok, true);
    assert.equal(json.data.status, 'DRAFT');
  });

  it('POST /api/lockSheet and /api/approve via HTTP', async () => {
    const payload = buildSubmitPayload(EXAM);
    await post('/api/submitScore', payload);

    const lock = await post('/api/lockSheet', {
      examId: EXAM,
      roomId: 'ROOM_A',
      boutId: payload.boutId,
      studentId: 'VS-001',
      session: { role: 'secretary' },
    });
    assert.equal(lock.json.ok, true);

    const approve = await post('/api/approve', {
      examId: EXAM,
      targets: [{ idempotencyKey: payload.idempotencyKey }],
      approveIdempotencyKey: 'http-approve-1',
      session: { role: 'cck' },
    });
    assert.equal(approve.json.ok, true);
  });
});
