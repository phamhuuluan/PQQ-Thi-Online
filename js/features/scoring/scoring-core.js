/**
 * Scoring Core — shared logic for all 3 scoring pages.
 * T-301–T-307, T-313
 * Handles: student picker, score inputs (0–10 step 0.5), boutId display,
 * GỬI ĐIỂM online+offline, disable on non-DRAFT status.
 */

var ScoringCore = (function() {
  'use strict';

  /**
   * Build score input HTML for given score fields.
   * @param {Array} fields — e.g. [{key:'P1', label:'Phần 1 (Lý thuyết)'}]
   */
  function buildScoreInputs(fields) {
    return fields.map(function(f) {
      return `
        <div class="form-group score-field">
          <label for="score-${f.key}">${f.label}</label>
          <div class="score-input-wrap">
            <input
              type="number"
              id="score-${f.key}"
              name="${f.key}"
              min="0" max="10" step="0.5"
              class="score-input"
              placeholder="0.0"
              required
            >
            <span class="score-range">(0 – 10, bước 0.5)</span>
          </div>
        </div>`;
    }).join('');
  }

  /**
   * Build student selector HTML from student list.
   */
  function buildStudentSelector(students) {
    var options = students.map(function(s) {
      var id = s.STUDENT_ID || s.student_id;
      var name = s.FULL_NAME || s.full_name;
      var code = s.STUDENT_CODE || s.student_code || '';
      return `<option value="${id}" data-name="${name}" data-code="${code}">${code ? code + ' — ' : ''}${name}</option>`;
    }).join('');
    return `
      <div class="form-group">
        <label for="select-student">Thí sinh</label>
        <select id="select-student" required>
          <option value="">-- Chọn thí sinh --</option>
          ${options}
        </select>
      </div>`;
  }

  /**
   * Build round selector.
   */
  function buildRoundSelector() {
    return `
      <div class="form-group">
        <label for="select-round">Vòng</label>
        <select id="select-round">
          <option value="R1">Vòng 1</option>
          <option value="R2">Vòng 2</option>
        </select>
      </div>`;
  }

  /**
   * Render the full scoring form into a container.
   * @param {HTMLElement} container
   * @param {object} opts - { fields, session, students, judges, judgeId, judgeName }
   */
  function renderForm(container, opts) {
    var session = opts.session;
    var judgeId = opts.judgeId || session.judgeId;
    var judgeName = opts.judgeName || session.judgeName || 'Giám khảo';
    if (!judgeId) {
      container.innerHTML =
        '<p class="error-msg">Thiếu phiên giám khảo. <a href="index.html">Đăng nhập lại</a>.</p>';
      return;
    }
    var examId = session.examId || '';
    var typeText = (typeof PqqSession !== 'undefined' && PqqSession.typeLabel)
      ? PqqSession.typeLabel(session.judgeType)
      : (session.judgeType || '');

    container.innerHTML = `
      <div class="scoring-page">
        <div class="score-header">
          <div class="score-meta">
            <span class="meta-label">Kỳ thi:</span>
            <span class="meta-value" id="display-exam-id">${examId}</span>
          </div>
          <div class="score-meta">
            <span class="meta-label">Giám khảo:</span>
            <span class="meta-value">${judgeName}${typeText ? ' — ' + typeText : ''}</span>
          </div>
          <button type="button" id="btn-judge-logout" class="btn btn-secondary btn-logout">Đăng xuất</button>
        </div>

        <form id="scoring-form" novalidate>
          ${buildStudentSelector(opts.students || [])}
          ${buildRoundSelector()}

          <div class="form-group">
            <label>Mã phiếu (boutId)</label>
            <input type="text" id="display-bout-id" readonly class="readonly-field" placeholder="Chọn thí sinh + vòng">
          </div>

          ${buildScoreInputs(opts.fields)}

          <div class="form-group">
            <label for="score-note">Ghi chú</label>
            <textarea id="score-note" rows="2" placeholder="Nhận xét (tuỳ chọn)"></textarea>
          </div>

          <div id="status-banner" class="status-banner hidden"></div>

          <div class="score-actions">
            <button type="submit" id="btn-submit" class="btn btn-submit">
              GỬI ĐIỂM
            </button>
            <span id="submit-feedback" class="submit-feedback"></span>
          </div>
        </form>

        <div id="score-history" class="score-history hidden">
          <h4>Phiếu đã gửi</h4>
          <div id="history-list"></div>
        </div>
      </div>
    `;

    var btnLogout = document.getElementById('btn-judge-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', function() {
        if (typeof PqqSession !== 'undefined' && PqqSession.logout) {
          PqqSession.logout();
        } else {
          sessionStorage.removeItem('pqq_session');
          window.location.href = 'index.html';
        }
      });
    }

    // Wire boutId auto-update (T-307)
    var selectStudent = document.getElementById('select-student');
    var selectRound = document.getElementById('select-round');
    var boutIdField = document.getElementById('display-bout-id');

    function updateBoutId() {
      var studentId = selectStudent.value;
      var round = selectRound.value;
      if (studentId && round) {
        boutIdField.value = studentId + '|' + round;
        checkExistingScore(examId, boutIdField.value, judgeId, opts);
      } else {
        boutIdField.value = '';
      }
    }

    selectStudent.addEventListener('change', updateBoutId);
    selectRound.addEventListener('change', updateBoutId);

    // Submit handler (T-304 Online + T-305 Offline)
    document.getElementById('scoring-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      await handleSubmit(opts, judgeId, judgeName);
    });
  }

  /**
   * T-309 / T-306: Check existing score status for this bout+judge.
   * Disables form if not DRAFT.
   */
  async function checkExistingScore(examId, boutId, judgeId, opts) {
    if (!examId || !boutId) return;
    try {
      var result = await ApiClient.getData({ examId: examId, role: opts.session.role });
      if (!result.ok) return;
      var scores = result.data.scores || [];
      var existing = scores.find(function(s) {
        return (s.BOUT_ID || s.bout_id) === boutId &&
               (s.JUDGE_ID || s.judge_id) === judgeId;
      });
      if (existing) {
        var status = existing.STATUS || existing.status;
        applyStatusToForm(status, existing);
      } else {
        enableForm();
      }
    } catch (e) { /* network error — leave form enabled */ }
  }

  /** T-306: Disable/enable form based on status. */
  function applyStatusToForm(status, existing) {
    var banner = document.getElementById('status-banner');
    var form = document.getElementById('scoring-form');
    var inputs = form.querySelectorAll('input.score-input, textarea');

    if (status !== 'DRAFT') {
      inputs.forEach(function(inp) { inp.disabled = true; });
      document.getElementById('btn-submit').disabled = true;
      banner.classList.remove('hidden');
      banner.textContent = 'Phiếu đã ở trạng thái: ' + status + ' — không thể chỉnh sửa.';
      banner.className = 'status-banner status-' + status.toLowerCase().replace('_', '-');

      // Pre-fill values for display
      if (existing) {
        ['P1','P2','P3'].forEach(function(k) {
          var el = document.getElementById('score-' + k);
          if (el) el.value = existing[k] || existing[k.toLowerCase()] || '';
        });
        var noteEl = document.getElementById('score-note');
        if (noteEl) noteEl.value = existing.NOTE || existing.note || '';
      }
    } else {
      enableForm();
      banner.classList.add('hidden');
    }
  }

  function enableForm() {
    var form = document.getElementById('scoring-form');
    if (!form) return;
    form.querySelectorAll('input.score-input, textarea').forEach(function(inp) {
      inp.disabled = false;
    });
    var btn = document.getElementById('btn-submit');
    if (btn) btn.disabled = false;
  }

  /**
   * T-304 + T-305: Handle submit — same payload, route to Online or Offline API.
   */
  async function handleSubmit(opts, judgeId, judgeName) {
    var btn = document.getElementById('btn-submit');
    var feedback = document.getElementById('submit-feedback');
    var form = document.getElementById('scoring-form');

    var boutId = document.getElementById('display-bout-id').value;
    var studentSelect = document.getElementById('select-student');
    var selectedOpt = studentSelect.options[studentSelect.selectedIndex];

    if (!boutId || !studentSelect.value) {
      showFeedback(feedback, 'Vui lòng chọn thí sinh và vòng.', 'error');
      return;
    }

    // Collect scores
    var scores = {};
    opts.fields.forEach(function(f) {
      var el = document.getElementById('score-' + f.key);
      if (el && el.value !== '') {
        scores[f.key] = parseFloat(el.value);
      }
    });

    // Client-side range validation
    for (var k in scores) {
      var v = scores[k];
      if (isNaN(v) || v < 0 || v > 10) {
        showFeedback(feedback, k + ' phải từ 0 đến 10.', 'error');
        return;
      }
      if (v % 0.5 !== 0) {
        showFeedback(feedback, k + ' phải là bội số của 0.5.', 'error');
        return;
      }
    }

    var payload = {
      action: 'submitScore',
      examId: opts.session.examId || '',
      roomId: opts.session.roomId || 'ROOM_A',
      boutId: boutId,
      student: {
        studentId: studentSelect.value,
        studentCode: selectedOpt ? selectedOpt.dataset.code : '',
        studentName: selectedOpt ? selectedOpt.dataset.name : ''
      },
      judge: { judgeId: judgeId, judgeName: judgeName },
      scores: scores,
      note: document.getElementById('score-note').value.trim(),
      clientRequestId: crypto.randomUUID ? crypto.randomUUID() : generateId(),
      idempotencyKey: buildIdempotencyKey(opts.session.examId, opts.session.roomId, boutId, studentSelect.value, judgeId),
      submittedAt: new Date().toISOString(),
      appVersion: '1.0.0'
    };

    btn.disabled = true;
    btn.textContent = 'Đang gửi...';
    showFeedback(feedback, '', '');

    var result = await ApiClient.request('submitScore', payload, {
      idempotencyKey: payload.idempotencyKey
    });

    if (result.ok) {
      var msg = result.data.duplicate
        ? 'Phiếu đã tồn tại (idempotent). Tổng: ' + result.data.total
        : 'Gửi điểm thành công! Tổng: ' + result.data.total;
      showFeedback(feedback, msg, 'success');
      appendHistory(payload, result.data);
      applyStatusToForm(result.data.status || 'DRAFT', null);
    } else {
      var errMsg = (result.error && result.error.message) ? result.error.message : (result.error || 'Lỗi không xác định');
      showFeedback(feedback, 'Lỗi: ' + errMsg, 'error');
      btn.disabled = false;
      btn.textContent = 'GỬI ĐIỂM';
    }
  }

  function buildIdempotencyKey(examId, roomId, boutId, studentId, judgeId) {
    return [examId, roomId || 'ROOM_A', boutId, studentId, judgeId].join('|');
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function showFeedback(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.className = 'submit-feedback' + (type ? ' feedback-' + type : '');
  }

  function appendHistory(payload, data) {
    var historySection = document.getElementById('score-history');
    var historyList = document.getElementById('history-list');
    if (!historySection || !historyList) return;
    historySection.classList.remove('hidden');
    var entry = document.createElement('div');
    entry.className = 'history-entry';
    entry.innerHTML = `<span class="history-bout">${payload.boutId}</span>
      <span class="history-scores">P1:${payload.scores.P1||'-'} P2:${payload.scores.P2||'-'} P3:${payload.scores.P3||'-'}</span>
      <span class="history-total">Tổng: ${data.total}</span>
      <span class="badge badge-draft">DRAFT</span>`;
    historyList.prepend(entry);
  }

  /**
   * Load students from API and render form.
   */
  async function init(container, judgeTypeFields) {
    var session = (typeof PqqSession !== 'undefined' && PqqSession.requireJudgeSession)
      ? PqqSession.requireJudgeSession()
      : PqqSession.requireAuth(['gk', 'judge']);
    if (!session) return;

    if (!session.judgeId) {
      container.innerHTML =
        '<p class="error-msg">Chưa có phiên giám khảo. <a href="index.html">Quay lại đăng nhập</a>.</p>';
      return;
    }

    container.innerHTML = '<p class="loading">Đang tải dữ liệu...</p>';

    var examId = session.examId;
    var students = [];
    var judgeId = session.judgeId;
    var judgeName = session.judgeName || 'Giám khảo';

    if (examId) {
      var result = await ApiClient.getData({ examId: examId, role: session.role });
      if (result.ok) {
        students = result.data.students || [];
        var judges = result.data.judges || [];
        var myJudge = judges.find(function(j) {
          return (j.JUDGE_ID || j.judge_id) === judgeId;
        });
        if (myJudge) {
          judgeName = myJudge.JUDGE_NAME || myJudge.judge_name || judgeName;
          var expectedType = (myJudge.JUDGE_TYPE || myJudge.judge_type || '').toLowerCase();
          if (expectedType && expectedType !== session.judgeType) {
            session.judgeType = expectedType;
            if (PqqSession.set) PqqSession.set({ judgeType: expectedType, judgeName: judgeName });
            var page = PqqSession.judgePageForType(expectedType);
            var path = (window.location.pathname || '').split('/').pop() || '';
            if (path !== page) {
              var q = examId ? '?examId=' + encodeURIComponent(examId) : '';
              window.location.replace(page + q);
              return;
            }
          }
        }
      } else {
        container.innerHTML =
          '<p class="error-msg">Không tải được danh sách thí sinh. Kiểm tra Local Server / sync pull. ' +
          '<a href="#" id="link-logout-err">Đăng xuất</a></p>';
        var link = document.getElementById('link-logout-err');
        if (link) {
          link.addEventListener('click', function(e) {
            e.preventDefault();
            PqqSession.logout();
          });
        }
        return;
      }
    }

    renderForm(container, {
      fields: judgeTypeFields,
      session: session,
      students: students,
      judgeId: judgeId,
      judgeName: judgeName
    });
  }

  return { init: init, buildScoreInputs: buildScoreInputs };
})();

if (typeof window !== 'undefined') window.ScoringCore = ScoringCore;
