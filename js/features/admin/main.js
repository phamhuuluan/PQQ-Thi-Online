/**
 * Admin UI — truy cập trực tiếp qua admin.html (không hiện trên index).
 * Login gate riêng + tạo kỳ thi (chọn Online / Offline) + quản lý TS/GK/QR/pass.
 * T-206, T-207, T-208, T-209
 */

(function() {
  'use strict';

  var container = document.getElementById('admin-container');
  if (!container) return;

  var session = typeof PqqSession !== 'undefined' ? PqqSession.get() : null;
  if (!session || session.role !== 'admin') {
    renderLoginGate();
  } else {
    renderAdminApp();
  }

  // ─── Login gate (đường dẫn thẳng admin.html) ───

  function renderLoginGate() {
    container.innerHTML = `
      <section class="admin-section admin-login">
        <h2>Đăng nhập Admin</h2>
        <p class="form-hint">Trang quản trị không hiện trên trang chủ. Chỉ truy cập qua đường dẫn <code>admin.html</code>.</p>
        <form id="form-admin-login" class="admin-form">
          <div class="form-group">
            <label for="admin-pass">Mật khẩu Admin</label>
            <input type="password" id="admin-pass" autocomplete="current-password" placeholder="Mật khẩu Admin..." required>
          </div>
          <button type="submit" class="btn btn-primary" id="btn-admin-login">Đăng nhập</button>
          <p id="admin-login-error" class="error-msg hidden"></p>
        </form>
      </section>
    `;

    document.getElementById('form-admin-login').addEventListener('submit', async function(e) {
      e.preventDefault();
      var btn = document.getElementById('btn-admin-login');
      var errEl = document.getElementById('admin-login-error');
      var password = document.getElementById('admin-pass').value.trim();
      if (!password) return;

      btn.disabled = true;
      btn.textContent = 'Đang xác thực...';
      errEl.classList.add('hidden');

      try {
        var examConfig = await loadExamConfig();
        if (!examConfig) {
          showLoginError('Không tải được cấu hình Admin. Cần Internet + Apps Script (hoặc seed demo trên Local Server để test).');
          return;
        }

        var hash = examConfig.PASS_ADMIN_HASH || examConfig.pass_admin_hash;
        var salt = examConfig.PASS_ADMIN_SALT || examConfig.pass_admin_salt;
        if (!hash || !salt) {
          showLoginError('Thiếu cấu hình mật khẩu Admin.');
          return;
        }

        var inputHash = await sha256(salt + ':' + password);
        if (inputHash !== hash) {
          showLoginError('Mật khẩu Admin không đúng.');
          return;
        }

        var mode = (typeof PqqAdapter !== 'undefined' && PqqAdapter.parseExamMode)
          ? (PqqAdapter.parseExamMode(examConfig) || 'online')
          : 'online';
        if (typeof PqqAdapter !== 'undefined' && PqqAdapter.setExamContext) {
          PqqAdapter.setExamContext(examConfig);
        }
        PqqSession.set({
          examId: examConfig.EXAM_ID || examConfig.exam_id || '',
          examMode: mode,
          role: 'admin',
          loginAt: new Date().toISOString()
        });
        renderAdminApp();
      } catch (err) {
        showLoginError('Lỗi xác thực: ' + (err.message || err));
      } finally {
        btn.disabled = false;
        btn.textContent = 'Đăng nhập';
      }

      function showLoginError(msg) {
        errEl.textContent = msg;
        errEl.classList.remove('hidden');
      }
    });
  }

  // ─── Admin app ───

  function renderAdminApp() {
    container.innerHTML = `
      <nav class="admin-tabs">
        <button class="tab-btn active" data-tab="exam">Tạo kỳ thi</button>
        <button class="tab-btn" data-tab="students">Thí sinh</button>
        <button class="tab-btn" data-tab="judges">Giám khảo</button>
        <button class="tab-btn" data-tab="qr">QR / Links</button>
        <button class="tab-btn" data-tab="passwords">Mật khẩu</button>
      </nav>
      <div id="tab-content"></div>
    `;

    var tabBtns = container.querySelectorAll('.tab-btn');
    var tabContent = document.getElementById('tab-content');

    tabBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        tabBtns.forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        renderTab(this.dataset.tab);
      });
    });

    renderTab('exam');

    function renderTab(tab) {
      switch (tab) {
        case 'exam': renderExamTab(); break;
        case 'students': renderStudentsTab(); break;
        case 'judges': renderJudgesTab(); break;
        case 'qr': renderQrTab(); break;
        case 'passwords': renderPasswordsTab(); break;
      }
    }

    // === T-206: Tạo kỳ thi mới (chọn Online / Offline) ===
    function renderExamTab() {
      tabContent.innerHTML = `
        <section class="admin-section">
          <h3>Tạo kỳ thi mới</h3>
          <p class="form-hint">Chỉ Admin tạo kỳ thi tại đây (Apps Script). Online/Offline là <strong>thuộc tính kỳ thi</strong>. Local Server không tạo kỳ — Thư ký chỉ host LAN cho kỳ offline đã tạo sẵn.</p>
          <form id="form-create-exam" class="admin-form">
            <div class="form-group">
              <label>Loại kỳ thi (bắt buộc)</label>
              <div class="mode-selector" role="radiogroup" aria-label="Loại kỳ thi">
                <label class="mode-option">
                  <input type="radio" name="exam-mode" value="online" checked>
                  <span class="mode-option-body">
                    <strong>Online</strong>
                    <small>Ngày thi: GitHub Pages → Apps Script → Sheets (có Internet).</small>
                  </span>
                </label>
                <label class="mode-option">
                  <input type="radio" name="exam-mode" value="offline">
                  <span class="mode-option-body">
                    <strong>Offline</strong>
                    <small>Ngày thi: Thư ký host Local Server; GK/CCK chấm LAN realtime; sync Sheets sau.</small>
                  </span>
                </label>
              </div>
            </div>
            <div class="form-group">
              <label>Mã kỳ thi (examId)</label>
              <input type="text" id="exam-id" placeholder="VD: PQQ-HCM-2026-008" required>
            </div>
            <div class="form-group">
              <label>Tên kỳ thi</label>
              <input type="text" id="exam-name" placeholder="Kỳ thi thăng cấp..." required>
            </div>
            <div class="form-group">
              <label>Ngày thi</label>
              <input type="date" id="exam-date" required>
            </div>
            <div class="form-group">
              <label>Địa điểm</label>
              <input type="text" id="exam-location" placeholder="TP.HCM" required>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Mật khẩu GK</label>
                <input type="text" id="pass-judge" placeholder="Auto-gen nếu bỏ trống">
              </div>
              <div class="form-group">
                <label>Mật khẩu TK</label>
                <input type="text" id="pass-secretary" placeholder="Auto-gen nếu bỏ trống">
              </div>
              <div class="form-group">
                <label>Mật khẩu CCK</label>
                <input type="text" id="pass-cck" placeholder="Auto-gen nếu bỏ trống">
              </div>
            </div>
            <button type="submit" class="btn btn-primary">Tạo kỳ thi</button>
          </form>
          <div id="exam-result" class="result-box hidden"></div>
        </section>
      `;

      document.getElementById('form-create-exam').addEventListener('submit', async function(e) {
        e.preventDefault();
        var btn = this.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Đang tạo...';

        var modeInput = document.querySelector('input[name="exam-mode"]:checked');
        var mode = (modeInput && modeInput.value === 'offline') ? 'offline' : 'online';

        var result = await ApiClient.request('createExamRoom', {
          examId: document.getElementById('exam-id').value.trim(),
          name: document.getElementById('exam-name').value.trim(),
          examDate: document.getElementById('exam-date').value,
          location: document.getElementById('exam-location').value.trim(),
          mode: mode,
          passJudge: document.getElementById('pass-judge').value.trim() || undefined,
          passSecretary: document.getElementById('pass-secretary').value.trim() || undefined,
          passCck: document.getElementById('pass-cck').value.trim() || undefined,
          role: 'admin'
        });

        var resultBox = document.getElementById('exam-result');
        resultBox.classList.remove('hidden');

        if (result.ok) {
          var modeLabel = mode === 'offline' ? 'Offline (LAN ngày thi)' : 'Online';
          var html = '<p class="success-msg">Tạo kỳ thi thành công — mode=' + modeLabel + '</p>' +
            '<p><strong>exam.mode:</strong> ' + mode + '</p>' +
            '<p><strong>Spreadsheet:</strong> <a href="' + result.data.spreadsheetUrl + '" target="_blank">Mở</a></p>' +
            '<p><strong>Folder:</strong> <a href="' + result.data.folderUrl + '" target="_blank">Mở</a></p>' +
            '<p><strong>Pass GK:</strong> ' + (result.data.passes.judge) + '</p>' +
            '<p><strong>Pass TK:</strong> ' + (result.data.passes.secretary) + '</p>' +
            '<p><strong>Pass CCK:</strong> ' + (result.data.passes.cck) + '</p>';

          if (mode === 'offline') {
            html += '<div class="mode-next-steps">' +
              '<p><strong>Chuẩn bị ngày thi Offline (Thư ký host — không tạo kỳ):</strong></p>' +
              '<ol>' +
              '<li>Share Spreadsheet với Service Account (Editor)</li>' +
              '<li>Thêm vào <code>local-server/config.json</code> → <code>exams[]</code>: ' +
              '{ \"examId\": \"' + result.data.examId + '\", \"sheetsId\": \"' + (result.data.spreadsheetId || '') + '\" }</li>' +
              '<li>Laptop Thư ký: <code>cd local-server && npm start</code></li>' +
              '<li>Sync pull: <code>POST /api/sync/pull</code> với body <code>{ \"examId\": \"' + result.data.examId + '\", \"role\": \"secretary\" }</code></li>' +
              '<li>GK/CCK mở LAN URL, chọn đúng kỳ thi này, chấm realtime</li>' +
              '</ol></div>';
          }

          resultBox.innerHTML = html;
          localStorage.setItem('pqq_current_examId', result.data.examId);
          localStorage.setItem('pqq_exam_mode', mode);
          if (typeof PqqSession !== 'undefined') {
            PqqSession.set({ examId: result.data.examId, examMode: mode });
          }
        } else {
          resultBox.innerHTML = '<p class="error-msg">Lỗi: ' + (result.error.message || result.error) + '</p>';
        }

        btn.disabled = false;
        btn.textContent = 'Tạo kỳ thi';
      });
    }

    // === T-207: Quản lý thí sinh ===
    function renderStudentsTab() {
      var examId = localStorage.getItem('pqq_current_examId') || '';
      tabContent.innerHTML = `
        <section class="admin-section">
          <h3>Quản lý thí sinh</h3>
          <div class="form-group">
            <label>Mã kỳ thi</label>
            <input type="text" id="students-exam-id" value="${examId}" placeholder="PQQ-HCM-2026-008">
          </div>
          <div class="form-group">
            <label>Nhập danh sách thí sinh (JSON hoặc dán từ Excel)</label>
            <textarea id="students-data" rows="10" placeholder='[{"studentId":"VS-001","fullName":"Nguyễn Văn A","studentCode":"PQQ-001","clubOrRegion":"Miền Nam","gradeLevel":"Cấp 1"}]'></textarea>
          </div>
          <button id="btn-import-students" class="btn btn-primary">Import thí sinh</button>
          <div id="students-result" class="result-box hidden"></div>
          <hr>
          <h4>Danh sách thí sinh hiện tại</h4>
          <button id="btn-load-students" class="btn">Tải danh sách</button>
          <div id="students-list"></div>
        </section>
      `;

      document.getElementById('btn-import-students').addEventListener('click', async function() {
        var examId = document.getElementById('students-exam-id').value.trim();
        var dataRaw = document.getElementById('students-data').value.trim();
        if (!examId || !dataRaw) return;

        var students;
        try {
          students = JSON.parse(dataRaw);
        } catch (e) {
          students = parseTabSeparated(dataRaw);
        }

        this.disabled = true;
        var result = await ApiClient.request('importStudents', {
          examId: examId,
          students: students,
          role: 'admin'
        });

        var resultBox = document.getElementById('students-result');
        resultBox.classList.remove('hidden');
        if (result.ok) {
          resultBox.innerHTML = '<p class="success-msg">Import thành công: ' + result.data.imported + '/' + result.data.total + ' thí sinh.</p>';
        } else {
          resultBox.innerHTML = '<p class="error-msg">Lỗi: ' + (result.error.message || result.error) + '</p>';
        }
        this.disabled = false;
      });

      document.getElementById('btn-load-students').addEventListener('click', async function() {
        var examId = document.getElementById('students-exam-id').value.trim();
        if (!examId) return;

        var result = await ApiClient.getData({ examId: examId, role: 'admin' });
        var listDiv = document.getElementById('students-list');
        if (result.ok && result.data.students) {
          var students = result.data.students;
          if (students.length === 0) {
            listDiv.innerHTML = '<p>Chưa có thí sinh.</p>';
            return;
          }
          var html = '<table class="data-table"><thead><tr><th>Mã</th><th>Họ tên</th><th>CLB/Miền</th><th>Cấp</th></tr></thead><tbody>';
          students.forEach(function(s) {
            html += '<tr><td>' + (s.STUDENT_CODE || s.student_code || '') + '</td><td>' +
              (s.FULL_NAME || s.full_name || '') + '</td><td>' +
              (s.CLUB_OR_REGION || s.club_or_region || '') + '</td><td>' +
              (s.GRADE_LEVEL || s.grade_level || '') + '</td></tr>';
          });
          html += '</tbody></table>';
          listDiv.innerHTML = html;
        } else {
          listDiv.innerHTML = '<p class="error-msg">Không tải được danh sách.</p>';
        }
      });
    }

    // === T-208: Quản lý giám khảo ===
    function renderJudgesTab() {
      var examId = localStorage.getItem('pqq_current_examId') || '';
      tabContent.innerHTML = `
        <section class="admin-section">
          <h3>Quản lý giám khảo</h3>
          <div class="form-group">
            <label>Mã kỳ thi</label>
            <input type="text" id="judges-exam-id" value="${examId}">
          </div>
          <div class="form-group">
            <label>Danh sách giám khảo (JSON)</label>
            <textarea id="judges-data" rows="8" placeholder='[{"judgeId":"GK-101","judgeName":"Nguyễn Văn A","judgeType":"theory"}]'></textarea>
          </div>
          <button id="btn-config-judges" class="btn btn-primary">Cấu hình giám khảo</button>
          <div id="judges-result" class="result-box hidden"></div>
          <hr>
          <h4>Danh sách GK hiện tại</h4>
          <button id="btn-load-judges" class="btn">Tải danh sách</button>
          <div id="judges-list"></div>
        </section>
      `;

      document.getElementById('btn-config-judges').addEventListener('click', async function() {
        var examId = document.getElementById('judges-exam-id').value.trim();
        var dataRaw = document.getElementById('judges-data').value.trim();
        if (!examId || !dataRaw) return;

        var judges;
        try { judges = JSON.parse(dataRaw); } catch (e) { return; }

        this.disabled = true;
        var result = await ApiClient.request('configureJudges', {
          examId: examId,
          judges: judges,
          role: 'admin'
        });

        var resultBox = document.getElementById('judges-result');
        resultBox.classList.remove('hidden');
        if (result.ok) {
          resultBox.innerHTML = '<p class="success-msg">Cấu hình thành công: ' + result.data.configured + ' GK.</p>';
        } else {
          resultBox.innerHTML = '<p class="error-msg">Lỗi: ' + (result.error.message || result.error) + '</p>';
        }
        this.disabled = false;
      });

      document.getElementById('btn-load-judges').addEventListener('click', async function() {
        var examId = document.getElementById('judges-exam-id').value.trim();
        if (!examId) return;
        var result = await ApiClient.getData({ examId: examId, role: 'admin' });
        var listDiv = document.getElementById('judges-list');
        if (result.ok && result.data.judges) {
          var judges = result.data.judges;
          if (judges.length === 0) { listDiv.innerHTML = '<p>Chưa có GK.</p>'; return; }
          var html = '<table class="data-table"><thead><tr><th>Mã</th><th>Họ tên</th><th>Loại</th></tr></thead><tbody>';
          judges.forEach(function(j) {
            html += '<tr><td>' + (j.JUDGE_ID || j.judge_id || '') + '</td><td>' +
              (j.JUDGE_NAME || j.judge_name || '') + '</td><td>' +
              (j.JUDGE_TYPE || j.judge_type || '') + '</td></tr>';
          });
          html += '</tbody></table>';
          listDiv.innerHTML = html;
        } else {
          listDiv.innerHTML = '<p class="error-msg">Không tải được.</p>';
        }
      });
    }

    // === T-209: QR/link phòng thi ===
    function renderQrTab() {
      var examId = localStorage.getItem('pqq_current_examId') || '';
      tabContent.innerHTML = `
        <section class="admin-section">
          <h3>QR Code & Links phòng thi</h3>
          <div class="form-group">
            <label>Mã kỳ thi</label>
            <input type="text" id="qr-exam-id" value="${examId}">
          </div>
          <div class="form-group">
            <label>Base URL</label>
            <input type="text" id="qr-base-url" value="${window.location.origin}" placeholder="https://your-site.github.io/PQQ-Thi-Online">
          </div>
          <button id="btn-gen-qr" class="btn btn-primary">Tạo QR & Links</button>
          <div id="qr-result" class="result-box hidden"></div>
        </section>
      `;

      document.getElementById('btn-gen-qr').addEventListener('click', async function() {
        var examId = document.getElementById('qr-exam-id').value.trim();
        var baseUrl = document.getElementById('qr-base-url').value.trim();
        if (!examId) return;

        this.disabled = true;
        var result = await ApiClient.request('generateQrLinks', {
          examId: examId,
          baseUrl: baseUrl,
          role: 'admin'
        });

        var resultBox = document.getElementById('qr-result');
        resultBox.classList.remove('hidden');
        if (result.ok) {
          var html = '<h4>Links</h4><ul>';
          for (var key in result.data.links) {
            html += '<li><strong>' + key + ':</strong> <a href="' + result.data.links[key] + '" target="_blank">' + result.data.links[key] + '</a></li>';
          }
          html += '</ul><h4>QR Codes</h4><div class="qr-grid">';
          for (var key in result.data.qrLinks) {
            html += '<div class="qr-item"><img src="' + result.data.qrLinks[key] + '" alt="' + key + '"><p>' + key + '</p></div>';
          }
          html += '</div>';
          resultBox.innerHTML = html;
        } else {
          resultBox.innerHTML = '<p class="error-msg">Lỗi: ' + (result.error.message || result.error) + '</p>';
        }
        this.disabled = false;
      });
    }

    // === Passwords tab ===
    function renderPasswordsTab() {
      var examId = localStorage.getItem('pqq_current_examId') || '';
      tabContent.innerHTML = `
        <section class="admin-section">
          <h3>Đổi mật khẩu (3 role)</h3>
          <div class="form-group">
            <label>Mã kỳ thi</label>
            <input type="text" id="pw-exam-id" value="${examId}">
          </div>
          <div class="form-row">
            <div class="form-group"><label>Pass GK mới</label><input type="text" id="pw-judge" required></div>
            <div class="form-group"><label>Pass TK mới</label><input type="text" id="pw-secretary" required></div>
            <div class="form-group"><label>Pass CCK mới</label><input type="text" id="pw-cck" required></div>
          </div>
          <button id="btn-rotate-pw" class="btn btn-primary">Đổi mật khẩu</button>
          <div id="pw-result" class="result-box hidden"></div>
        </section>
      `;

      document.getElementById('btn-rotate-pw').addEventListener('click', async function() {
        var examId = document.getElementById('pw-exam-id').value.trim();
        var passJ = document.getElementById('pw-judge').value.trim();
        var passS = document.getElementById('pw-secretary').value.trim();
        var passC = document.getElementById('pw-cck').value.trim();
        if (!examId || !passJ || !passS || !passC) return;

        this.disabled = true;
        var result = await ApiClient.request('rotateRolePasswords', {
          examId: examId,
          passJudge: passJ,
          passSecretary: passS,
          passCck: passC,
          role: 'admin'
        });

        var resultBox = document.getElementById('pw-result');
        resultBox.classList.remove('hidden');
        resultBox.innerHTML = result.ok
          ? '<p class="success-msg">Đã đổi mật khẩu thành công cho 3 role.</p>'
          : '<p class="error-msg">Lỗi: ' + (result.error.message || result.error) + '</p>';
        this.disabled = false;
      });
    }
  }

  // Utility: parse tab-separated text (from Excel paste)
  function parseTabSeparated(text) {
    var lines = text.split('\n').filter(function(l) { return l.trim(); });
    if (lines.length < 2) return [];
    var headers = lines[0].split('\t').map(function(h) { return h.trim(); });
    var results = [];
    for (var i = 1; i < lines.length; i++) {
      var cols = lines[i].split('\t');
      var obj = {};
      headers.forEach(function(h, idx) { obj[h] = (cols[idx] || '').trim(); });
      results.push(obj);
    }
    return results;
  }

  async function loadExamConfig() {
    try {
      // Prefer an exam already in context; else first pulled exam on Local Server; else online API
      var urlExamId = new URLSearchParams(window.location.search).get('examId');
      var storedId = localStorage.getItem('pqq_current_examId');
      var examId = urlExamId || storedId;

      if (typeof ApiClient !== 'undefined' && ApiClient.listExams) {
        var listed = await ApiClient.listExams();
        if (listed.ok && listed.data && listed.data.exams && listed.data.exams.length) {
          if (!examId) examId = listed.data.exams[0].examId;
        }
      }

      if (examId && typeof ApiClient !== 'undefined' && ApiClient.getExamConfig) {
        var byId = await ApiClient.getExamConfig(examId);
        if (byId.ok && byId.data) return byId.data;
      }

      var stored = localStorage.getItem('pqq_exam_config');
      if (stored) return JSON.parse(stored);

      return null;
    } catch (e) {
      var fallback = localStorage.getItem('pqq_exam_config');
      if (fallback) return JSON.parse(fallback);
      return null;
    }
  }

  async function sha256(message) {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
      var encoder = new TextEncoder();
      var data = encoder.encode(message);
      var hashBuffer = await crypto.subtle.digest('SHA-256', data);
      var hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(function(b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
    }
    return sha256Pure(message);
  }

  function sha256Pure(message) {
    function rotr(n, x) { return (x >>> n) | (x << (32 - n)); }
    function ch(x, y, z) { return (x & y) ^ (~x & z); }
    function maj(x, y, z) { return (x & y) ^ (x & z) ^ (y & z); }
    function bsig0(x) { return rotr(2, x) ^ rotr(13, x) ^ rotr(22, x); }
    function bsig1(x) { return rotr(6, x) ^ rotr(11, x) ^ rotr(25, x); }
    function ssig0(x) { return rotr(7, x) ^ rotr(18, x) ^ (x >>> 3); }
    function ssig1(x) { return rotr(17, x) ^ rotr(19, x) ^ (x >>> 10); }

    var K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    var utf8 = unescape(encodeURIComponent(message));
    var bytes = [];
    for (var i = 0; i < utf8.length; i++) bytes.push(utf8.charCodeAt(i) & 0xff);

    var bitLen = bytes.length * 8;
    bytes.push(0x80);
    while ((bytes.length % 64) !== 56) bytes.push(0);
    for (var hi = 24; hi >= 0; hi -= 8) bytes.push((0 >>> hi) & 0xff);
    for (var lo = 24; lo >= 0; lo -= 8) bytes.push((bitLen >>> lo) & 0xff);

    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

    for (var offset = 0; offset < bytes.length; offset += 64) {
      var W = new Array(64);
      for (var t = 0; t < 16; t++) {
        var j = offset + t * 4;
        W[t] = ((bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3]) >>> 0;
      }
      for (t = 16; t < 64; t++) {
        W[t] = (ssig1(W[t - 2]) + W[t - 7] + ssig0(W[t - 15]) + W[t - 16]) >>> 0;
      }

      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (t = 0; t < 64; t++) {
        var T1 = (h + bsig1(e) + ch(e, f, g) + K[t] + W[t]) >>> 0;
        var T2 = (bsig0(a) + maj(a, b, c)) >>> 0;
        h = g; g = f; f = e; e = (d + T1) >>> 0;
        d = c; c = b; b = a; a = (T1 + T2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0;
      H[1] = (H[1] + b) >>> 0;
      H[2] = (H[2] + c) >>> 0;
      H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0;
      H[5] = (H[5] + f) >>> 0;
      H[6] = (H[6] + g) >>> 0;
      H[7] = (H[7] + h) >>> 0;
    }

    return H.map(function(x) {
      return ('00000000' + (x >>> 0).toString(16)).slice(-8);
    }).join('');
  }

})();
