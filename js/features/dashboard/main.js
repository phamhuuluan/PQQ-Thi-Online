/**
 * Dashboard — Thư ký
 * T-405: danh sách phiếu + status badge
 * T-406: Nút Khoá phiếu
 * T-408: Disable UI khi status ≠ DRAFT
 * T-409: Realtime polling
 * T-707: Nút ĐỒNG BỘ hoàn chỉnh (Offline)
 * T-708: Sync log UI
 * T-805: PDF export trigger / download UX
 * T-806: Print CSS (via print-score.js)
 */

(function() {
  'use strict';

  var session = PqqSession.requireAuth(['tk', 'secretary', 'cck', 'admin']);
  if (!session) return;

  var container = document.getElementById('dashboard-container');
  var examId = session.examId || '';
  var POLL_INTERVAL = 10000; // 10s (T-409)
  var pollTimer = null;
  var isOffline = (typeof PqqSession !== 'undefined' && PqqSession.isOfflineExam)
    ? PqqSession.isOfflineExam()
    : (session.examMode === 'offline');

  // Render shell
  container.innerHTML = `
    <div class="dashboard-toolbar">
      <div class="toolbar-left">
        <span class="meta-label">Kỳ thi:</span>
        <strong id="dash-exam-id">${examId}</strong>
        <select id="dash-room-filter" class="room-filter">
          <option value="">Tất cả phòng</option>
        </select>
      </div>
      <div class="toolbar-right">
        <button id="btn-refresh" class="btn btn-sm">↻ Làm mới</button>
        ${isOffline ? '<button id="btn-pull" class="btn btn-sm btn-secondary">↓ Kéo Cloud</button>' : ''}
        <button id="btn-export-all-pdf" class="btn btn-sm btn-pdf">📄 Xuất tất cả PDF</button>
        <button id="btn-sync" class="btn btn-sync">⇅ ĐỒNG BỘ</button>
      </div>
    </div>

    <div id="dash-stats" class="dash-stats"></div>

    <div id="dash-table-wrap">
      <p class="loading">Đang tải dữ liệu...</p>
    </div>

    ${isOffline ? `
    <section id="sync-log-section" class="sync-log-section">
      <h3>Lịch sử đồng bộ</h3>
      <div id="sync-log-list" class="sync-log-list">
        <p class="loading">Đang tải log...</p>
      </div>
    </section>` : ''}
  `;

  // T-707: ĐỒNG BỘ — push to Cloud (Offline) or info (Online)
  document.getElementById('btn-sync').addEventListener('click', handleSync);
  document.getElementById('btn-export-all-pdf').addEventListener('click', handleExportAllPdf);

  if (isOffline) {
    var pullBtn = document.getElementById('btn-pull');
    if (pullBtn) pullBtn.addEventListener('click', handlePull);
    loadSyncLog();
  }

  document.getElementById('btn-refresh').addEventListener('click', function() {
    loadData();
    if (isOffline) loadSyncLog();
  });

  // Initial load + start polling (T-409)
  loadData();
  pollTimer = setInterval(loadData, POLL_INTERVAL);
  window.addEventListener('beforeunload', function() { clearInterval(pollTimer); });

  var _lastData = null;
  var _examMeta = { examId: examId };

  // T-805: Export all approved scores to PDF (Online → Drive)
  async function handleExportAllPdf() {
    if (!examId) {
      showToast('Chưa có examId.', 'error');
      return;
    }

    if (isOffline) {
      showToast('Xuất PDF lên Drive cần Internet. Dùng "In" trên từng phiếu đã duyệt để in USB tại sân.', 'info');
      return;
    }

    if (!_lastData || !_lastData.scores) {
      showToast('Chưa có dữ liệu. Vui lòng làm mới.', 'error');
      return;
    }

    var approved = _lastData.scores.filter(function(s) {
      return (s.STATUS || s.status) === 'OFFICIALLY_APPROVED';
    });

    if (!approved.length) {
      showToast('Không có phiếu OFFICIALLY_APPROVED để xuất PDF.', 'info');
      return;
    }

    if (!confirm('Xuất PDF cho ' + approved.length + ' phiếu đã duyệt lên Google Drive?')) return;

    var btn = document.getElementById('btn-export-all-pdf');
    btn.disabled = true;
    btn.textContent = 'Đang xuất...';

    var targets = approved.map(function(s) {
      return { idempotencyKey: s.IDEMPOTENCY_KEY || s.idempotency_key };
    });

    var result = await ApiClient.request('generatePdf', {
      examId: examId,
      targets: targets,
      session: { role: session.role },
    });

    btn.disabled = false;
    btn.textContent = '📄 Xuất tất cả PDF';

    if (result.ok) {
      var count = result.data.count || (result.data.generated && result.data.generated.length) || 0;
      showToast('Đã xuất ' + count + ' PDF lên Drive.', 'success');
      loadData();
    } else {
      showToast('Lỗi: ' + ((result.error && result.error.message) || result.error), 'error');
    }
  }

  // T-805: Export single score PDF
  async function handleExportPdf(e) {
    var btn = e.currentTarget;
    var idKey = btn.dataset.idkey;

    if (isOffline) {
      showToast('Dùng nút "In" để in USB tại sân. Xuất PDF Drive cần Internet.', 'info');
      return;
    }

    btn.disabled = true;
    btn.textContent = '...';

    var result = await ApiClient.request('generatePdf', {
      examId: examId,
      idempotencyKey: idKey,
      session: { role: session.role },
    });

    btn.disabled = false;
    btn.textContent = 'PDF';

    if (result.ok && result.data.pdfUrl) {
      showToast('PDF đã tạo!', 'success');
      window.open(result.data.pdfUrl, '_blank');
      loadData();
    } else {
      showToast('Lỗi: ' + ((result.error && result.error.message) || result.error), 'error');
    }
  }

  // T-806: Print preview (works offline)
  function handlePrintScore(e) {
    var btn = e.currentTarget;
    var idKey = btn.dataset.idkey;
    if (!_lastData || !_lastData.scores) return;

    var score = _lastData.scores.find(function(s) {
      return (s.IDEMPOTENCY_KEY || s.idempotency_key) === idKey;
    });
    if (!score) return;

    if (typeof PqqPrintScore !== 'undefined') {
      PqqPrintScore.openPrintPreview(score, _examMeta);
    } else {
      showToast('Print module chưa tải.', 'error');
    }
  }

  async function handleSync() {
    if (!isOffline) {
      showToast('Đang online — dữ liệu đã realtime trên Cloud. ĐỒNG BỘ chỉ dùng ở Offline B.', 'info');
      return;
    }

    if (!examId) {
      showToast('Chưa có examId trong session.', 'error');
      return;
    }

    if (!confirm('Đồng bộ điểm từ Local Server lên Google Sheets?\n\nChỉ thực hiện khi đã kết thúc giờ thi và có Internet.')) {
      return;
    }

    var btn = document.getElementById('btn-sync');
    btn.disabled = true;
    btn.textContent = 'Đang đồng bộ...';

    var result = await ApiClient.syncPush({
      examId: examId,
      session: { role: session.role },
    });

    btn.disabled = false;
    btn.textContent = '⇅ ĐỒNG BỘ';

    if (result.ok) {
      var d = result.data;
      var msg = 'Đồng bộ xong: ' + d.pushed + ' mới, ' + d.skipped + ' bỏ qua';
      if (d.conflicts) msg += ', ' + d.conflicts + ' cần xét (NEEDS_REVIEW)';
      showToast(msg, d.conflicts ? 'warn' : 'success');
      loadData();
      loadSyncLog();
    } else {
      var errMsg = (result.error && result.error.message) || result.error || 'Lỗi đồng bộ';
      showToast('Lỗi: ' + errMsg, 'error');
    }
  }

  async function handlePull() {
    if (!examId) {
      showToast('Chưa có examId trong session.', 'error');
      return;
    }

    if (!confirm('Kéo dữ liệu từ Google Sheets về Local Server?\n\nDùng trước giờ thi (tiền kỳ). Dữ liệu local students/judges sẽ được thay thế.')) {
      return;
    }

    var btn = document.getElementById('btn-pull');
    btn.disabled = true;
    btn.textContent = 'Đang kéo...';

    var result = await ApiClient.syncPull({
      examId: examId,
      session: { role: session.role },
    });

    btn.disabled = false;
    btn.textContent = '↓ Kéo Cloud';

    if (result.ok) {
      var c = result.data.counts;
      showToast('Kéo thành công: ' + c.students + ' TS, ' + c.judges + ' GK, ' + c.rooms + ' phòng', 'success');
      loadData();
      loadSyncLog();
    } else {
      var errMsg = (result.error && result.error.message) || result.error || 'Lỗi kéo dữ liệu';
      showToast('Lỗi: ' + errMsg, 'error');
    }
  }

  // T-708: Sync log UI
  async function loadSyncLog() {
    var list = document.getElementById('sync-log-list');
    if (!list) return;

    var result = await ApiClient.getSyncLog({ limit: 20 });
    if (!result.ok) {
      list.innerHTML = '<p class="error-msg">Không tải được sync log.</p>';
      return;
    }

    var logs = result.data.logs || [];
    if (!logs.length) {
      list.innerHTML = '<p class="empty-state">Chưa có lịch sử đồng bộ.</p>';
      return;
    }

    list.innerHTML = logs.map(function(log) {
      var detail = '';
      try {
        var parsed = JSON.parse(log.detail);
        if (parsed.counts) {
          detail = 'TS:' + parsed.counts.students + ' GK:' + parsed.counts.judges;
        } else if (parsed.pushed !== undefined) {
          detail = 'push:' + parsed.pushed + ' skip:' + parsed.skipped + ' conflict:' + (parsed.conflicts || 0);
        } else if (parsed.message) {
          detail = parsed.message;
        }
      } catch (e) {
        detail = log.detail || '';
      }

      return `<div class="sync-log-entry sync-${log.status}">
        <span class="sync-log-dir">${log.direction === 'pull' ? '↓' : '↑'} ${log.direction}</span>
        <span class="sync-log-status badge">${log.status}</span>
        <span class="sync-log-time">${formatTime(log.createdAt)}</span>
        <span class="sync-log-detail">${escapeHtml(detail)}</span>
      </div>`;
    }).join('');
  }

  async function loadData() {
    if (!examId) {
      document.getElementById('dash-table-wrap').innerHTML =
        '<p class="error-msg">Chưa có examId trong session. Vui lòng đăng nhập lại.</p>';
      return;
    }

    var roomId = document.getElementById('dash-room-filter').value || undefined;
    var result = await ApiClient.getData({
      examId: examId,
      role: session.role,
      ...(roomId ? { roomId } : {})
    });

    if (!result.ok) {
      document.getElementById('dash-table-wrap').innerHTML =
        `<p class="error-msg">Lỗi tải dữ liệu: ${(result.error && result.error.message) || result.error}</p>`;
      return;
    }

    var scores   = result.data.scores   || [];
    var students = result.data.students || [];
    _lastData = result.data;
    _examMeta = {
      examId: examId,
      examName: result.data.examName || examId,
    };

    // Populate room filter (once)
    var rooms = [...new Set(scores.map(s => s.ROOM_ID || s.room_id).filter(Boolean))];
    var roomFilter = document.getElementById('dash-room-filter');
    if (roomFilter.options.length === 1 && rooms.length) {
      rooms.forEach(function(r) {
        var opt = document.createElement('option');
        opt.value = r; opt.textContent = r;
        roomFilter.appendChild(opt);
      });
    }

    renderStats(scores);
    renderTable(scores, students);
  }

  function renderStats(scores) {
    var counts = { DRAFT: 0, PENDING_APPROVAL: 0, OFFICIALLY_APPROVED: 0, NEEDS_REVIEW: 0 };
    scores.forEach(function(s) {
      var st = s.STATUS || s.status || 'DRAFT';
      counts[st] = (counts[st] || 0) + 1;
    });

    document.getElementById('dash-stats').innerHTML = `
      <div class="stat-card"><span class="stat-num">${scores.length}</span><span class="stat-label">Tổng phiếu</span></div>
      <div class="stat-card stat-draft"><span class="stat-num">${counts.DRAFT}</span><span class="stat-label">DRAFT</span></div>
      <div class="stat-card stat-pending"><span class="stat-num">${counts.PENDING_APPROVAL}</span><span class="stat-label">Chờ duyệt</span></div>
      <div class="stat-card stat-approved"><span class="stat-num">${counts.OFFICIALLY_APPROVED}</span><span class="stat-label">Đã duyệt</span></div>
      ${counts.NEEDS_REVIEW ? `<div class="stat-card stat-review"><span class="stat-num">${counts.NEEDS_REVIEW}</span><span class="stat-label">Cần xét</span></div>` : ''}
    `;
  }

  function renderTable(scores, students) {
    var wrap = document.getElementById('dash-table-wrap');
    if (!scores.length) {
      wrap.innerHTML = '<p class="empty-state">Chưa có phiếu điểm nào.</p>';
      return;
    }

    var rows = scores.map(function(s) {
      var status = s.STATUS || s.status || 'DRAFT';
      var boutId = s.BOUT_ID || s.bout_id || '';
      var studentName = s.STUDENT_NAME || s.student_name || '';
      var studentId = s.STUDENT_ID || s.student_id || '';
      var judgeName = s.JUDGE_NAME || s.judge_name || '';
      var p1 = s.P1 ?? s.p1 ?? '-';
      var p2 = s.P2 ?? s.p2 ?? '-';
      var p3 = s.P3 ?? s.p3 ?? '-';
      var total = s.TOTAL ?? s.total ?? '-';
      var idKey = s.IDEMPOTENCY_KEY || s.idempotency_key || '';

      var canLock = status === 'DRAFT' && ['tk', 'secretary', 'admin'].includes(session.role);
      var lockBtn = canLock
        ? `<button class="btn btn-sm btn-lock" data-bout="${boutId}" data-student="${studentId}" data-exam="${examId}" data-room="${s.ROOM_ID || s.room_id || 'ROOM_A'}">Khoá</button>`
        : '';

      var isApproved = status === 'OFFICIALLY_APPROVED';
      var pdfUrl = s.PDF_URL || s.pdf_url || '';
      var pdfBtns = '';
      if (isApproved) {
        pdfBtns = `
          <button class="btn btn-sm btn-print" data-idkey="${idKey}" title="In USB">🖨 In</button>
          ${!isOffline ? `<button class="btn btn-sm btn-pdf" data-idkey="${idKey}" title="Xuất PDF Drive">PDF</button>` : ''}
          ${pdfUrl ? `<a href="${pdfUrl}" target="_blank" class="btn btn-sm btn-link" title="Tải PDF">↓</a>` : ''}`;
      }

      return `
        <tr>
          <td>${boutId}</td>
          <td>${studentName}</td>
          <td>${judgeName}</td>
          <td class="score-cell">${p1}</td>
          <td class="score-cell">${p2}</td>
          <td class="score-cell">${p3}</td>
          <td class="score-cell"><strong>${total}</strong></td>
          <td>${statusBadge(status)}</td>
          <td class="action-cell">${lockBtn} ${pdfBtns}</td>
        </tr>`;
    }).join('');

    wrap.innerHTML = `
      <table class="data-table dash-table">
        <thead>
          <tr>
            <th>Bout ID</th>
            <th>Thí sinh</th>
            <th>Giám khảo</th>
            <th>P1</th><th>P2</th><th>P3</th>
            <th>Tổng</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    wrap.querySelectorAll('.btn-lock').forEach(function(btn) {
      btn.addEventListener('click', handleLock);
    });
    wrap.querySelectorAll('.btn-pdf').forEach(function(btn) {
      btn.addEventListener('click', handleExportPdf);
    });
    wrap.querySelectorAll('.btn-print').forEach(function(btn) {
      btn.addEventListener('click', handlePrintScore);
    });
  }

  async function handleLock(e) {
    var btn = e.currentTarget;
    if (!confirm('Khoá phiếu này? Giám khảo sẽ không chỉnh sửa được nữa.')) return;

    btn.disabled = true;
    btn.textContent = 'Đang khoá...';

    var result = await ApiClient.request('lockSheet', {
      examId: btn.dataset.exam,
      roomId: btn.dataset.room,
      boutId: btn.dataset.bout,
      studentId: btn.dataset.student,
      session: { role: session.role }
    });

    if (result.ok) {
      showToast('Đã khoá phiếu ' + btn.dataset.bout + ' → PENDING_APPROVAL', 'success');
      loadData();
    } else {
      var msg = (result.error && result.error.message) || result.error || 'Lỗi khoá phiếu';
      showToast('Lỗi: ' + msg, 'error');
      btn.disabled = false;
      btn.textContent = 'Khoá';
    }
  }

  function statusBadge(status) {
    var map = {
      'DRAFT':               '<span class="badge badge-draft">DRAFT</span>',
      'PENDING_APPROVAL':    '<span class="badge badge-pending">Chờ duyệt</span>',
      'OFFICIALLY_APPROVED': '<span class="badge badge-approved">Đã duyệt</span>',
      'NEEDS_REVIEW':        '<span class="badge badge-review">Cần xét</span>'
    };
    return map[status] || `<span class="badge">${status}</span>`;
  }

  function formatTime(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    } catch (e) { return iso; }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function showToast(msg, type) {
    if (window.PqqToast) {
      PqqToast.show(msg, type || 'info');
    }
  }

})();
