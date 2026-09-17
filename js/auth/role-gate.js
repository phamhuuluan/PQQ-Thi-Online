/**
 * Role Gate — exam selection + role + password.
 *
 * Flow: chọn kỳ thi (examId) → đọc exam.mode → đăng nhập role.
 * GK: sau pass đúng → chọn giám khảo (judgeId) → vào đúng form theo judgeType.
 * Backend API theo exam.mode, không theo hostname.
 */

(function() {
  'use strict';

  var MAX_ATTEMPTS = 5;
  var LOCKOUT_MS = 30000;
  var attempts = 0;
  var lockedUntil = 0;

  var selectedRole = null;
  var selectedExamId = null;
  var selectedExamConfig = null;
  var pendingGkAuth = false;
  var cachedJudges = [];

  var roleCards = document.querySelectorAll('.role-card');
  var passSection = document.getElementById('pass-section');
  var passInput = document.getElementById('pass-input');
  var passLabel = document.getElementById('pass-label');
  var btnLogin = document.getElementById('btn-login');
  var passError = document.getElementById('pass-error');
  var examSelect = document.getElementById('exam-select');
  var examInput = document.getElementById('exam-id-input');
  var examHint = document.getElementById('exam-hint');
  var btnLoadExam = document.getElementById('btn-load-exam');
  var judgeSection = document.getElementById('judge-section');
  var judgeSelect = document.getElementById('judge-select');
  var btnJudgeContinue = document.getElementById('btn-judge-continue');
  var judgeError = document.getElementById('judge-error');
  var activeBanner = document.getElementById('active-judge-banner');
  var activeJudgeText = document.getElementById('active-judge-text');
  var btnResumeJudge = document.getElementById('btn-resume-judge');
  var btnLogoutJudge = document.getElementById('btn-logout-judge');
  var roleLoginArea = document.getElementById('role-login-area');
  var examSection = document.getElementById('exam-section');

  var roleConfig = {
    gk: { label: 'Giám khảo', needsPass: true, redirect: null },
    tk: { label: 'Thư ký', needsPass: true, redirect: 'dashboard.html' },
    cck: { label: 'Chánh chủ khảo', needsPass: true, redirect: 'approve.html' },
    scoreboard: { label: 'Bảng điểm', needsPass: false, redirect: 'scoreboard.html' }
  };

  if (btnResumeJudge) {
    btnResumeJudge.addEventListener('click', function() {
      var s = PqqSession.get();
      if (!s || !s.judgeId) return;
      var page = PqqSession.judgePageForType(s.judgeType);
      var q = s.examId ? '?examId=' + encodeURIComponent(s.examId) : '';
      window.location.href = page + q;
    });
  }
  if (btnLogoutJudge) {
    btnLogoutJudge.addEventListener('click', function() {
      PqqSession.logout();
    });
  }

  showActiveJudgeBannerIfNeeded();
  initExamPicker();

  roleCards.forEach(function(card) {
    card.addEventListener('click', function() {
      selectRole(this.dataset.role);
    });
  });

  if (btnLogin) btnLogin.addEventListener('click', handleLogin);
  if (passInput) {
    passInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') handleLogin();
    });
  }
  if (btnLoadExam) btnLoadExam.addEventListener('click', loadSelectedExam);
  if (examSelect) {
    examSelect.addEventListener('change', function() {
      selectedExamId = this.value || null;
      selectedExamConfig = null;
    });
  }
  if (btnJudgeContinue) btnJudgeContinue.addEventListener('click', completeJudgeLogin);
  if (judgeSelect) {
    judgeSelect.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') completeJudgeLogin();
    });
  }

  async function initExamPicker() {
    var urlExamId = new URLSearchParams(window.location.search).get('examId');
    var onLocalHost = typeof PqqAdapter !== 'undefined' && PqqAdapter.isLocalServerHost &&
      PqqAdapter.isLocalServerHost();

    if (examHint) {
      examHint.textContent = onLocalHost
        ? 'Local Server: chọn kỳ offline đã được Admin tạo và Thư ký đã sync pull.'
        : 'Nhập mã kỳ thi (examId). Hệ thống đọc exam.mode để chọn Online API hoặc Local Server.';
    }

    if (onLocalHost && typeof ApiClient !== 'undefined' && ApiClient.listExams) {
      var listed = await ApiClient.listExams();
      if (listed.ok && listed.data && listed.data.exams && listed.data.exams.length) {
        populateExamSelect(listed.data.exams, urlExamId);
        if (examInput) examInput.classList.add('hidden');
        if (examSelect) examSelect.classList.remove('hidden');
        if (urlExamId) {
          selectedExamId = urlExamId;
          await loadSelectedExam();
        }
        return;
      }
    }

    if (examSelect) examSelect.classList.add('hidden');
    if (examInput) {
      examInput.classList.remove('hidden');
      if (urlExamId) examInput.value = urlExamId;
    }
    if (urlExamId) {
      selectedExamId = urlExamId;
      await loadSelectedExam();
    }
  }

  function populateExamSelect(exams, preferredId) {
    if (!examSelect) return;
    examSelect.innerHTML = '<option value="">— Chọn kỳ thi —</option>';
    exams.forEach(function(ex) {
      var opt = document.createElement('option');
      opt.value = ex.examId;
      opt.textContent = ex.examId + (ex.name ? ' — ' + ex.name : '') +
        (ex.mode ? ' [' + ex.mode + ']' : '');
      if (preferredId && preferredId === ex.examId) opt.selected = true;
      examSelect.appendChild(opt);
    });
    if (preferredId) selectedExamId = preferredId;
  }

  async function loadSelectedExam() {
    var examId = (examSelect && !examSelect.classList.contains('hidden') && examSelect.value) ||
      (examInput && examInput.value.trim()) ||
      selectedExamId ||
      new URLSearchParams(window.location.search).get('examId');

    if (!examId) {
      showError('Vui lòng chọn hoặc nhập mã kỳ thi.');
      return;
    }

    selectedExamId = examId;
    if (btnLoadExam) {
      btnLoadExam.disabled = true;
      btnLoadExam.textContent = 'Đang tải...';
    }

    try {
      var result;
      if (typeof ApiClient !== 'undefined' && ApiClient.getExamConfig) {
        result = await ApiClient.getExamConfig(examId);
      } else {
        result = { ok: false, error: 'ApiClient unavailable' };
      }

      if (!result.ok || !result.data) {
        showError((result.error && result.error.message) || result.error ||
          'Không tải được kỳ thi ' + examId);
        selectedExamConfig = null;
        return;
      }

      selectedExamConfig = result.data;
      var mode = (typeof PqqAdapter !== 'undefined' && PqqAdapter.parseExamMode)
        ? (PqqAdapter.parseExamMode(selectedExamConfig) || 'online')
        : 'online';
      if (typeof PqqAdapter !== 'undefined' && PqqAdapter.setExamContext) {
        PqqAdapter.setExamContext(selectedExamConfig);
      }
      if (passError) passError.classList.add('hidden');
      if (examHint) {
        examHint.textContent = 'Kỳ thi ' + examId + ' · mode=' + mode +
          (mode === 'offline'
            ? ' → Local Server (LAN realtime)'
            : ' → Apps Script (Online)');
      }
    } catch (err) {
      showError('Lỗi tải kỳ thi: ' + err.message);
      selectedExamConfig = null;
    } finally {
      if (btnLoadExam) {
        btnLoadExam.disabled = false;
        btnLoadExam.textContent = 'Tải kỳ thi';
      }
    }
  }

  function showActiveJudgeBannerIfNeeded() {
    if (typeof PqqSession === 'undefined' || !PqqSession.hasJudgeSession()) {
      if (activeBanner) activeBanner.classList.add('hidden');
      if (roleLoginArea) roleLoginArea.classList.remove('hidden');
      if (examSection) examSection.classList.remove('hidden');
      return true;
    }
    var s = PqqSession.get();
    var label = PqqSession.typeLabel ? PqqSession.typeLabel(s.judgeType) : s.judgeType;
    if (activeJudgeText) {
      activeJudgeText.textContent =
        'Thiết bị này đang đăng nhập giám khảo: ' + (s.judgeName || 'Giám khảo') +
        ' — ' + label + '. Muốn đổi người chấm phải Đăng xuất trước.';
    }
    if (activeBanner) activeBanner.classList.remove('hidden');
    if (roleLoginArea) roleLoginArea.classList.add('hidden');
    if (examSection) examSection.classList.add('hidden');
    return false;
  }

  function selectRole(role) {
    if (typeof PqqSession !== 'undefined' && PqqSession.hasJudgeSession()) {
      showError('Thiết bị đang có phiên giám khảo. Hãy Đăng xuất trước khi đăng nhập khác.');
      showActiveJudgeBannerIfNeeded();
      return;
    }

    selectedRole = role;
    pendingGkAuth = false;
    cachedJudges = [];
    var config = roleConfig[role];

    roleCards.forEach(function(c) { c.classList.remove('active'); });
    var el = document.querySelector('[data-role="' + role + '"]');
    if (el) el.classList.add('active');

    hideJudgeSection();

    if (!config.needsPass) {
      if (passSection) passSection.classList.add('hidden');
      ensureExamThenRedirect(config.redirect);
      return;
    }

    if (passSection) passSection.classList.remove('hidden');
    passLabel.textContent = 'Nhập mật khẩu ' + config.label + ':';
    passInput.value = '';
    passError.classList.add('hidden');
    passInput.focus();
  }

  async function ensureExamThenRedirect(redirect) {
    if (!selectedExamConfig) await loadSelectedExam();
    if (!selectedExamConfig) {
      showError('Cần chọn kỳ thi trước.');
      return;
    }
    var mode = (typeof PqqAdapter !== 'undefined' && PqqAdapter.parseExamMode)
      ? (PqqAdapter.parseExamMode(selectedExamConfig) || 'online')
      : 'online';
    var examId = selectedExamConfig.EXAM_ID || selectedExamConfig.exam_id || selectedExamId;
    if (typeof PqqSession !== 'undefined') {
      PqqSession.set({ examId: examId, examMode: mode, role: 'scoreboard', loginAt: new Date().toISOString() });
    }
    var url = redirect + (redirect.indexOf('?') >= 0 ? '&' : '?') + 'examId=' + encodeURIComponent(examId);
    window.location.href = url;
  }

  async function handleLogin() {
    if (!selectedRole) return;

    var now = Date.now();
    if (now < lockedUntil) {
      var remaining = Math.ceil((lockedUntil - now) / 1000);
      showError('Vui lòng chờ ' + remaining + 's trước khi thử lại.');
      return;
    }

    var password = passInput.value.trim();
    if (!password) {
      showError('Vui lòng nhập mật khẩu.');
      return;
    }

    btnLogin.disabled = true;
    btnLogin.textContent = 'Đang xác thực...';

    try {
      if (!selectedExamConfig) await loadSelectedExam();
      var examConfig = selectedExamConfig;
      if (!examConfig) {
        showError('Không tải được cấu hình kỳ thi. Chọn/nhập examId rồi bấm Tải kỳ thi.');
        return;
      }

      var hashData = getHashForRole(selectedRole, examConfig);
      if (!hashData || !hashData.hash || !hashData.salt) {
        showError('Cấu hình role không hợp lệ.');
        return;
      }

      var inputHash = await sha256(hashData.salt + ':' + password);

      if (inputHash === hashData.hash) {
        attempts = 0;
        if (selectedRole === 'gk') {
          await beginJudgeSelection(examConfig);
        } else {
          createSession(selectedRole, examConfig, null);
          redirectAfterAuth(selectedRole, null);
        }
      } else {
        attempts++;
        if (attempts >= MAX_ATTEMPTS) {
          lockedUntil = Date.now() + LOCKOUT_MS;
          attempts = 0;
          showError('Quá nhiều lần sai. Vui lòng chờ 30 giây.');
        } else {
          showError('Mật khẩu không đúng. Còn ' + (MAX_ATTEMPTS - attempts) + ' lần thử.');
        }
      }
    } catch (err) {
      showError('Lỗi xác thực: ' + err.message);
    } finally {
      btnLogin.disabled = false;
      btnLogin.textContent = 'Đăng nhập';
    }
  }

  async function beginJudgeSelection(examConfig) {
    pendingGkAuth = true;
    hideError();
    if (passSection) passSection.classList.add('hidden');
    if (judgeSection) judgeSection.classList.remove('hidden');
    if (judgeError) {
      judgeError.classList.add('hidden');
      judgeError.textContent = '';
    }
    if (btnJudgeContinue) {
      btnJudgeContinue.disabled = true;
      btnJudgeContinue.textContent = 'Đang tải danh sách...';
    }

    var examId = examConfig.EXAM_ID || examConfig.exam_id || selectedExamId;
    if (typeof PqqAdapter !== 'undefined' && PqqAdapter.setExamContext) {
      PqqAdapter.setExamContext(examConfig);
    }

    var result = await ApiClient.getData({ examId: examId, role: 'gk' });
    if (!result.ok) {
      var msg = (result.error && result.error.message) || result.error || 'Không tải được danh sách giám khảo.';
      showJudgeError(msg + ' (Thư ký cần sync pull trước.)');
      if (btnJudgeContinue) {
        btnJudgeContinue.disabled = false;
        btnJudgeContinue.textContent = 'Thử lại';
      }
      return;
    }

    cachedJudges = result.data.judges || [];
    populateJudgeSelect(cachedJudges);
    if (btnJudgeContinue) {
      btnJudgeContinue.disabled = false;
      btnJudgeContinue.textContent = 'Bắt đầu chấm thi';
    }

    if (!cachedJudges.length) {
      showJudgeError('Chưa có giám khảo trong kỳ thi. Admin import GK rồi Thư ký sync pull.');
    } else if (judgeSelect) {
      judgeSelect.focus();
    }
  }

  function populateJudgeSelect(judges) {
    if (!judgeSelect) return;
    judgeSelect.innerHTML = '<option value="">— Chọn giám khảo —</option>';
    judges.forEach(function(j) {
      var id = j.JUDGE_ID || j.judge_id;
      var name = j.JUDGE_NAME || j.judge_name || 'Giám khảo';
      var type = (j.JUDGE_TYPE || j.judge_type || 'theory').toLowerCase();
      var opt = document.createElement('option');
      opt.value = id;
      // UI: tên + loại — không hiện mã GK-xxx
      opt.textContent = name + ' - ' + typeLabel(type);
      opt.dataset.name = name;
      opt.dataset.type = type;
      judgeSelect.appendChild(opt);
    });
  }

  function typeLabel(type) {
    if (typeof PqqSession !== 'undefined' && PqqSession.typeLabel) {
      return PqqSession.typeLabel(type);
    }
    if (type === 'practice') return 'Giám khảo thực hành';
    if (type === 'both') return 'Giám khảo đầy đủ';
    return 'Giám khảo lý thuyết';
  }

  function completeJudgeLogin() {
    if (!pendingGkAuth || !selectedExamConfig) {
      showJudgeError('Vui lòng đăng nhập lại.');
      return;
    }
    if (!judgeSelect || !judgeSelect.value) {
      showJudgeError('Vui lòng chọn giám khảo của bạn.');
      return;
    }
    var opt = judgeSelect.options[judgeSelect.selectedIndex];
    var judge = {
      judgeId: judgeSelect.value,
      judgeName: opt.dataset.name || judgeSelect.value,
      judgeType: (opt.dataset.type || 'theory').toLowerCase()
    };
    createSession('gk', selectedExamConfig, judge);
    redirectAfterAuth('gk', judge);
  }

  function getHashForRole(role, config) {
    var map = {
      gk: { hash: config.PASS_JUDGE_HASH || config.pass_judge_hash, salt: config.PASS_JUDGE_SALT || config.pass_judge_salt },
      tk: { hash: config.PASS_SECRETARY_HASH || config.pass_secretary_hash, salt: config.PASS_SECRETARY_SALT || config.pass_secretary_salt },
      cck: { hash: config.PASS_CCK_HASH || config.pass_cck_hash, salt: config.PASS_CCK_SALT || config.pass_cck_salt }
    };
    return map[role] || null;
  }

  function createSession(role, config, judge) {
    var mode = (typeof PqqAdapter !== 'undefined' && PqqAdapter.parseExamMode)
      ? (PqqAdapter.parseExamMode(config) || 'online')
      : 'online';
    if (typeof PqqAdapter !== 'undefined' && PqqAdapter.setExamContext) {
      PqqAdapter.setExamContext(config);
    }
    var session = {
      examId: config.EXAM_ID || config.exam_id || selectedExamId || '',
      examMode: mode,
      role: role,
      loginAt: new Date().toISOString()
    };
    if (judge) {
      session.judgeId = judge.judgeId;
      session.judgeName = judge.judgeName;
      session.judgeType = judge.judgeType;
    }
    // Device rule: replace toàn bộ session — 1 thiết bị = 1 phiên
    if (typeof PqqSession !== 'undefined' && PqqSession.replace) {
      PqqSession.replace(session);
    } else if (typeof PqqSession !== 'undefined' && PqqSession.set) {
      PqqSession.clear();
      PqqSession.set(session);
    } else {
      sessionStorage.setItem('pqq_session', JSON.stringify(session));
    }
  }

  function redirectAfterAuth(role, judge) {
    var config = roleConfig[role];
    var examId = (typeof PqqSession !== 'undefined' && PqqSession.getExamId)
      ? PqqSession.getExamId()
      : selectedExamId;
    var q = examId ? '?examId=' + encodeURIComponent(examId) : '';
    if (role === 'gk') {
      var page = (typeof PqqSession !== 'undefined' && PqqSession.judgePageForType)
        ? PqqSession.judgePageForType(judge && judge.judgeType)
        : judgePageForType(judge && judge.judgeType);
      window.location.href = page + q;
    } else {
      window.location.href = config.redirect + q;
    }
  }

  function judgePageForType(judgeType) {
    var t = (judgeType || 'theory').toLowerCase();
    if (t === 'practice') return 'judge-practice.html';
    if (t === 'both') return 'judge-full.html';
    return 'judge-theory.html';
  }

  function hideJudgeSection() {
    if (judgeSection) judgeSection.classList.add('hidden');
    if (judgeError) {
      judgeError.classList.add('hidden');
      judgeError.textContent = '';
    }
  }

  function showError(msg) {
    if (!passError) return;
    passError.textContent = msg;
    passError.classList.remove('hidden');
  }

  function hideError() {
    if (passError) passError.classList.add('hidden');
  }

  function showJudgeError(msg) {
    if (!judgeError) return;
    judgeError.textContent = msg;
    judgeError.classList.remove('hidden');
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
