/**
 * Push SQLite → Google Sheets — T-702, T-703
 * Conflict: different payloadHash → NEEDS_REVIEW (AP-03)
 * Blocker #2: hash giống nhưng STATUS/lock/approve khác → updateRow (không skip mất trạng thái)
 */

const { success, fail } = require('../lib/envelope');
const { getSheetsApi, hasServiceAccount } = require('../lib/google-auth');
const { getTabRows, appendRow, updateRow, findRowByColumn } = require('../lib/sheets-client');
const { withExamLock } = require('../lib/sheets-lock');
const {
  computePayloadHashFromRow, scoreRowToSheet, planPushForExistingRow,
} = require('../lib/sync-utils');
const repo = require('../repositories');
const syncLog = require('../repositories/sync-log');

async function pushToSheets(examId, config) {
  if (!examId) return fail('VALIDATION_ERROR', 'examId is required');
  if (!config.sheetsId) {
    return fail(
      'VALIDATION_ERROR',
      `sheetsId missing for exam ${examId}. Add entry to config.exams[] (examId + sheetsId).`
    );
  }
  if (!hasServiceAccount(config)) {
    return fail('UNAUTHORIZED', 'Service account key not found. See local-server/README.md');
  }

  return withExamLock(examId, async () => {
    try {
      const sheets = getSheetsApi(config);
      const spreadsheetId = config.sheetsId;
      const localScores = repo.findUnsyncedScores(examId);

      const scoresTab = await getTabRows(sheets, spreadsheetId, 'SCORES');
      const { headers } = scoresTab;
      let cloudRows = scoresTab.rows.filter((r) => r.EXAM_ID === examId);

      const result = {
        pushed: 0,
        updated: 0,
        skipped: 0,
        conflicts: 0,
        needsReview: [],
        errors: [],
      };

      for (const local of localScores) {
        const idKey = local.idempotency_key;
        const localHash = local.payload_hash || computePayloadHashFromRow(local);
        const cloudMatch = findRowByColumn(cloudRows, 'IDEMPOTENCY_KEY', idKey);

        if (!cloudMatch) {
          const stt = cloudRows.length + 2;
          const sheetRow = scoreRowToSheet({ ...local, payload_hash: localHash }, stt);
          await appendRow(sheets, spreadsheetId, 'SCORES', headers, sheetRow);
          cloudRows.push(sheetRow);
          repo.markScoreSynced(local.id);
          result.pushed++;

          syncLog.insertSyncLog({
            idempotencyKey: idKey,
            direction: 'push',
            status: 'inserted',
            detail: { examId, idKey, localStatus: local.status },
          });
          continue;
        }

        const cloud = cloudMatch.row;
        const plan = planPushForExistingRow(local, cloud);

        if (plan.action === 'conflict') {
          repo.markScoreNeedsReview(local.id);
          result.conflicts++;
          result.needsReview.push(idKey);
          syncLog.insertSyncLog({
            idempotencyKey: idKey,
            direction: 'push',
            status: 'conflict_needs_review',
            detail: {
              examId,
              idKey,
              cloudStatus: cloud.STATUS || 'DRAFT',
              localStatus: local.status,
              localHash,
              cloudHash: cloud.PAYLOAD_HASH || computePayloadHashFromRow(cloud),
              reason: plan.reason,
            },
          });
          continue;
        }

        if (plan.action === 'update_status') {
          const previousStatus = cloud.STATUS || 'DRAFT';
          await updateRow(
            sheets,
            spreadsheetId,
            'SCORES',
            cloudMatch.sheetRow,
            headers,
            plan.updates
          );
          Object.assign(cloud, plan.updates);
          repo.markScoreSynced(local.id);
          result.updated++;

          syncLog.insertSyncLog({
            idempotencyKey: idKey,
            direction: 'push',
            status: 'updated_status',
            detail: {
              examId,
              idKey,
              from: previousStatus,
              to: local.status,
              reason: plan.reason,
            },
          });
          continue;
        }

        // skip
        repo.markScoreSynced(local.id);
        result.skipped++;
        syncLog.insertSyncLog({
          idempotencyKey: idKey,
          direction: 'push',
          status: 'skipped_duplicate',
          detail: { examId, idKey, reason: plan.reason },
        });
      }

      syncLog.insertSyncLog({
        direction: 'push',
        status: result.conflicts ? 'partial' : 'success',
        detail: { examId, ...result },
      });

      return success({
        examId,
        direction: 'push',
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      syncLog.insertSyncLog({
        direction: 'push',
        status: 'error',
        detail: { examId, message: err.message },
      });
      return fail('SERVER_UNAVAILABLE', `Push failed: ${err.message}`);
    }
  });
}

module.exports = { pushToSheets };
