export type HallIdentityMigrationPair = {
  old_case_id: string
  new_case_id: string
}

export type HallIdentityMigrationDiff<T extends { id: string | number }> = {
  added: T[]
  removed: T[]
  migrations: Array<{
    oldCaseId: string
    newCaseId: string
    recordA: T
    recordB: T
  }>
}

export type HallRecordChange<Field extends string = string> = {
  field: Field
  before: unknown
  after: unknown
}

export type HallReleaseDiff<
  T extends { id: string | number },
  Field extends string = string,
> = HallIdentityMigrationDiff<T> & {
  changed: Array<{ id: string; before: T; after: T; changes: HallRecordChange<Field>[] }>
  unchanged: number
}

function idOf(record: { id: string | number }) {
  return String(record.id)
}

export function applyHallIdentityMigrations<T extends { id: string | number }>(
  recordsA: T[],
  recordsB: T[],
  identityMap: HallIdentityMigrationPair[]
): HallIdentityMigrationDiff<T> {
  const byA = new Map(recordsA.map((record) => [idOf(record), record]))
  const byB = new Map(recordsB.map((record) => [idOf(record), record]))
  const migrations = identityMap.flatMap((mapping) => {
    const oldInA = byA.get(mapping.old_case_id)
    const oldInB = byB.get(mapping.old_case_id)
    const newInA = byA.get(mapping.new_case_id)
    const newInB = byB.get(mapping.new_case_id)
    if (oldInA && newInB) {
      return [
        {
          oldCaseId: mapping.old_case_id,
          newCaseId: mapping.new_case_id,
          recordA: oldInA,
          recordB: newInB,
        },
      ]
    }
    if (newInA && oldInB) {
      return [
        {
          oldCaseId: mapping.old_case_id,
          newCaseId: mapping.new_case_id,
          recordA: newInA,
          recordB: oldInB,
        },
      ]
    }
    return []
  })
  const migratedIdsInA = new Set(migrations.map((mapping) => idOf(mapping.recordA)))
  const migratedIdsInB = new Set(migrations.map((mapping) => idOf(mapping.recordB)))
  const added = recordsB.filter(
    (record) => !byA.has(idOf(record)) && !migratedIdsInB.has(idOf(record))
  )
  const removed = recordsA.filter(
    (record) => !byB.has(idOf(record)) && !migratedIdsInA.has(idOf(record))
  )

  return { added, removed, migrations }
}

export function diffHallReleaseRecords<T extends { id: string | number }, Field extends string>(
  recordsA: T[],
  recordsB: T[],
  identityMap: HallIdentityMigrationPair[],
  fields: readonly Field[]
): HallReleaseDiff<T, Field> {
  const identityDiff = applyHallIdentityMigrations(recordsA, recordsB, identityMap)
  const byA = new Map(recordsA.map((record) => [idOf(record), record]))
  let unchanged = 0
  const changed: HallReleaseDiff<T, Field>['changed'] = []

  for (const record of recordsB) {
    const before = byA.get(idOf(record))
    if (!before) continue

    const beforeValues = before as Record<string, unknown>
    const afterValues = record as Record<string, unknown>
    const changes = fields
      .filter((field) => JSON.stringify(beforeValues[field]) !== JSON.stringify(afterValues[field]))
      .map((field) => ({ field, before: beforeValues[field], after: afterValues[field] }))

    if (changes.length) {
      changed.push({ id: idOf(record), before, after: record, changes })
    } else {
      unchanged += 1
    }
  }

  return { ...identityDiff, changed, unchanged }
}
