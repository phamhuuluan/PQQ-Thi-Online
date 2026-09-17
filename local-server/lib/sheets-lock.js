/**
 * Sheets write lock — T-706 (DEC-OFF-03 A)
 * In-process mutex per examId to prevent concurrent sync/push races.
 * Apps Script uses LockService; Local Server uses this when writing via Sheets API.
 */

const chains = new Map();

async function withExamLock(examId, fn) {
  const prev = chains.get(examId) || Promise.resolve();
  let release;
  const next = new Promise((resolve) => { release = resolve; });
  chains.set(examId, prev.then(() => next));

  try {
    await prev;
    return await fn();
  } finally {
    release();
    if (chains.get(examId) === next) chains.delete(examId);
  }
}

module.exports = { withExamLock };
