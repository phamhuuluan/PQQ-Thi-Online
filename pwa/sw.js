/**
 * PQQ Thi Online — Service Worker
 * T-902: Precache app shell (HTML/CSS/JS/assets) — never cache API
 */

const CACHE_VERSION = 'pqq-v1.0.0';
const SHELL_CACHE = 'pqq-shell-' + CACHE_VERSION;

/** App shell — static assets only (no /api/*) */
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/scoreboard.html',
  '/admin.html',
  '/approve.html',
  '/judge-theory.html',
  '/judge-practice.html',
  '/judge-full.html',
  '/styles.css',
  '/config.json',
  '/pwa/manifest.webmanifest',
  '/pwa/offline.html',
  '/assets/icons/icon.svg',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/js/api/adapter.js',
  '/js/api/client.js',
  '/js/auth/role-gate.js',
  '/js/auth/session.js',
  '/js/utils/health-banner.js',
  '/js/utils/pwa-head.js',
  '/js/utils/pwa-register.js',
  '/js/utils/toast.js',
  '/js/utils/error-handler.js',
  '/js/utils/print-score.js',
  '/js/features/dashboard/main.js',
  '/js/features/scoreboard/main.js',
  '/js/features/approval/main.js',
  '/js/features/admin/main.js',
  '/js/features/scoring/scoring-core.js',
  '/js/features/scoring/theory.js',
  '/js/features/scoring/practice.js',
  '/js/features/scoring/full.js',
];

function isApiRequest(url) {
  return url.pathname.startsWith('/api/') ||
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('googleusercontent.com');
}

function isStaticAsset(url) {
  if (url.origin !== self.location.origin) return false;
  if (isApiRequest(url)) return false;
  const ext = url.pathname.split('.').pop().toLowerCase();
  return ['html', 'css', 'js', 'json', 'png', 'svg', 'ico', 'webmanifest'].indexOf(ext) !== -1 ||
    url.pathname === '/' ||
    PRECACHE_URLS.indexOf(url.pathname) !== -1;
}

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(function(cache) {
        return cache.addAll(PRECACHE_URLS.map(function(u) {
          return new Request(u, { cache: 'reload' });
        }));
      })
      .then(function() { return self.skipWaiting(); })
      .catch(function(err) {
        console.warn('[SW] Precache partial failure:', err);
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(k) { return k.startsWith('pqq-shell-') && k !== SHELL_CACHE; })
          .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event) {
  var req = event.request;
  var url = new URL(req.url);

  // API: network-only — never cache
  if (isApiRequest(url)) {
    return;
  }

  // Non-GET: network-only
  if (req.method !== 'GET') {
    return;
  }

  // Cross-origin (Apps Script etc.): network-only
  if (url.origin !== self.location.origin) {
    return;
  }

  // Static shell: cache-first with network fallback
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then(function(cached) {
        var networkFetch = fetch(req).then(function(resp) {
          if (resp && resp.ok) {
            var clone = resp.clone();
            caches.open(SHELL_CACHE).then(function(cache) {
              cache.put(req, clone);
            });
          }
          return resp;
        }).catch(function() {
          if (cached) return cached;
          // T-903: offline navigation fallback
          if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
            return caches.match('/pwa/offline.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });

        return cached || networkFetch;
      })
    );
    return;
  }

  // Default: network with offline HTML fallback for navigation
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(function() {
        return caches.match('/pwa/offline.html');
      })
    );
  }
});
