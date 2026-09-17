/**
 * T-302: Scoring UI — Thực hành (P3 only)
 */
(function() {
  'use strict';
  var container = document.getElementById('scoring-container');
  var fields = [
    { key: 'P3', label: 'Phần 3 — Thực hành (0–10)' }
  ];
  ScoringCore.init(container, fields);
})();
