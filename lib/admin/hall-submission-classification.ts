export type HallMasterSubmissionIdentity = {
  case_id: string
  source_record_id: string
  source_order: number
}

export type HallSubmissionMigrationIdentity = {
  old_case_id: string
  new_case_id: string
  old_source: string
  new_source: string
  old_source_order: number
  new_source_order: number
  old_source_record_id: string
  new_source_record_id: string
  migration_batch: string
}

export type HallMasterSubmissionOrigin =
  'legacy_migration' | 'legacy_case_submission' | 'master_submission'

export function classifyHallMasterSubmission(
  row: HallMasterSubmissionIdentity,
  migrationsByNewId: ReadonlyMap<string, HallSubmissionMigrationIdentity>,
  legacyCaseIds: ReadonlySet<string>
): HallMasterSubmissionOrigin {
  if (row.source_record_id.startsWith('legacy-migration:')) {
    const mapping = migrationsByNewId.get(row.case_id)
    if (
      !mapping ||
      mapping.new_case_id !== row.case_id ||
      mapping.old_source !== 'legacy_excel' ||
      mapping.new_source !== 'submission_user' ||
      !Number.isInteger(mapping.old_source_order) ||
      mapping.old_source_order < 1 ||
      mapping.new_source_order !== row.source_order ||
      mapping.old_source_record_id !== mapping.old_case_id ||
      mapping.new_source_record_id !== row.source_record_id ||
      row.source_record_id !== `legacy-migration:${mapping.migration_batch}:${mapping.old_case_id}`
    ) {
      throw new Error(`Master 案例 ${row.case_id} 与身份迁移映射不一致。`)
    }
    return 'legacy_migration'
  }

  if (/^\d+$/.test(row.source_record_id) && row.case_id === `submission-${row.source_record_id}`) {
    if (!legacyCaseIds.has(row.case_id)) {
      throw new Error(`Master 案例 ${row.case_id} 缺少对应的旧投稿记录。`)
    }
    return 'legacy_case_submission'
  }

  const direct = /^master:(\d+)$/.exec(row.source_record_id)
  if (!direct || row.case_id !== `submission-${direct[1]}` || legacyCaseIds.has(row.case_id)) {
    throw new Error(`Master 案例 ${row.case_id} 的来源身份无法分类。`)
  }
  return 'master_submission'
}
