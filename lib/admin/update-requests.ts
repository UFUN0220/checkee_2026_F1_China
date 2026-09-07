import 'server-only'

import { getSupabaseServerClient } from '~/lib/supabase/server'

export const ADMIN_UPDATE_REQUEST_FILTERS = ['pending', 'reviewing', 'completed', 'rejected', 'all'] as const
export type AdminUpdateRequestFilter = (typeof ADMIN_UPDATE_REQUEST_FILTERS)[number]
export type AdminUpdateRequestStatus = Exclude<AdminUpdateRequestFilter, 'all'>

export type AdminUpdateRequest = {
  id: string | number
  content: string
  email: string | null
  status: AdminUpdateRequestStatus
  created_at: string
  updated_at: string
  admin_note: string | null
  resolved_at: string | null
}

const ADMIN_UPDATE_REQUEST_COLUMNS = [
  'id',
  'content',
  'email',
  'status',
  'created_at',
  'updated_at',
  'admin_note',
  'resolved_at',
].join(',')

export async function getAdminUpdateRequests(status: AdminUpdateRequestFilter = 'pending') {
  let query = getSupabaseServerClient()
    .from('case_update_requests')
    .select(ADMIN_UPDATE_REQUEST_COLUMNS)

  if (status !== 'all') query = query.eq('status', status)

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) return { requests: null, error: '暂时无法读取修改反馈列表。' }

  return { requests: (data ?? []) as unknown as AdminUpdateRequest[], error: null }
}
