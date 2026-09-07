import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '~/lib/admin/auth'
import { ADMIN_SUBMISSION_COLUMNS } from '~/lib/admin/submissions'
import { getSupabaseServerClient } from '~/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_VISIBILITIES = new Set(['draft', 'pending', 'published', 'rejected', 'all'])

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const requestedVisibility = new URL(request.url).searchParams.get('visibility') || 'pending'
  if (!ALLOWED_VISIBILITIES.has(requestedVisibility)) {
    return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 })
  }

  let query = getSupabaseServerClient()
    .from('case_submissions')
    .select(ADMIN_SUBMISSION_COLUMNS)

  if (requestedVisibility !== 'all') query = query.eq('visibility', requestedVisibility)

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: '暂时无法读取投稿列表。' }, { status: 500 })
  return NextResponse.json({ submissions: data ?? [] })
}
