import assert from 'node:assert/strict'
import test from 'node:test'
import { applyHallIdentityMigrations } from '../../lib/admin/hall-diff-identities.ts'

test('identity migrations are reported separately from real additions and removals', () => {
  const before = [
    { id: 'legacy-3', nickname: 'third' },
    { id: 'unchanged', nickname: 'same' },
    { id: 'removed', nickname: 'removed' },
  ]
  const after = [
    { id: 'submission-169', nickname: 'third' },
    { id: 'unchanged', nickname: 'same' },
    { id: 'new-case', nickname: 'new' },
  ]

  const diff = applyHallIdentityMigrations(before, after, [
    { old_case_id: 'legacy-3', new_case_id: 'submission-169' },
  ])

  assert.deepEqual(diff.added.map((record) => record.id), ['new-case'])
  assert.deepEqual(diff.removed.map((record) => record.id), ['removed'])
  assert.equal(diff.migrations.length, 1)
  assert.equal(diff.migrations[0].oldCaseId, 'legacy-3')
  assert.equal(diff.migrations[0].newCaseId, 'submission-169')
})

test('identity migration pairing works when Release order is reversed', () => {
  const diff = applyHallIdentityMigrations(
    [{ id: 'submission-169' }],
    [{ id: 'legacy-3' }],
    [{ old_case_id: 'legacy-3', new_case_id: 'submission-169' }]
  )
  assert.deepEqual(diff.added, [])
  assert.deepEqual(diff.removed, [])
  assert.equal(diff.migrations.length, 1)
})
