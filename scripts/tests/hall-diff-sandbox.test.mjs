import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { diffHallReleaseRecords } from '../../lib/admin/hall-diff-identities.ts'

const fixturePath = process.env.HALL_DIFF_FIXTURE
const HALL_DIFF_FIELDS = [
  'location',
  'degree',
  'major',
  'school',
  'startDate',
  'endDate',
  'waitingDays',
  'status',
  'note',
  'visibility',
]

test('sandbox Hall Diff separates 25 identity migrations from real changes', async (context) => {
  if (!fixturePath) {
    context.skip('HALL_DIFF_FIXTURE was not provided')
    return
  }

  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'))
  const before = fixture.beforeRecords
  const after = fixture.afterRecords.map((record) => ({ ...record }))
  const identityMigrations = fixture.identityMigrations
  const beforeById = new Map(before.map((record) => [String(record.id), record]))
  const afterById = new Map(after.map((record) => [String(record.id), record]))

  assert.equal(identityMigrations.length, 25)
  for (const mapping of identityMigrations) {
    const previous = beforeById.get(mapping.old_case_id)
    const migrated = afterById.get(mapping.new_case_id)
    assert.ok(previous, `historical release is missing ${mapping.old_case_id}`)
    assert.ok(migrated, `sandbox export is missing ${mapping.new_case_id}`)
    assert.equal(previous.nickname, migrated.nickname)
    for (const field of HALL_DIFF_FIELDS) assert.deepEqual(previous[field], migrated[field], field)
  }

  const trueAdded = afterById.get('submission-167')
  assert.ok(trueAdded, 'sandbox numeric Master submission ID 167 should be a real Added record')
  const removedId = 'submission-47'
  assert.ok(beforeById.has(removedId), `historical release is missing removal fixture ${removedId}`)
  const changedRecord = after.find((record) => String(record.id) === 'submission-108')
  assert.ok(changedRecord, 'sandbox export is missing change fixture submission-108')
  changedRecord.status = changedRecord.status === 'Check' ? 'Approved' : 'Check'

  const afterWithRealChanges = after.filter((record) => String(record.id) !== removedId)
  const diff = diffHallReleaseRecords(before, afterWithRealChanges, identityMigrations, HALL_DIFF_FIELDS)

  assert.equal(diff.migrations.length, 25)
  assert.equal(diff.added.filter((record) => String(record.id).startsWith('submission-sandbox-20261016-')).length, 0)
  assert.deepEqual(diff.added.map((record) => String(record.id)), ['submission-167'])
  assert.deepEqual(diff.removed.map((record) => String(record.id)), [removedId])
  assert.deepEqual(diff.changed.map((change) => change.id), ['submission-108'])
  assert.deepEqual(diff.changed[0].changes.map((change) => change.field), ['status'])
  assert.ok(diff.unchanged > 0)
})
