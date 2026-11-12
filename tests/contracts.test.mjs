import test from 'node:test';
import assert from 'node:assert/strict';
import { scopeSQL, contractPrefix } from '../db/contract-sql.mjs';

test('reescreve apenas identificadores de tabelas de negócio, nunca literais', () => {
  assert.equal(scopeSQL(`SELECT "reports"."id", 'reports', 'it''s sgq_records' FROM "reports" JOIN occurrence_tracking ON reports.id=occurrence_tracking.report_id`, 'fabrica'),
    `SELECT "ct_fabrica__reports"."id", 'reports', 'it''s sgq_records' FROM "ct_fabrica__reports" JOIN ct_fabrica__occurrence_tracking ON ct_fabrica__reports.id=ct_fabrica__occurrence_tracking.report_id`);
  assert.equal(scopeSQL('SELECT * FROM management_users', 'fabrica'), 'SELECT * FROM management_users');
  assert.equal(scopeSQL('SELECT * FROM reports', 's11d'), 'SELECT * FROM reports');
  assert.throws(() => contractPrefix("bad'; DROP TABLE reports"));
});
