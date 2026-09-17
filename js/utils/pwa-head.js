/**
 * Shared PWA meta tags injected into <head> via data attribute.
 * T-901: manifest, theme-color, apple-touch-icon
 */
(function() {
  'use strict';

  var head = document.head;
  if (!head || head.querySelector('link[rel="manifest"]')) return;

  var tags = [
    { tag: 'link', rel: 'manifest', href: '/pwa/manifest.webmanifest' },
    { tag: 'meta', name: 'theme-color', content: '#1a56db' },
    { tag: 'meta', name: 'apple-mobile-web-app-capable', content: 'yes' },
    { tag: 'meta', name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    { tag: 'meta', name: 'apple-mobile-web-app-title', content: 'PQQ Thi' },
    { tag: 'link', rel: 'apple-touch-icon', href: '/assets/icons/icon-192.png' },
    { tag: 'link', rel: 'icon', href: '/assets/icons/icon-192.png', type: 'image/png' },
  ];

  tags.forEach(function(spec) {
    var el = document.createElement(spec.tag);
    Object.keys(spec).forEach(function(key) {
      if (key !== 'tag') el.setAttribute(key, spec[key]);
    });
    head.appendChild(el);
  });
})();
