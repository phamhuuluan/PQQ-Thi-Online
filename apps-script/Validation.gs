/**
 * Validation Layer — envelope format + error codes (API-01 A, API-02 A)
 */

function success(data) {
  return { ok: true, data: data };
}

function fail(code, message, details) {
  return {
    ok: false,
    error: {
      code: code,
      message: message || code,
      details: details || {}
    }
  };
}

function validateRequired(payload, fields) {
  var missing = [];
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
      missing.push(field);
    }
  }
  if (missing.length > 0) {
    return fail('VALIDATION_ERROR', 'Missing required fields: ' + missing.join(', '), { missing: missing });
  }
  return null;
}

function validateScoreRange(value, fieldName) {
  if (value === null || value === undefined) return null;
  var num = Number(value);
  if (isNaN(num) || num < 0 || num > 10) {
    return fail('VALIDATION_ERROR', fieldName + ' must be 0–10', { field: fieldName });
  }
  if (num % 0.5 !== 0) {
    return fail('VALIDATION_ERROR', fieldName + ' must be in steps of 0.5', { field: fieldName });
  }
  return null;
}

function validateStatusTransition(currentStatus, targetStatus) {
  var allowed = {
    'DRAFT': ['DRAFT', 'PENDING_APPROVAL'],
    'PENDING_APPROVAL': ['OFFICIALLY_APPROVED'],
    'OFFICIALLY_APPROVED': [],
    'NEEDS_REVIEW': ['DRAFT', 'PENDING_APPROVAL']
  };

  var targets = allowed[currentStatus] || [];
  if (targets.indexOf(targetStatus) === -1) {
    return fail('INVALID_STATUS_TRANSITION',
      'Cannot transition from ' + currentStatus + ' to ' + targetStatus,
      { current: currentStatus, target: targetStatus });
  }
  return null;
}
