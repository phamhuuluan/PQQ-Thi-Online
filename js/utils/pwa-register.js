/**
 * PWA registration + offline status banner
 * T-902: register Service Worker
 * T-903: offline shell fallback UX — online/offline indicator
 */

(function() {
  'use strict';

  var SW_URL = '/pwa/sw.js';
  var updateBanner = null;

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', function() {
      navigator.serviceWorker.register(SW_URL, { scope: '/' })
        .then(function(reg) {
          reg.addEventListener('updatefound', function() {
            var worker = reg.installing;
            if (!worker) return;
            worker.addEventListener('statechange', function() {
              if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                showUpdateBanner();
              }
            });
          });
        })
        .catch(function(err) {
          console.warn('[PWA] Service worker registration failed:', err);
        });
    });
  }

  function showUpdateBanner() {
    if (updateBanner || !window.PqqToast) return;
    updateBanner = PqqToast.show('Phiên bản mới đã sẵn sàng.', 'info', {
      duration: 0,
      action: { label: 'Tải lại', onClick: function() { window.location.reload(); } },
    });
  }

  function initOfflineBanner() {
    var banner = document.createElement('div');
    banner.id = 'pqq-offline-banner';
    banner.className = 'pqq-offline-banner hidden';
    banner.setAttribute('role', 'status');
    banner.innerHTML = '<span class="pqq-offline-icon">📡</span> <span class="pqq-offline-text">Đang offline — dữ liệu có thể chưa cập nhật</span>';
    document.body.appendChild(banner);

    function setOnlineState() {
      if (navigator.onLine) {
        banner.classList.add('hidden');
      } else {
        banner.classList.remove('hidden');
      }
    }

    window.addEventListener('online', setOnlineState);
    window.addEventListener('offline', setOnlineState);
    setOnlineState();
  }

  registerServiceWorker();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOfflineBanner);
  } else {
    initOfflineBanner();
  }
})();
