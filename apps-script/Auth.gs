/**
 * Auth — SHA-256 pass hash verification + role permission checks
 * AUTH-01 A: SHA-256 + salt
 * AUTH-04 B: FE-only pass check, API trusts role from payload
 */

/**
 * Hash a password with salt using SHA-256.
 * @param {string} password
 * @param {string} salt
 * @returns {string} hex hash
 */
function hashPassword(password, salt) {
  var input = salt + ':' + password;
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8);
  return rawHash.map(function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}

/**
 * Generate a random salt.
 * @returns {string} 16-char hex salt
 */
function generateSalt() {
  var bytes = [];
  for (var i = 0; i < 8; i++) {
    bytes.push(Math.floor(Math.random() * 256));
  }
  return bytes.map(function(b) {
    return ('0' + b.toString(16)).slice(-2);
  }).join('');
}

/**
 * Generate hash+salt pair for a password.
 * @param {string} password
 * @returns {{hash: string, salt: string}}
 */
function generatePassHash(password) {
  var salt = generateSalt();
  var hash = hashPassword(password, salt);
  return { hash: hash, salt: salt };
}

/**
 * Verify a password against stored hash+salt.
 * @param {string} password
 * @param {string} storedHash
 * @param {string} salt
 * @returns {boolean}
 */
function verifyPassword(password, storedHash, salt) {
  var computed = hashPassword(password, salt);
  return computed === storedHash;
}

/**
 * Check role permission for an action.
 * API trusts role from payload (AUTH-04 B).
 * @param {string} role
 * @param {string} action
 * @returns {object|null} null if OK, error envelope if denied
 */
function checkPermission(role, action) {
  var permissions = {
    // getData (read): danh sách TS/GK + kiểm tra phiếu — dùng chung Online/Offline scoring
    'judge': ['submitScore', 'getData'],
    'gk': ['submitScore', 'getData'],
    'secretary': ['getData', 'lockSheet', 'sync/pull', 'sync/push', 'generatePdf'],
    'tk': ['getData', 'lockSheet', 'sync/pull', 'sync/push', 'generatePdf'],
    'cck': ['getData', 'approveScore', 'approve'],
    'admin': ['getData', 'createExamRoom', 'importStudents', 'configureJudges',
              'rotateRolePasswords', 'generateQrLinks', 'sync/pull', 'sync/push', 'generatePdf']
  };

  // Public actions (no role needed)
  var publicActions = ['getScoreboard'];
  if (publicActions.indexOf(action) !== -1) return null;

  var allowed = permissions[role] || [];
  if (allowed.indexOf(action) === -1) {
    return fail('FORBIDDEN', 'Role "' + role + '" cannot perform action "' + action + '"');
  }
  return null;
}
