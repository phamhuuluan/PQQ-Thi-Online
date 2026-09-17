#!/usr/bin/env node
/**
 * T-906: Verify conservative polling config (DEC-DEP-04 B)
 * Online poll 10s, cache ~18-20s; LAN poll 3-5s
 * Run: node scripts/verify-polling-config.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const configPath = path.join(ROOT, 'config.json');
const scoreboardGs = path.join(ROOT, 'apps-script', 'Scoreboard.gs');
const scoreboardJs = path.join(ROOT, 'js', 'features', 'scoreboard', 'main.js');

const checks = [];
let failed = 0;

function pass(name, detail) {
  checks.push({ ok: true, name, detail });
  console.log('✓', name, '—', detail);
}

function fail(name, detail) {
  checks.push({ ok: false, name, detail });
  console.error('✗', name, '—', detail);
  failed++;
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

if (config.scoreboardPollingInterval >= 8000 && config.scoreboardPollingInterval <= 12000) {
  pass('config.scoreboardPollingInterval', config.scoreboardPollingInterval + 'ms (conservative 10s ±2s)');
} else {
  fail('config.scoreboardPollingInterval', config.scoreboardPollingInterval + 'ms — expected 8000–12000');
}

if (config.scoreboardPollingJitterMs >= 1000 && config.scoreboardPollingJitterMs <= 2000) {
  pass('config.scoreboardPollingJitterMs', '±' + config.scoreboardPollingJitterMs + 'ms');
} else {
  fail('config.scoreboardPollingJitterMs', config.scoreboardPollingJitterMs + 'ms — expected 1000–2000');
}

if (config.scoreboardCacheTtlSeconds >= 15 && config.scoreboardCacheTtlSeconds <= 20) {
  pass('config.scoreboardCacheTtlSeconds', config.scoreboardCacheTtlSeconds + 's');
} else {
  fail('config.scoreboardCacheTtlSeconds', config.scoreboardCacheTtlSeconds + 's — expected 15–20');
}

if (config.scoreboardLanPollingInterval >= 3000 && config.scoreboardLanPollingInterval <= 5000) {
  pass('config.scoreboardLanPollingInterval', config.scoreboardLanPollingInterval + 'ms (LAN 3–5s)');
} else {
  fail('config.scoreboardLanPollingInterval', config.scoreboardLanPollingInterval + 'ms — expected 3000–5000');
}

const gsContent = fs.readFileSync(scoreboardGs, 'utf8');
const cacheMatch = gsContent.match(/CACHE_TTL\s*=\s*(\d+)/);
if (cacheMatch) {
  const ttl = parseInt(cacheMatch[1], 10);
  if (ttl >= 15 && ttl <= 20) {
    pass('Scoreboard.gs CACHE_TTL', ttl + 's matches config');
  } else {
    fail('Scoreboard.gs CACHE_TTL', ttl + 's — expected 15–20');
  }
} else {
  fail('Scoreboard.gs CACHE_TTL', 'not found');
}

const jsContent = fs.readFileSync(scoreboardJs, 'utf8');
if (jsContent.includes('scoreboardPollingInterval')) {
  pass('scoreboard/main.js', 'reads polling from config.json');
} else {
  fail('scoreboard/main.js', 'missing config-driven polling');
}

console.log('\n--- Summary ---');
console.log('Passed:', checks.filter(function(c) { return c.ok; }).length);
console.log('Failed:', failed);

process.exit(failed > 0 ? 1 : 0);
