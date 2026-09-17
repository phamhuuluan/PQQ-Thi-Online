/**
 * Standard API envelope — mirrors apps-script/Validation.gs (API-01 A)
 */

function success(data) {
  return { ok: true, data };
}

function fail(code, message, details) {
  return {
    ok: false,
    error: {
      code,
      message: message || code,
      details: details || {},
    },
  };
}

function sendJson(res, envelope, statusCode) {
  const code = statusCode || (envelope.ok ? 200 : 400);
  res.status(code).json(envelope);
}

module.exports = { success, fail, sendJson };
