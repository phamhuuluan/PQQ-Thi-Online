/**
 * Scoreboard — public ranking display
 * T-505: chỉ OFFICIALLY_APPROVED (backend filter)
 * T-506: polling 10s + jitter ±1.5s
 * T-507: tiebreak ranking (FE mirror for display consistency)
 * T-508: Hiệu ứng Thủ khoa
 */

(function() {
  'use strict';

  var container = document.getElementById('scoreboard-container');
  var examId = getExamIdFromUrl();
  var pollTimer = null;
  var lastVersion = null;
  var lastRanking = [];
  var isOffline = (typeof PqqSession !== 'undefined' && PqqSession.isOfflineExam)
    ? PqqSession.isOfflineExam()
    : (typeof getExamMode === 'function' && getExamMode() === 'offline');
  // T-506/T-906: polling theo exam.mode
  var BASE_INTERVAL = isOffline ? 4000 : 10000;
  var JITTER_MS = isOffline ? 500 : 1500;

  container.innerHTML = `
    <div class="scoreboard-toolbar">
      <div class="sb-meta">
        <span class="meta-label">Kỳ thi:</span>
        <strong id="sb-exam-id">${examId || '—'}</strong>
        <span id="sb-last-update" class="sb-update"></span>
      </div>
      <div class="sb-status">
        <span id="sb-poll-indicator" class="poll-dot"></span>
        <span id="sb-poll-label">Đang kết nối...</span>
      </div>
    </div>

    <div id="sb-champion" class="sb-champion hidden"></div>

    <div id="sb-table-wrap">
      <p class="loading">Đang tải bảng điểm...</p>
    </div>
  `;

  function loadPollingConfig() {
    if (typeof getConfig !== 'function') return Promise.resolve();
    return getConfig().then(function(cfg) {
      if (isOffline) {
        BASE_INTERVAL = cfg.scoreboardLanPollingInterval || 4000;
        JITTER_MS = cfg.scoreboardLanPollingJitterMs || 500;
      } else {
        BASE_INTERVAL = cfg.scoreboardPollingInterval || 10000;
        JITTER_MS = cfg.scoreboardPollingJitterMs || 1500;
      }
    }).catch(function() { /* use defaults */ });
  }

  loadPollingConfig().then(function() {
    if (!examId) {
      document.getElementById('sb-table-wrap').innerHTML =
        '<p class="error-msg">Thiếu examId. Thêm <code>?examId=PQQ-...</code> vào URL.</p>';
      return;
    }
    loadScoreboard();
    scheduleNextPoll();
  });

  function getExamIdFromUrl() {
    var params = new URLSearchParams(window.location.search);
    return params.get('examId') || localStorage.getItem('pqq_current_examId') || '';
  }

  function scheduleNextPoll() {
    if (pollTimer) clearTimeout(pollTimer);
    var jitter = (Math.random() * 2 - 1) * JITTER_MS; // ±1.5s
    var delay = BASE_INTERVAL + jitter;
    pollTimer = setTimeout(function() {
      loadScoreboard().then(scheduleNextPoll);
    }, delay);
  }

  window.addEventListener('beforeunload', function() {
    if (pollTimer) clearTimeout(pollTimer);
  });

  async function loadScoreboard() {
    setPollStatus('polling', 'Đang cập nhật...');

    var params = { examId: examId };
    if (lastVersion) params.sinceVersion = lastVersion;

    var result = await ApiClient.getScoreboard(params);

    if (!result.ok) {
      setPollStatus('error', 'Lỗi: ' + ((result.error && result.error.message) || result.error));
      return;
    }

    var data = result.data;

    // T-503: UNCHANGED — skip re-render
    if (data.unchanged) {
      setPollStatus('ok', 'Không thay đổi · ' + formatTime(data.timestamp));
      return;
    }

    lastVersion = data.version;
    var ranking = data.ranking || [];

    // T-507: FE tiebreak sort (mirror backend SB-03)
    ranking = sortRanking(ranking);
    ranking.forEach(function(r, i) { r.rank = i + 1; });

    var prevTopId = lastRanking.length ? lastRanking[0].studentId : null;
    lastRanking = ranking;

    renderTable(ranking);
    renderChampion(ranking, prevTopId);

    setPollStatus('ok', 'Cập nhật: ' + formatTime(data.timestamp));
    document.getElementById('sb-last-update').textContent =
      ranking.length + ' thí sinh · v' + data.version;
  }

  /** T-507: highest total → highest single column → lowest column */
  function sortRanking(ranking) {
    return ranking.slice().sort(function(a, b) {
      if (b.total !== a.total) return b.total - a.total;
      var aMax = Math.max(a.p1, a.p2, a.p3);
      var bMax = Math.max(b.p1, b.p2, b.p3);
      if (bMax !== aMax) return bMax - aMax;
      var aMin = Math.min(a.p1, a.p2, a.p3);
      var bMin = Math.min(b.p1, b.p2, b.p3);
      return aMin - bMin;
    });
  }

  /** T-505: Render ranking table */
  function renderTable(ranking) {
    var wrap = document.getElementById('sb-table-wrap');

    if (!ranking.length) {
      wrap.innerHTML = '<p class="empty-state">Chưa có điểm chính thức. Chờ CCK duyệt.</p>';
      return;
    }

    var rows = ranking.map(function(r) {
      var rankClass = r.rank === 1 ? 'rank-gold' : r.rank === 2 ? 'rank-silver' : r.rank === 3 ? 'rank-bronze' : '';
      return `
        <tr class="${rankClass}" data-student="${r.studentId}">
          <td class="rank-cell">${rankMedal(r.rank)}</td>
          <td class="name-cell">${escapeHtml(r.studentName)}</td>
          <td class="code-cell">${escapeHtml(r.studentCode || '')}</td>
          <td class="region-cell">${escapeHtml(r.clubOrRegion || '')}</td>
          <td class="score-cell">${fmt(r.p1)}</td>
          <td class="score-cell">${fmt(r.p2)}</td>
          <td class="score-cell">${fmt(r.p3)}</td>
          <td class="total-cell"><strong>${fmt(r.total)}</strong></td>
        </tr>`;
    }).join('');

    wrap.innerHTML = `
      <table class="data-table sb-table">
        <thead>
          <tr>
            <th>Hạng</th>
            <th>Võ sinh</th>
            <th>Mã</th>
            <th>Miền/CLB</th>
            <th>P1</th><th>P2</th><th>P3</th>
            <th>Tổng</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  /** T-508: Thủ khoa effect */
  function renderChampion(ranking, prevTopId) {
    var el = document.getElementById('sb-champion');
    if (!ranking.length) {
      el.classList.add('hidden');
      return;
    }

    var top = ranking[0];
    var isNewChampion = prevTopId && prevTopId !== top.studentId;

    el.classList.remove('hidden');
    el.className = 'sb-champion' + (isNewChampion ? ' champion-flash' : '');
    el.innerHTML = `
      <div class="champion-crown">👑</div>
      <div class="champion-info">
        <div class="champion-label">THỦ KHOA</div>
        <div class="champion-name">${escapeHtml(top.studentName)}</div>
        <div class="champion-score">${fmt(top.total)} điểm</div>
        ${top.studentCode ? '<div class="champion-code">' + escapeHtml(top.studentCode) + '</div>' : ''}
      </div>
    `;

    if (isNewChampion) {
      setTimeout(function() { el.classList.remove('champion-flash'); }, 3000);
    }
  }

  function rankMedal(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  }

  function fmt(n) {
    if (n === null || n === undefined || n === '') return '—';
    return Number(n).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  function formatTime(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    } catch (e) { return ''; }
  }

  function setPollStatus(state, label) {
    var dot = document.getElementById('sb-poll-indicator');
    var lbl = document.getElementById('sb-poll-label');
    dot.className = 'poll-dot poll-' + state;
    lbl.textContent = label;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();
