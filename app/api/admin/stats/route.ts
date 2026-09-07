import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '~/lib/admin/auth'
import { getAdminStats } from '~/lib/admin/submissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await getAdminStats()
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result.stats)
}
