/**
 * Dashboard — getData endpoint (requires TK/CCK/Admin role)
 * AUTH-09 B: separate endpoint from getScoreboard
 */

var Dashboard = (function() {

  function getData(params) {
    var examId = params.examId;
    var role = params.role;

    if (!examId) {
      return fail('VALIDATION_ERROR', 'examId is required');
    }

    // Permission check (FE-gated, API trusts role)
    var permErr = checkPermission(role, 'getData');
    if (permErr) return permErr;

    var scores = getAllRows(examId, 'SCORES');
    var students = getAllRows(examId, 'STUDENTS');
    var judges = getAllRows(examId, 'JUDGES');

    // Filter by roomId if provided
    var roomId = params.roomId;
    if (roomId) {
      scores = scores.filter(function(s) { return s.ROOM_ID === roomId; });
    }

    return success({
      examId: examId,
      scores: scores,
      students: students,
      judges: judges,
      timestamp: new Date().toISOString()
    });
  }

  return { getData: getData };
})();
