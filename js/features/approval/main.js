/**
 * CCK Approval — click approve (no PIN) — AP-02
 * T-407: Màn CCK approval
 * T-408: Disable UI khi status ≠ PENDING_APPROVAL
 */

(function() {
  'use strict';

  var session = PqqSession.requireAuth(['cck', 'admin']);
  if (!session) return;

  var container = document.getElementById('approve-container');
  var examId = session.examId || '';
  var POLL_INTERVAL = 10000;
  var pollTimer = null;

  container.innerHTML = `
    <div class="dashboard-toolbar">
      <div class="toolbar-left">
        <span class="meta-label">Kỳ thi:</span>
        <strong>${examId}</strong>
      </div>
      <div class="toolbar-right">
        <button id="btn-refresh-approve" class="btn btn-sm">↻ Làm mới</button>
      </div>
    </div>

    <div id="approve-stats" class="dash-stats"></div>

    <div id="approve-table-wrap">
      <p class="loading">Đang tải dữ liệu...</p>
    </div>
  `;

  document.getElementById('btn-refresh-approve').addEventListener('click', loadData);

  loadData();
  pollTimer = setInterval(loadData, POLL_INTERVAL);
  window.addEventListener('beforeunload', function() { clearInterval(pollTimer); });

  async function loadData() {
    if (!examId) {
      document.getElementById('approve-table-wrap').innerHTML =
        '<p class="error-msg">Chưa có examId. Vui lòng đăng nhập lại.</p>';
      return;
    }

    var result = await ApiClient.getData({ examId: examId, role: session.role });
    if (!result.ok) {
      document.getElementById('approve-table-wrap').innerHTML =
        `<p class="error-msg">Lỗi: ${(result.error && result.error.message) || result.error}</p>`;
      return;
    }

    var scores = result.data.scores || [];
    renderStats(scores);
    renderApproveTable(scores);
  }

  function renderStats(scores) {
    var pending   = scores.filter(s => (s.STATUS || s.status) === 'PENDING_APPROVAL').length;
    var approved  = scores.filter(s => (s.STATUS || s.status) === 'OFFICIALLY_APPROVED').length;
    var draft     = scores.filter(s => (s.STATUS || s.status) === 'DRAFT').length;
    document.getElementById('approve-stats').innerHTML = `
      <div class="stat-card stat-pending"><span class="stat-num">${pending}</span><span class="stat-label">Chờ duyệt</span></div>
      <div class="stat-card stat-approved"><span class="stat-num">${approved}</span><span class="stat-label">Đã duyệt</span></div>
      <div class="stat-card stat-draft"><span class="stat-num">${draft}</span><span class="stat-label">DRAFT</span></div>
    `;
  }

  function renderApproveTable(scores) {
    var wrap = document.getElementById('approve-table-wrap');

    // Show PENDING_APPROVAL first, then DRAFT (for visibility), hide APPROVED
    var pending  = scores.filter(s => (s.STATUS || s.status) === 'PENDING_APPROVAL');
    var approved = scores.filter(s => (s.STATUS || s.status) === 'OFFICIALLY_APPROVED');

    if (!scores.length) {
      wrap.innerHTML = '<p class="empty-state">Chưa có phiếu nào.</p>';
      return;
    }

    var pendingRows = pending.map(s => scoreRow(s, true)).join('');
    var approvedRows = approved.map(s => scoreRow(s, false)).join('');

    wrap.innerHTML = `
      ${pending.length ? `
        <h4 class="section-heading">Chờ duyệt (${pending.length})</h4>
        <table class="data-table dash-table">
          <thead><tr>
            <th>Bout ID</th><th>Thí sinh</th><th>Giám khảo</th>
            <th>P1</th><th>P2</th><th>P3</th><th>Tổng</th><th>Khoá lúc</th><th></th>
          </tr></thead>
          <tbody>${pendingRows}</tbody>
        </table>` : '<p class="empty-state">Không có phiếu nào chờ duyệt.</p>'}

      ${approved.length ? `
        <h4 class="section-heading approved-heading">Đã duyệt (${approved.length})</h4>
        <table class="data-table dash-table">
          <thead><tr>
            <th>Bout ID</th><th>Thí sinh</th><th>Giám khảo</th>
            <th>P1</th><th>P2</th><th>P3</th><th>Tổng</th><th>Duyệt lúc</th><th></th>
          </tr></thead>
          <tbody>${approvedRows}</tbody>
        </table>` : ''}
    `;

    // T-407: Bind approve buttons
    wrap.querySelectorAll('.btn-approve').forEach(function(btn) {
      btn.addEventListener('click', handleApprove);
    });
  }

  function scoreRow(s, canApprove) {
    var status    = s.STATUS || s.status || '';
    var boutId    = s.BOUT_ID || s.bout_id || '';
    var name      = s.STUDENT_NAME || s.student_name || '';
    var judge     = s.JUDGE_NAME || s.judge_name || '';
    var p1        = s.P1 ?? s.p1 ?? '-';
    var p2        = s.P2 ?? s.p2 ?? '-';
    var p3        = s.P3 ?? s.p3 ?? '-';
    var total     = s.TOTAL ?? s.total ?? '-';
    var idKey     = s.IDEMPOTENCY_KEY || s.idempotency_key || '';
    var lockedAt  = s.LOCKED_AT || s.locked_at || '';
    var approvedAt = s.APPROVED_AT || s.approved_at || '';
    var timeCell  = status === 'PENDING_APPROVAL'
      ? formatTime(lockedAt)
      : formatTime(approvedAt);

    // T-407: approve button; T-408: disabled if already approved
    var actionCell = canApprove
      ? `<button class="btn btn-approve btn-sm" data-key="${idKey}" data-bout="${boutId}" data-exam="${examId}">✓ Duyệt</button>`
      : `<span class="badge badge-approved">✓ Đã duyệt</span>`;

    return `<tr>
      <td>${boutId}</td>
      <td>${name}</td>
      <td>${judge}</td>
      <td class="score-cell">${p1}</td>
      <td class="score-cell">${p2}</td>
      <td class="score-cell">${p3}</td>
      <td class="score-cell"><strong>${total}</strong></td>
      <td class="time-cell">${timeCell}</td>
      <td>${actionCell}</td>
    </tr>`;
  }

  // T-407: CCK approve — no PIN, just click confirm
  async function handleApprove(e) {
    var btn = e.currentTarget;
    var boutId = btn.dataset.bout;

    if (!confirm('Duyệt phiếu ' + boutId + '?\n(Không thể hoàn tác sau khi duyệt)')) return;

    btn.disabled = true;
    btn.textContent = 'Đang duyệt...';

    var result = await ApiClient.request('approveScore', {
      examId: btn.dataset.exam,
      targets: [{ idempotencyKey: btn.dataset.key }],
      approveIdempotencyKey: 'approve|' + btn.dataset.key + '|' + Date.now(),
      session: { role: session.role }
    });

    if (result.ok) {
      showToast('Đã duyệt phiếu ' + boutId + ' → OFFICIALLY_APPROVED ✓', 'success');
      loadData();
    } else {
      var msg = (result.error && result.error.message) || result.error || 'Lỗi duyệt';
      showToast('Lỗi: ' + msg, 'error');
      btn.disabled = false;
      btn.textContent = '✓ Duyệt';
    }
  }

  function formatTime(isoStr) {
    if (!isoStr) return '—';
    try {
      return new Date(isoStr).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    } catch (e) { return isoStr; }
  }

  function showToast(msg, type) {
    if (window.PqqToast) {
      PqqToast.show(msg, type || 'info');
    }
  }

})();
