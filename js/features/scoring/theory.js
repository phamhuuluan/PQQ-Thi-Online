/**
 * T-301: Scoring UI — Lý thuyết (P1, P2 only)
 */
(function() {
  'use strict';
  var container = document.getElementById('scoring-container');
  var fields = [
    { key: 'P1', label: 'Phần 1 — Lý thuyết (0–10)' },
    { key: 'P2', label: 'Phần 2 — Lý thuyết (0–10)' }
  ];
  ScoringCore.init(container, fields);
})();
