/**
 * Global toast notifications — T-907
 * Usage: PqqToast.show('Message', 'success'|'error'|'info'|'warn', options)
 */

var PqqToast = (function() {
  'use strict';

  var DEFAULT_DURATION = 5000;
  var stack = null;

  function ensureStack() {
    if (stack) return stack;
    stack = document.getElementById('pqq-toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'pqq-toast-stack';
      stack.setAttribute('aria-live', 'polite');
      stack.setAttribute('aria-atomic', 'true');
      document.body.appendChild(stack);
    }
    return stack;
  }

  /**
   * @param {string} message
   * @param {'success'|'error'|'info'|'warn'} [type]
   * @param {{ duration?: number, action?: { label: string, onClick: function } }} [options]
   * @returns {{ remove: function }}
   */
  function show(message, type, options) {
    options = options || {};
    var duration = options.duration !== undefined ? options.duration : DEFAULT_DURATION;
    var container = ensureStack();

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + (type || 'info');
    toast.setAttribute('role', 'alert');

    var text = document.createElement('span');
    text.className = 'toast-text';
    text.textContent = message;
    toast.appendChild(text);

    var controls = document.createElement('div');
    controls.className = 'toast-controls';

    if (options.action && options.action.label) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toast-action-btn';
      btn.textContent = options.action.label;
      btn.addEventListener('click', function() {
        if (options.action.onClick) options.action.onClick();
        remove();
      });
      controls.appendChild(btn);
    }

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'toast-close-btn';
    closeBtn.setAttribute('aria-label', 'Đóng');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', remove);
    controls.appendChild(closeBtn);

    toast.appendChild(controls);
    container.appendChild(toast);

    var timer = null;
    if (duration > 0) {
      timer = setTimeout(remove, duration);
    }

    function remove() {
      if (timer) clearTimeout(timer);
      toast.classList.add('toast-hiding');
      setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 200);
    }

    return { remove: remove };
  }

  function success(msg, options) { return show(msg, 'success', options); }
  function error(msg, options) { return show(msg, 'error', options); }
  function info(msg, options) { return show(msg, 'info', options); }
  function warn(msg, options) { return show(msg, 'warn', options); }

  return { show: show, success: success, error: error, info: info, warn: warn };
})();

if (typeof window !== 'undefined') {
  window.PqqToast = PqqToast;
  window.showToast = function(msg, type) { return PqqToast.show(msg, type); };
}
