import 'server-only'

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import {
  classifyHallMasterSubmission,
  type HallSubmissionMigrationIdentity,
} from '~/lib/admin/hall-submission-classification'
import { getAdminSubmissions } from '~/lib/admin/submissions'
import { getSupabaseServerClient } from '~/lib/supabase/server'

const DATA_ROOT = path.join(process.cwd(), 'data', 'checkmate')
const RELEASE_VERSION_PATTERN = /^\d{8}-v\d{3}$/

type HallRecordSource = 'legacy_excel' | 'submission_user' | 'admin_import'

type HallMasterFile = {
  dataVersion: string
  generatedAt: string
  recordCount: number
  masterRecordCount?: number
  publishedRecordCount?: number
  records: Array<{
    source: HallRecordSource
    submissionOrigin?: 'legacy_case_submission' | 'master_submission' | 'legacy_migration'
  }>
}

type PublishedSubmissionsFile = {
  records: Array<{ id: string; submissionOrigin?: 'legacy_case_submission' | 'master_submission' }>
}

type ReleaseMetaFile = {
  version: string
  generatedAt: string
  legacyCount: number
  submissionCount: number
  migrationCount?: number
  totalCount: number
  source: HallRecordSource[]
}

type PublishedCaseSubmissionIdentity = {
  id: string | number
  source: string
  visibility: string
}

type PublishedMasterIdentity = {
  case_id: string
  source_record_id: string | null
  source_order: number
  visibility: string
}

type HallIdentityMigrationIdentity = {
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

export type HallReleaseSummary = ReleaseMetaFile & {
  snapshotIds: string[]
}

export type HallReleaseState = {
  hallMaster: HallMasterFile
  publishedSubmissions: PublishedSubmissionsFile
  releases: HallReleaseSummary[]
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, 'utf-8')) as T
}

async function readReleaseDirectories() {
  const releasesRoot = path.join(DATA_ROOT, 'releases')
  try {
    const entries = await readdir(releasesRoot, { withFileTypes: true })
    return entries
      .filter((entry) => entry.isDirectory() && RELEASE_VERSION_PATTERN.test(entry.name))
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left))
  } catch (error) {
    if ((error as { code?: string }).code === 'ENOENT') return []
    throw error
  }
}

export async function getHallReleaseState(): Promise<HallReleaseState> {
  const hallMaster = await readJson<HallMasterFile>(path.join(DATA_ROOT, 'hall-master.json'))
  const publishedSubmissions = await readJson<PublishedSubmissionsFile>(
    path.join(DATA_ROOT, 'published-submissions.json')
  )
  const releaseNames = await readReleaseDirectories()
  const releases = await Promise.all(
    releaseNames.map(async (version) => {
      const releaseRoot = path.join(DATA_ROOT, 'releases', version)
      const [meta, snapshot] = await Promise.all([
        readJson<ReleaseMetaFile>(path.join(releaseRoot, 'release-meta.json')),
        readJson<PublishedSubmissionsFile>(path.join(releaseRoot, 'published-submissions.json')),
      ])
      return { ...meta, snapshotIds: snapshot.records.map((record) => record.id) }
    })
  )

  return { hallMaster, publishedSubmissions, releases }
}

function normalizeSubmissionId(id: string | number) {
  const value = String(id).trim()
  return value.startsWith('submission-') ? value : `submission-${value}`
}

export async function getUnreleasedPublishedCount(releasedIds: ReadonlySet<string>) {
  try {
    const supabase = getSupabaseServerClient()
    const [
      { data: submissions, error: submissionsError },
      { data: masterRows, error: masterError },
      { data: mappings, error: mappingsError },
    ] = await Promise.all([
      supabase
        .from('case_submissions')
        .select('id,source,visibility')
        .eq('source', 'submission_user')
        .eq('visibility', 'published'),
      supabase
        .from('hall_cases_master')
        .select('case_id,source_record_id,source_order,visibility')
        .eq('source', 'submission_user')
        .eq('visibility', 'published'),
      supabase
        .from('hall_case_identity_migrations')
        .select(
          'old_case_id,new_case_id,old_source,new_source,old_source_order,new_source_order,old_source_record_id,new_source_record_id,migration_batch'
        ),
    ])
    if (submissionsError || masterError || mappingsError) {
      return { count: null, error: '暂时无法核对真实 published 投稿与 Hall Master。' }
    }

    const submissionRows = (submissions ?? []) as PublishedCaseSubmissionIdentity[]
    const publishedMasterRows = (masterRows ?? []) as PublishedMasterIdentity[]
    const migrationRows = (mappings ?? []) as HallIdentityMigrationIdentity[]
    const submissionsById = new Map<string, PublishedCaseSubmissionIdentity>(
      submissionRows.map((submission) => [String(submission.id), submission])
    )
    const masterById = new Map<string, PublishedMasterIdentity>(
      publishedMasterRows.map((row) => [row.case_id, row])
    )
    const migrationsByNewId = new Map<string, HallIdentityMigrationIdentity>()
    const mappedOldIds = new Set<string>()
    for (const mapping of migrationRows) {
      if (migrationsByNewId.has(mapping.new_case_id) || mappedOldIds.has(mapping.old_case_id)) {
        return { count: null, error: `身份映射目标 ${mapping.new_case_id} 重复。` }
      }
      migrationsByNewId.set(mapping.new_case_id, mapping)
      mappedOldIds.add(mapping.old_case_id)
    }
    const realIds = new Set<string>()
    const realCaseIds = new Set([...submissionsById.keys()].map((id) => normalizeSubmissionId(id)))

    for (const submission of submissionsById.values()) {
      const id = String(submission.id)
      const caseId = normalizeSubmissionId(id)
      const master = masterById.get(caseId)
      if (
        submission.source !== 'submission_user' ||
        submission.visibility !== 'published' ||
        !master ||
        master.visibility !== 'published' ||
        master.source_record_id !== id
      ) {
        return { count: null, error: `投稿 ${caseId} 与 Hall Master 的身份或审核状态不一致。` }
      }
      realIds.add(caseId)
    }

    for (const row of masterById.values()) {
      if (!row.source_record_id)
        return { count: null, error: `Master 案例 ${row.case_id} 缺少来源身份。` }
      let origin: ReturnType<typeof classifyHallMasterSubmission>
      try {
        origin = classifyHallMasterSubmission(
          { ...row, source_record_id: row.source_record_id },
          migrationsByNewId as Map<string, HallSubmissionMigrationIdentity>,
          realCaseIds
        )
      } catch (error) {
        return {
          count: null,
          error: error instanceof Error ? error.message : 'Master 来源身份无效。',
        }
      }
      if (origin === 'legacy_migration' || origin === 'legacy_case_submission') continue
      if (realIds.has(row.case_id)) {
        return { count: null, error: `Master 案例 ${row.case_id} 同时匹配两种投稿来源。` }
      }
      realIds.add(row.case_id)
    }

    const count = [...realIds].filter((id) => !releasedIds.has(id)).length
    return { count, error: null }
  } catch {
    return { count: null, error: '无法核对 Supabase published 投稿与 Hall Master。' }
  }
}
