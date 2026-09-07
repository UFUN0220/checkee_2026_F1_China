import { NextResponse } from 'next/server'
import { clearAdminSessionCookie, isSameOrigin } from '~/lib/admin/auth'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: '请求来源无效。' }, { status: 403 })
  }

  const response = NextResponse.redirect(new URL('/admin', request.url))
  clearAdminSessionCookie(response)
  return response
}
