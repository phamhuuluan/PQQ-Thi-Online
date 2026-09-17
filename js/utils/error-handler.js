/**
 * System-wide error formatting + toast/retry UX — T-907
 */

var PqqErrorHandler = (function() {
  'use strict';

  var USER_MESSAGES = {
    NETWORK_ERROR: 'Không thể kết nối máy chủ. Kiểm tra mạng và thử lại.',
    QUOTA_EXCEEDED: 'Hệ thống đang quá tải. Vui lòng đợi vài giây rồi thử lại.',
    SERVER_UNAVAILABLE: 'Máy chủ tạm thời không phản hồi. Thử lại sau.',
    UNAUTHORIZED: 'Sai mật khẩu hoặc phiên đã hết hạn.',
    FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
    VALIDATION_ERROR: 'Dữ liệu không hợp lệ. Kiểm tra lại thông tin.',
    INVALID_STATUS_TRANSITION: 'Phiếu điểm không ở trạng thái cho phép thao tác này.',
    UNKNOWN_ACTION: 'Thao tác không được hỗ trợ.',
    INTERNAL_ERROR: 'Lỗi hệ thống. Liên hệ kỹ thuật nếu lặp lại.',
  };

  function extractError(result) {
    if (!result) return { code: 'INTERNAL_ERROR', message: USER_MESSAGES.INTERNAL_ERROR };
    var code = result.code || (result.error && result.error.code) || 'INTERNAL_ERROR';
    var message = (result.error && result.error.message) || result.error || USER_MESSAGES[code] || String(result.error || 'Lỗi không xác định');
    return { code: code, message: message };
  }

  function userMessage(result) {
    var err = extractError(result);
    return USER_MESSAGES[err.code] || err.message;
  }

  function isRetryable(code) {
    return ['NETWORK_ERROR', 'QUOTA_EXCEEDED', 'SERVER_UNAVAILABLE'].indexOf(code) !== -1;
  }

  /**
   * Show toast for API result; optional retry callback.
   * @param {object} result — ApiClient result { ok, error, code }
   * @param {{ retry?: function, silent?: boolean }} [options]
   */
  function handleApiError(result, options) {
    options = options || {};
    if (result && result.ok) return false;

    var err = extractError(result);
    var msg = USER_MESSAGES[err.code] || err.message;

    if (options.silent || !window.PqqToast) return true;

    var toastOptions = {};
    if (options.retry && isRetryable(err.code)) {
      toastOptions.action = {
        label: 'Thử lại',
        onClick: options.retry,
      };
      toastOptions.duration = 8000;
    }

    PqqToast.error(msg, toastOptions);
    return true;
  }

  function handleApiSuccess(message, type) {
    if (window.PqqToast && message) {
      PqqToast.show(message, type || 'success');
    }
  }

  return {
    extractError: extractError,
    userMessage: userMessage,
    isRetryable: isRetryable,
    handleApiError: handleApiError,
    handleApiSuccess: handleApiSuccess,
    USER_MESSAGES: USER_MESSAGES,
  };
})();

if (typeof window !== 'undefined') {
  window.PqqErrorHandler = PqqErrorHandler;
}
