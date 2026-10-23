import 'server-only'

import { isAdminAuthenticated } from '~/lib/admin/auth'
import {
  classifyHallMasterSubmission,
  type HallSubmissionMigrationIdentity,
} from '~/lib/admin/hall-submission-classification'
import {
  getAdminSubmissions,
  type AdminSubmission,
  type AdminVisibilityFilter,
} from '~/lib/admin/submissions'
import { getSupabaseServerClient } from '~/lib/supabase/server'

type MasterReviewRow = {
  case_id: string
  source_record_id: string
  source_order: number
  nickname: string | null
  location: string
  degree: string
  major: string
  school: string | null
  interview_date: string
  end_date: string | null
  status: string
  note: string | null
  detail_note: string | null
  visibility: string
  created_at: string
  published_at: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  admin_note: string | null
}

const MASTER_REVIEW_COLUMNS =
  'case_id,source_record_id,source_order,nickname,location,degree,major,school,interview_date,end_date,status,note,detail_note,visibility,created_at,published_at,reviewed_at,reviewed_by,admin_note'

function waitingDays(row: MasterReviewRow) {
  const endDate =
    row.end_date ?? (row.status === 'Check' ? new Date().toISOString().slice(0, 10) : null)
  if (!endDate) return null
  const start = Date.parse(`${row.interview_date}T00:00:00Z`)
  const end = Date.parse(`${endDate}T00:00:00Z`)
  return Number.isFinite(start) && Number.isFinite(end)
    ? Math.max(0, Math.round((end - start) / 86_400_000))
    : null
}

/**
 * Combined queue for the existing case_submissions flow and direct Master
 * submissions. Existing write APIs remain source-specific until Phase 4B is
 * deployed; every caller still needs the Admin session check below.
 */
export async function getCombinedHallAdminSubmissions(
  visibility: AdminVisibilityFilter | 'draft' = 'pending'
) {
  if (!(await isAdminAuthenticated())) {
    return { submissions: null, error: 'Unauthorized' }
  }

  const [legacyResult, masterResult, mapResult] = await Promise.all([
    visibility === 'draft'
      ? getAdminSubmissions('all').then((result) => ({
          ...result,
          submissions: result.submissions?.filter((row) => row.visibility === 'draft') ?? null,
        }))
      : getAdminSubmissions(visibility),
    (async () => {
      let query = getSupabaseServerClient()
        .from('hall_cases_master')
        .select(MASTER_REVIEW_COLUMNS)
        .eq('source', 'submission_user')
      if (visibility !== 'all') query = query.eq('visibility', visibility)
      return query.order('created_at', { ascending: false })
    })(),
    getSupabaseServerClient()
      .from('hall_case_identity_migrations')
      .select(
        'old_case_id,new_case_id,old_source,new_source,old_source_order,new_source_order,old_source_record_id,new_source_record_id,migration_batch'
      ),
  ])
  if (legacyResult.error || !legacyResult.submissions) {
    return { submissions: null, error: legacyResult.error || '暂时无法读取旧投稿列表。' }
  }
  if (masterResult.error || mapResult.error) {
    return { submissions: null, error: '暂时无法读取 Hall Master 审核记录或身份映射。' }
  }

  const submissions: AdminSubmission[] = legacyResult.submissions.map((row) => ({
    ...row,
    origin: 'case_submission',
    reviewTarget: 'case_submissions',
    recordId: row.id,
    source_record_id: String(row.id),
    reviewed_at: null,
    reviewed_by: null,
    admin_note: null,
  }))
  const seenCaseIds = new Set(legacyResult.submissions.map((row) => `submission-${String(row.id)}`))
  const mappingByNewId = new Map<string, HallSubmissionMigrationIdentity>()
  const mappedOldIds = new Set<string>()
  for (const rawMapping of mapResult.data ?? []) {
    const mapping = rawMapping as HallSubmissionMigrationIdentity
    if (mappingByNewId.has(mapping.new_case_id) || mappedOldIds.has(mapping.old_case_id)) {
      return { submissions: null, error: `身份映射目标 ${mapping.new_case_id} 重复。` }
    }
    mappingByNewId.set(mapping.new_case_id, mapping)
    mappedOldIds.add(mapping.old_case_id)
  }

  for (const rawRow of masterResult.data ?? []) {
    const row = rawRow as unknown as MasterReviewRow
    let origin: ReturnType<typeof classifyHallMasterSubmission>
    try {
      origin = classifyHallMasterSubmission(row, mappingByNewId, seenCaseIds)
    } catch (error) {
      return { submissions: null, error: error instanceof Error ? error.message : '来源身份无效。' }
    }
    if (origin !== 'master_submission') continue
    seenCaseIds.add(row.case_id)
    submissions.push({
      id: `master:${row.case_id}`,
      recordId: row.case_id,
      origin: 'master_submission',
      reviewTarget: 'hall_cases_master',
      name: row.nickname,
      location: row.location,
      degree: row.degree,
      major: row.major,
      school: row.school,
      interview_date: row.interview_date,
      end_date: row.end_date,
      status: row.status,
      waiting_days: waitingDays(row),
      note: row.note,
      detail_note: row.detail_note,
      created_at: row.created_at,
      published_at: row.published_at,
      source: 'submission_user',
      source_record_id: row.source_record_id,
      visibility: row.visibility,
      reviewed_at: row.reviewed_at,
      reviewed_by: row.reviewed_by,
      admin_note: row.admin_note,
    })
  }

  submissions.sort((left, right) => right.created_at.localeCompare(left.created_at))
  return { submissions, error: null }
}
