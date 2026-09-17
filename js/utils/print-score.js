/**
 * Print Score Sheet — T-806
 * Renders printable HTML for approved scores; uses @media print CSS.
 */

var PqqPrintScore = (function() {
  'use strict';

  function renderScoreSheet(score, examMeta) {
    var meta = examMeta || {};
    return `
      <div class="print-score-sheet" id="print-score-sheet">
        <header class="print-header">
          <p class="print-org">CỘNG ĐỒNG PHẬT GIÁO VIỆT NAM</p>
          <p class="print-org-sub">PHẬT GIÁO QUẢNG NAM</p>
          <h1 class="print-title">PHIẾU ĐIỂM THI</h1>
        </header>

        <section class="print-meta">
          <p><strong>Kỳ thi:</strong> ${esc(meta.examName || meta.examId || score.EXAM_ID || '')}</p>
          <p><strong>Ngày:</strong> ${esc(meta.examDate || '')} · <strong>Địa điểm:</strong> ${esc(meta.location || '')}</p>
        </section>

        <section class="print-student">
          <table class="print-info-table">
            <tr><td>Võ sinh</td><td><strong>${esc(score.STUDENT_NAME || score.student_name || '')}</strong></td></tr>
            <tr><td>Mã</td><td>${esc(score.STUDENT_CODE || score.student_code || score.STUDENT_ID || '')}</td></tr>
            <tr><td>Bout</td><td>${esc(score.BOUT_ID || score.bout_id || '')}</td></tr>
            <tr><td>Phòng</td><td>${esc(score.ROOM_ID || score.room_id || '')}</td></tr>
            <tr><td>Giám khảo</td><td>${esc(score.JUDGE_NAME || score.judge_name || '')}</td></tr>
          </table>
        </section>

        <section class="print-scores">
          <table class="print-score-table">
            <thead>
              <tr><th>P1</th><th>P2</th><th>P3</th><th>Tổng</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>${fmt(score.P1 ?? score.p1)}</td>
                <td>${fmt(score.P2 ?? score.p2)}</td>
                <td>${fmt(score.P3 ?? score.p3)}</td>
                <td class="print-total">${fmt(score.TOTAL ?? score.total)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        ${score.NOTE || score.note ? '<p class="print-note"><strong>Ghi chú:</strong> ' + esc(score.NOTE || score.note) + '</p>' : ''}

        <section class="print-signatures">
          <div class="print-sig-block">
            <div class="print-sig-line"></div>
            <p>Chữ ký Thầy Chưởng Môn</p>
          </div>
          <div class="print-sig-block">
            <div class="print-seal-circle"></div>
            <p>Con dấu</p>
          </div>
        </section>

        <footer class="print-footer">
          <p>Trạng thái: ${esc(score.STATUS || score.status || '')}</p>
          <p>Duyệt: ${esc(score.APPROVED_AT || score.approved_at || '—')}</p>
          <p class="print-timestamp">In lúc: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
        </footer>
      </div>`;
  }

  function openPrintPreview(score, examMeta) {
    var win = window.open('', '_blank', 'width=800,height=900');
    if (!win) {
      alert('Vui lòng cho phép popup để in phiếu.');
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>Phiếu điểm — ${esc(score.STUDENT_NAME || score.student_name || '')}</title>
        <link rel="stylesheet" href="${window.location.origin}/styles.css">
      </head>
      <body class="print-body">
        ${renderScoreSheet(score, examMeta)}
        <script>window.onload = function() { window.print(); }<\/script>
      </body>
      </html>`);
    win.document.close();
  }

  function fmt(v) {
    if (v === null || v === undefined || v === '') return '—';
    return Number(v).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return { renderScoreSheet: renderScoreSheet, openPrintPreview: openPrintPreview };
})();

if (typeof window !== 'undefined') window.PqqPrintScore = PqqPrintScore;
