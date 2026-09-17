/**
 * T-303: Scoring UI — Đầy đủ (P1 + P2 + P3)
 */
(function() {
  'use strict';
  var container = document.getElementById('scoring-container');
  var fields = [
    { key: 'P1', label: 'Phần 1 — Lý thuyết (0–10)' },
    { key: 'P2', label: 'Phần 2 — Lý thuyết (0–10)' },
    { key: 'P3', label: 'Phần 3 — Thực hành (0–10)' }
  ];
  ScoringCore.init(container, fields);
})();
