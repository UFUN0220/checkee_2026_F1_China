import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '~/lib/admin/auth'
import { ADMIN_VISIBILITY_FILTERS, type AdminVisibilityFilter } from '~/lib/admin/submissions'
import { getCombinedHallAdminSubmissions } from '~/lib/admin/hall-submissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const requestedVisibility = new URL(request.url).searchParams.get('visibility') || 'pending'
  if (
    requestedVisibility !== 'draft' &&
    !ADMIN_VISIBILITY_FILTERS.includes(requestedVisibility as AdminVisibilityFilter)
  ) {
    return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 })
  }

  const result = await getCombinedHallAdminSubmissions(
    requestedVisibility as AdminVisibilityFilter | 'draft'
  )
  if (result.error || !result.submissions) {
    return NextResponse.json({ error: result.error || '暂时无法读取投稿列表。' }, { status: 500 })
  }
  return NextResponse.json({ submissions: result.submissions })
}
