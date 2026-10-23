import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildSubmitHallCaseRpcArgs,
  hashHallSubmissionKey,
  isIdempotencyToken,
} from '../../lib/submissions/hall-submission-rpc.ts'
import { classifyHallMasterSubmission } from '../../lib/admin/hall-submission-classification.ts'

const migration = {
  old_case_id: 'ufun-checkee-003',
  new_case_id: 'submission-169',
  old_source: 'legacy_excel',
  new_source: 'submission_user',
  old_source_order: 3,
  new_source_order: 169,
  old_source_record_id: 'ufun-checkee-003',
  new_source_record_id: 'legacy-migration:batch-a:ufun-checkee-003',
  migration_batch: 'batch-a',
}

test('submission request keys are scoped, stable hashes and require UUID idempotency tokens', () => {
  const token = 'c49efc76-2e7a-4fa6-82c7-712a0d32463e'
  assert.equal(isIdempotencyToken(token), true)
  assert.equal(isIdempotencyToken('submission-167'), false)
  assert.equal(
    hashHallSubmissionKey('server-secret', 'submission', token),
    hashHallSubmissionKey('server-secret', 'submission', token)
  )
  assert.notEqual(
    hashHallSubmissionKey('server-secret', 'submission', token),
    hashHallSubmissionKey('server-secret', 'rate-limit', token)
  )
})

test('submission RPC arguments contain form fields and server hashes, never browser identity or review state', () => {
  const args = buildSubmitHallCaseRpcArgs({
    name: 'sample', location: '北京', degree: 'Master', major: 'CS', school: null,
    interview_date: '2026-01-01', end_date: null, status: 'Check', note: null,
    compact_note: null, detail_note: null,
  }, 'a'.repeat(64), 'b'.repeat(64), 'c'.repeat(64))
  assert.equal(args.p_idempotency_key, 'a'.repeat(64))
  assert.equal(args.p_rate_limit_key, 'b'.repeat(64))
  assert.equal(args.p_request_fingerprint, 'c'.repeat(64))
  assert.equal(args.p_status, 'Check')
  assert.equal('case_id' in args, false)
  assert.equal('source_order' in args, false)
  assert.equal('source_record_id' in args, false)
  assert.equal('visibility' in args, false)
})

test('combined Admin identity classification separates legacy migrations, old rows, and direct submissions', () => {
  const mappings = new Map([[migration.new_case_id, migration]])
  assert.equal(classifyHallMasterSubmission({
    case_id: migration.new_case_id,
    source_record_id: migration.new_source_record_id,
    source_order: migration.new_source_order,
  }, mappings, new Set()), 'legacy_migration')
  assert.equal(classifyHallMasterSubmission({
    case_id: 'submission-16', source_record_id: '16', source_order: 16,
  }, mappings, new Set(['submission-16'])), 'legacy_case_submission')
  assert.equal(classifyHallMasterSubmission({
    case_id: 'submission-167', source_record_id: 'master:167', source_order: 177,
  }, mappings, new Set()), 'master_submission')
})

test('Admin queue fails closed on missing or mismatched migration provenance and missing old records', () => {
  const migrated = {
    case_id: migration.new_case_id,
    source_record_id: migration.new_source_record_id,
    source_order: migration.new_source_order,
  }
  assert.throws(() => classifyHallMasterSubmission(migrated, new Map(), new Set()), /身份迁移映射不一致/)
  assert.throws(() => classifyHallMasterSubmission(
    { ...migrated, source_order: migration.new_source_order + 1 },
    new Map([[migration.new_case_id, migration]]),
    new Set()
  ), /身份迁移映射不一致/)
  assert.throws(() => classifyHallMasterSubmission(
    { case_id: 'submission-16', source_record_id: '16', source_order: 16 },
    new Map(),
    new Set()
  ), /缺少对应的旧投稿记录/)
  assert.throws(() => classifyHallMasterSubmission(
    { case_id: 'submission-167', source_record_id: 'master:167', source_order: 177 },
    new Map(),
    new Set(['submission-167'])
  ), /来源身份无法分类/)
})
