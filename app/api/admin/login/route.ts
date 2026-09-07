import { NextResponse } from 'next/server'
import { isAdminPassword, isSameOrigin, setAdminSessionCookie } from '~/lib/admin/auth'

export const runtime = 'nodejs'

function safeRedirectPath(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/admin'
  }
  return value
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: '请求来源无效。' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '登录信息无效。' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: '登录信息无效。' }, { status: 400 })
  }

  const payload = body as { password?: unknown; redirectTo?: unknown }
  if (!isAdminPassword(payload.password)) {
    return NextResponse.json({ error: '密码错误。' }, { status: 401 })
  }

  const response = NextResponse.json({ redirectTo: safeRedirectPath(payload.redirectTo) })
  if (!setAdminSessionCookie(response)) {
    return NextResponse.json({ error: '管理员登录尚未配置。' }, { status: 503 })
  }
  return response
}
