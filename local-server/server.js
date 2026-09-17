/**
 * PQQ Local Server — Offline exam-day host (not "system Offline mode").
 *
 * Vai trò:
 * - Admin đã tạo kỳ Offline trên hệ thống quản trị (Apps Script).
 * - Thư ký host server này trong ngày thi để GK/CCK chấm realtime trên LAN.
 * - Sync pull/push theo từng examId trong config.exams[] (multi-exam).
 *
 * Không phải nơi tạo / quản lý kỳ thi.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const { initDatabase, getDb } = require('./db/init');
const { sendJson } = require('./lib/envelope');
const { validatePassForRole } = require('./lib/auth');
const { normalizeConfig, listRegistryExams } = require('./lib/exam-registry');
const scoresService = require('./services/scores-service');
const dashboardService = require('./services/dashboard-service');
const scoreboardService = require('./services/scoreboard-service');
const syncService = require('./services/sync-service');
const repo = require('./repositories');
const { rateLimitMiddleware } = require('./lib/rate-limit');

// ─── Config ─────────────────────────────────────────────────────────────────

const CONFIG_PATH = path.join(__dirname, 'config.json');
const CONFIG_EXAMPLE_PATH = path.join(__dirname, 'config.example.json');

function loadConfig() {
  const configFile = fs.existsSync(CONFIG_PATH) ? CONFIG_PATH : CONFIG_EXAMPLE_PATH;
  try {
    return normalizeConfig(JSON.parse(fs.readFileSync(configFile, 'utf8')));
  } catch (e) {
    console.warn('[Config] Could not load config, using defaults:', e.message);
    return normalizeConfig({ port: 3000, hostname: 'pqq.local', exams: [] });
  }
}

const config = loadConfig();
const PORT = process.env.PORT || config.port || 3000;
const HOSTNAME = config.hostname || 'pqq.local';

// ─── Database init ──────────────────────────────────────────────────────────

initDatabase();

// ─── Express app ────────────────────────────────────────────────────────────

const app = express();
const PROJECT_ROOT = path.join(__dirname, '..');

app.use(cors());
app.use(express.json());
app.use('/api', rateLimitMiddleware);

app.use(express.static(PROJECT_ROOT, {
  index: 'index.html',
  dotfiles: 'ignore',
}));

app.use('/local-server', (req, res) => {
  res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
});

// ─── API Routes ─────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  let dbStatus = 'ok';
  try {
    getDb().prepare('SELECT 1').get();
  } catch (e) {
    dbStatus = 'error';
  }

  const registry = listRegistryExams(config);
  const loaded = repo.listExamSummaries();

  sendJson(res, {
    ok: true,
    data: {
      status: 'healthy',
      role: 'offline-exam-host',
      db: dbStatus,
      hostname: HOSTNAME,
      registeredExams: registry.map((e) => e.examId),
      loadedExams: loaded.map((e) => e.examId),
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

/** Danh sách kỳ offline đã pull vào SQLite (+ registry chưa pull). */
app.get('/api/exams', (req, res) => {
  const loaded = repo.listExamSummaries();
  const loadedIds = new Set(loaded.map((e) => e.examId));
  const registry = listRegistryExams(config).map((e) => ({
    examId: e.examId,
    name: e.name || '',
    mode: 'offline',
    sheetsId: e.sheetsId,
    pulled: loadedIds.has(e.examId),
  }));

  sendJson(res, {
    ok: true,
    data: {
      exams: loaded,
      registry,
    },
  });
});

app.post('/api/validatePass', (req, res) => {
  const { examId, role, password } = req.body || {};
  if (!examId || !role || !password) {
    return sendJson(res, {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'examId, role, and password are required' },
    });
  }
  const result = validatePassForRole(examId, role, password);
  if (result) return sendJson(res, result, 401);
  sendJson(res, { ok: true, data: { valid: true, examId, role } });
});

app.get('/api/getExamConfig', (req, res) => {
  const examId = req.query.examId;
  if (!examId) {
    return sendJson(res, {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'examId is required. Chọn kỳ thi trước (GET /api/exams).',
      },
    });
  }
  const examConfig = repo.getExamConfig(examId);
  if (!examConfig) {
    return sendJson(res, {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: `Exam not found: ${examId}. Thư ký cần sync pull kỳ offline này trước.`,
      },
    });
  }
  sendJson(res, { ok: true, data: examConfig });
});

app.post('/api/submitScore', (req, res) => {
  const result = scoresService.submitScore(req.body);
  sendJson(res, result, result.ok ? 200 : 400);
});

app.get('/api/getData', (req, res) => {
  const result = dashboardService.getData(req.query);
  sendJson(res, result, result.ok ? 200 : 400);
});

app.get('/api/getScoreboard', (req, res) => {
  const result = scoreboardService.getScoreboard(req.query);
  sendJson(res, result, result.ok ? 200 : 400);
});

app.post('/api/lockSheet', (req, res) => {
  const result = scoresService.lockSheet(req.body);
  sendJson(res, result, result.ok ? 200 : 400);
});

app.post('/api/approve', (req, res) => {
  const result = scoresService.approveScore(req.body);
  sendJson(res, result, result.ok ? 200 : 400);
});

app.post('/api/approveScore', (req, res) => {
  const result = scoresService.approveScore(req.body);
  sendJson(res, result, result.ok ? 200 : 400);
});

// Explicitly reject Admin create on Local Server
app.post('/api/createExamRoom', (req, res) => {
  sendJson(res, {
    ok: false,
    error: {
      code: 'FORBIDDEN',
      message: 'Local Server không tạo kỳ thi. Admin tạo kỳ (Online/Offline) trên hệ thống quản trị (Apps Script), rồi Thư ký sync pull kỳ offline vào đây.',
    },
  }, 403);
});

app.post('/api/sync/pull', async (req, res) => {
  const result = await syncService.pull(req.body, config);
  sendJson(res, result, result.ok ? 200 : 400);
});

app.post('/api/sync/push', async (req, res) => {
  const result = await syncService.push(req.body, config);
  sendJson(res, result, result.ok ? 200 : 400);
});

app.get('/api/sync/log', (req, res) => {
  const result = syncService.getLog(req.query);
  sendJson(res, result, result.ok ? 200 : 400);
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  const filePath = path.join(PROJECT_ROOT, req.path);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }
  res.sendFile(path.join(PROJECT_ROOT, 'index.html'));
});

// ─── mDNS ───────────────────────────────────────────────────────────────────

function startMdns() {
  if (config.mdns?.enabled !== true) {
    console.log('[mDNS] Disabled (set mdns.enabled=true in config.json to enable)');
    return null;
  }

  try {
    const { Bonjour } = require('bonjour-service');
    const bonjour = new Bonjour();
    bonjour.publish({
      name: config.mdns?.name || 'PQQ Thi Online',
      type: config.mdns?.type || 'http',
      port: PORT,
      host: HOSTNAME,
      txt: { path: '/', role: 'offline-exam-host' },
    });
    console.log(`[mDNS] Published as http://${HOSTNAME}:${PORT}`);
    return bonjour;
  } catch (e) {
    console.warn('[mDNS] Could not start Bonjour service:', e.message);
    console.warn('[mDNS] Server still accessible via IP address');
    return null;
  }
}

module.exports = app;

if (require.main === module) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    const exams = listRegistryExams(config);
    console.log(`[PQQ Local Server] Running on http://0.0.0.0:${PORT}`);
    console.log(`[PQQ Local Server] Role: offline exam-day host (not system Offline mode)`);
    console.log(`[PQQ Local Server] Registered offline exams: ${exams.length ? exams.map((e) => e.examId).join(', ') : '(none — add config.exams[])'}`);
    startMdns();
  });

  process.on('SIGINT', () => {
    console.log('\n[PQQ Local Server] Shutting down...');
    server.close();
    const { closeDatabase } = require('./db/init');
    closeDatabase();
    process.exit(0);
  });
}
