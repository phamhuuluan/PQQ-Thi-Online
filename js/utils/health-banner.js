/**
 * Health Banner — shows Local Server health when active exam is offline.
 * Driven by exam.mode, not by hostname.
 */

var PqqHealthBanner = (function() {
  'use strict';

  var POLL_INTERVAL = 30000;
  var pollTimer = null;
  var bannerEl = null;

  function isOfflineExam() {
    if (typeof PqqSession !== 'undefined' && PqqSession.isOfflineExam) {
      return PqqSession.isOfflineExam();
    }
    if (typeof getExamMode === 'function') {
      return getExamMode() === 'offline';
    }
    return typeof isOfflineEnvironment === 'function' && isOfflineEnvironment();
  }

  function createBanner() {
    if (bannerEl) return bannerEl;
    bannerEl = document.createElement('div');
    bannerEl.id = 'pqq-health-banner';
    bannerEl.className = 'health-banner health-checking';
    bannerEl.innerHTML = '<span class="health-icon">⏳</span> <span class="health-text">Đang kiểm tra Local Server...</span>';
    document.body.prepend(bannerEl);
    return bannerEl;
  }

  function setStatus(status, message) {
    if (!bannerEl) return;
    bannerEl.className = 'health-banner health-' + status;
    var icon = status === 'ok' ? '✅' : status === 'warn' ? '⚠️' : '❌';
    bannerEl.innerHTML = '<span class="health-icon">' + icon + '</span> <span class="health-text">' + message + '</span>';
  }

  async function check() {
    if (!isOfflineExam()) {
      if (bannerEl) bannerEl.remove();
      bannerEl = null;
      return;
    }

    createBanner();

    if (typeof ApiClient === 'undefined' || !ApiClient.checkHealth) {
      setStatus('error', 'Local Server: ApiClient chưa sẵn sàng');
      return;
    }

    var result = await ApiClient.checkHealth();
    if (result.ok) {
      var data = result.data || {};
      var dbOk = data.db === 'ok';
      var examCount = (data.loadedExams && data.loadedExams.length) || 0;
      var msg = 'Kỳ offline · Local Server OK' +
        (data.hostname ? ' (' + data.hostname + ')' : '') +
        (dbOk ? ' · DB OK' : ' · DB lỗi') +
        (examCount ? ' · ' + examCount + ' kỳ đã pull' : '');
      setStatus(dbOk ? 'ok' : 'warn', msg);
    } else {
      setStatus('error', 'Local Server không phản hồi — Thư ký kiểm tra npm start trong local-server/');
    }
  }

  function init() {
    if (!isOfflineExam()) return;

    check();
    pollTimer = setInterval(check, POLL_INTERVAL);
    window.addEventListener('beforeunload', function() {
      if (pollTimer) clearInterval(pollTimer);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { check: check, init: init };
})();

if (typeof window !== 'undefined') {
  window.PqqHealthBanner = PqqHealthBanner;
}
