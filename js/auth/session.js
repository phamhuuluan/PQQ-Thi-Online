/**
 * Session — client-side session management.
 * Judge Session (Offline MVP): examId, examMode, role, judgeId, judgeName, judgeType.
 * examMode drives API backend selection (online → Apps Script, offline → Local Server).
 * Device rule: one Judge Session per browser tab/device at a time.
 */

var PqqSession = (function() {
  'use strict';

  var SESSION_KEY = 'pqq_session';

  function get() {
    var raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function set(data) {
    var current = get() || {};
    var merged = Object.assign({}, current, data);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(merged));
    if (merged.examMode === 'online' || merged.examMode === 'offline') {
      localStorage.setItem('pqq_exam_mode', merged.examMode);
    }
  }

  /** Replace entire session (used when creating a new login). */
  function replace(data) {
    sessionStorage.removeItem(SESSION_KEY);
    set(data || {});
  }

  function clear() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function getExamId() {
    var s = get();
    return s ? s.examId : null;
  }

  function getExamMode() {
    var s = get();
    if (s && s.examMode) return s.examMode;
    if (typeof PqqAdapter !== 'undefined' && PqqAdapter.getExamMode) {
      return PqqAdapter.getExamMode();
    }
    return localStorage.getItem('pqq_exam_mode');
  }

  function getRole() {
    var s = get();
    return s ? s.role : null;
  }

  function getJudgeType() {
    var s = get();
    return s ? s.judgeType : null;
  }

  function getJudgeId() {
    var s = get();
    return s ? s.judgeId : null;
  }

  function getJudgeName() {
    var s = get();
    return s ? s.judgeName : null;
  }

  function isOfflineExam() {
    return getExamMode() === 'offline';
  }

  /** Active Judge Session = role gk/judge + judgeId set. */
  function hasJudgeSession() {
    var s = get();
    if (!s) return false;
    var role = s.role;
    return (role === 'gk' || role === 'judge') && !!s.judgeId;
  }

  function judgePageForType(judgeType) {
    var t = (judgeType || 'theory').toLowerCase();
    if (t === 'practice') return 'judge-practice.html';
    if (t === 'both') return 'judge-full.html';
    return 'judge-theory.html';
  }

  function typeLabel(judgeType) {
    var t = (judgeType || 'theory').toLowerCase();
    if (t === 'practice') return 'Giám khảo thực hành';
    if (t === 'both') return 'Giám khảo đầy đủ';
    return 'Giám khảo lý thuyết';
  }

  function requireAuth(allowedRoles) {
    var session = get();
    if (!session || !session.role) {
      window.location.href = 'index.html';
      return null;
    }
    if (allowedRoles && allowedRoles.indexOf(session.role) === -1) {
      window.location.href = 'index.html';
      return null;
    }
    return session;
  }

  /**
   * Scoring pages: require Judge Session + optional page match by judgeType.
   */
  function requireJudgeSession() {
    var session = requireAuth(['gk', 'judge']);
    if (!session) return null;
    if (!session.judgeId) {
      clear();
      window.location.href = 'index.html';
      return null;
    }
    var expected = judgePageForType(session.judgeType);
    var path = (window.location.pathname || '').split('/').pop() || '';
    if (path && path !== expected && path.indexOf('judge-') === 0) {
      var q = session.examId ? '?examId=' + encodeURIComponent(session.examId) : '';
      window.location.replace(expected + q);
      return null;
    }
    return session;
  }

  /** Logout — clear Judge/role session, return to gate. */
  function logout() {
    clear();
    window.location.href = 'index.html';
  }

  return {
    get: get,
    set: set,
    replace: replace,
    clear: clear,
    logout: logout,
    getExamId: getExamId,
    getExamMode: getExamMode,
    getRole: getRole,
    getJudgeType: getJudgeType,
    getJudgeId: getJudgeId,
    getJudgeName: getJudgeName,
    hasJudgeSession: hasJudgeSession,
    judgePageForType: judgePageForType,
    typeLabel: typeLabel,
    isOfflineExam: isOfflineExam,
    requireAuth: requireAuth,
    requireJudgeSession: requireJudgeSession
  };
})();

if (typeof window !== 'undefined') {
  window.PqqSession = PqqSession;
}
