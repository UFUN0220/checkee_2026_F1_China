import 'server-only'

import { getCombinedHallAdminSubmissions } from '~/lib/admin/hall-submissions'
import { getSupabaseServerClient } from '~/lib/supabase/server'

const RECENT_ACTIVITY_LIMIT = 8

type UpdateRequestActivityRow = {
  id: string | number
  created_at: string
  updated_at: string
  status: string
}

export type AdminActivity = {
  id: string
  kind: 'submission' | 'update-request'
  title: string
  timestamp: string
  status: string
  href: string
}

function isLaterThanCreated(updatedAt: string, createdAt: string) {
  const updatedTime = new Date(updatedAt).getTime()
  const createdTime = new Date(createdAt).getTime()
  return (
    Number.isFinite(updatedTime) && Number.isFinite(createdTime) && updatedTime > createdTime + 1000
  )
}

export async function getAdminRecentActivities() {
  const supabase = getSupabaseServerClient()
  const [submissionsResult, updateRequestsResult] = await Promise.all([
    getCombinedHallAdminSubmissions('all'),
    supabase
      .from('case_update_requests')
      .select('id, created_at, updated_at, status')
      .order('updated_at', { ascending: false })
      .limit(RECENT_ACTIVITY_LIMIT),
  ])

  if (submissionsResult.error || !submissionsResult.submissions || updateRequestsResult.error) {
    return { activities: null, error: '暂时无法读取最近活动。' }
  }

  const submissionActivities: AdminActivity[] = submissionsResult.submissions.map((submission) => ({
    id: `${submission.reviewTarget}-${submission.recordId}`,
    kind: 'submission',
    title: submission.reviewTarget === 'hall_cases_master' ? '新 Master 案例提交' : '新案例提交',
    timestamp: submission.created_at,
    status: submission.visibility,
    href: '/admin/submissions',
  }))

  const updateRequestActivities: AdminActivity[] = (
    updateRequestsResult.data as UpdateRequestActivityRow[]
  ).flatMap((request) => {
    const activities: AdminActivity[] = [
      {
        id: `update-request-created-${request.id}`,
        kind: 'update-request',
        title: '收到修改反馈',
        timestamp: request.created_at,
        status: request.status,
        href: '/admin/update-requests',
      },
    ]

    if (isLaterThanCreated(request.updated_at, request.created_at)) {
      activities.push({
        id: `update-request-updated-${request.id}`,
        kind: 'update-request',
        title: '修改反馈更新',
        timestamp: request.updated_at,
        status: request.status,
        href: '/admin/update-requests',
      })
    }

    return activities
  })

  const activities = [...submissionActivities, ...updateRequestActivities]
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, RECENT_ACTIVITY_LIMIT)

  return { activities, error: null }
}
