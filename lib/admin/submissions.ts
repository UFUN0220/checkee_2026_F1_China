import 'server-only'

import { getSupabaseServerClient } from '~/lib/supabase/server'

export const ADMIN_SUBMISSION_COLUMNS = [
  'id',
  'name',
  'location',
  'degree',
  'major',
  'school',
  'interview_date',
  'status',
  'end_date',
  'waiting_days',
  'note',
  'detail_note',
  'created_at',
  'published_at',
  'source',
  'visibility',
].join(',')

export const ADMIN_VISIBILITY_FILTERS = ['pending', 'published', 'rejected', 'all'] as const
export type AdminVisibilityFilter = (typeof ADMIN_VISIBILITY_FILTERS)[number]

export type AdminSubmission = {
  id: string | number
  recordId?: string | number
  origin?: 'case_submission' | 'master_submission'
  reviewTarget?: 'case_submissions' | 'hall_cases_master'
  source_record_id?: string | null
  name: string | null
  location: string | null
  degree: string | null
  major: string | null
  school: string | null
  interview_date: string | null
  status: string | null
  end_date: string | null
  waiting_days: number | null
  note: string | null
  detail_note: string | null
  created_at: string
  published_at: string | null
  reviewed_at?: string | null
  reviewed_by?: string | null
  admin_note?: string | null
  source: string | null
  visibility: string
}

export type AdminStats = {
  published: number
  pending: number
  rejected: number
  lastPublishedAt: string | null
  pendingUpdateRequests: number | null
  updateRequestsError: string | null
}

export async function getAdminStats() {
  const supabase = getSupabaseServerClient()
  const [
    { submissions, error: submissionsError },
    { count: pendingUpdateRequests, error: updateRequestsError },
  ] = await Promise.all([
    import('~/lib/admin/hall-submissions').then(({ getCombinedHallAdminSubmissions }) =>
      getCombinedHallAdminSubmissions('all')
    ),
    supabase
      .from('case_update_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'reviewing']),
  ])

  if (submissionsError || !submissions)
    return { stats: null, error: submissionsError || '暂时无法读取审核统计。' }

  const counts = { published: 0, pending: 0, rejected: 0 }
  let lastPublishedAt: string | null = null
  for (const submission of submissions) {
    if (
      submission.visibility === 'published' ||
      submission.visibility === 'pending' ||
      submission.visibility === 'rejected'
    ) {
      counts[submission.visibility] += 1
    }
    if (
      submission.visibility === 'published' &&
      submission.published_at &&
      (!lastPublishedAt || submission.published_at > lastPublishedAt)
    ) {
      lastPublishedAt = submission.published_at
    }
  }

  return {
    stats: {
      ...counts,
      lastPublishedAt,
      pendingUpdateRequests: updateRequestsError ? null : (pendingUpdateRequests ?? 0),
      updateRequestsError: updateRequestsError ? '暂时无法读取修改反馈待办。' : null,
    } as AdminStats,
    error: null,
  }
}

export async function getAdminSubmissions(visibility: AdminVisibilityFilter = 'pending') {
  let query = getSupabaseServerClient().from('case_submissions').select(ADMIN_SUBMISSION_COLUMNS)

  if (visibility !== 'all') query = query.eq('visibility', visibility)

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) return { submissions: null, error: '暂时无法读取投稿列表。' }

  return { submissions: (data ?? []) as unknown as AdminSubmission[], error: null }
}
