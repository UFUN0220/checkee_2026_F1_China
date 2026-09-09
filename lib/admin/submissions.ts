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
  const entries = await Promise.all(
    (['published', 'pending', 'rejected'] as const).map(async (visibility) => {
      const result = await supabase
        .from('case_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('visibility', visibility)
      return { visibility, count: result.count ?? 0, error: result.error }
    })
  )

  const { data: lastPublished, error: lastPublishedError } = await supabase
    .from('case_submissions')
    .select('published_at')
    .eq('visibility', 'published')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { count: pendingUpdateRequests, error: updateRequestsError } = await supabase
    .from('case_update_requests')
    .select('id', { count: 'exact', head: true })
    .in('status', ['pending', 'reviewing'])

  const error = entries.find((entry) => entry.error)?.error
  if (error || lastPublishedError) return { stats: null, error: '暂时无法读取审核统计。' }

  return {
    stats: {
      ...Object.fromEntries(entries.map((entry) => [entry.visibility, entry.count])),
      lastPublishedAt: lastPublished?.published_at ?? null,
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
