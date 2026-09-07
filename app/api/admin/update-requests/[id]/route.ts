import { NextResponse } from 'next/server'
import { isAdminAuthenticated, isSameOrigin } from '~/lib/admin/auth'
import { getSupabaseServerClient } from '~/lib/supabase/server'

export const runtime = 'nodejs'

const ALLOWED_STATUSES = new Set(['reviewing', 'completed', 'rejected'])
const MAX_ADMIN_NOTE_LENGTH = 4000

type RequestBody = {
  status?: unknown
  admin_note?: unknown
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: '请求来源无效。' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '更新信息无效。' }, { status: 400 })
  }

  if (!isObject(body)) return NextResponse.json({ error: '更新信息无效。' }, { status: 400 })

  const parsedBody = body as RequestBody
  const status = parsedBody.status
  const hasStatus = status !== undefined
  if (hasStatus && (typeof status !== 'string' || !ALLOWED_STATUSES.has(status))) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const hasAdminNote = Object.prototype.hasOwnProperty.call(parsedBody, 'admin_note')
  let adminNote: string | null | undefined
  if (hasAdminNote) {
    if (parsedBody.admin_note !== null && typeof parsedBody.admin_note !== 'string') {
      return NextResponse.json({ error: '管理员备注无效。' }, { status: 400 })
    }
    adminNote = typeof parsedBody.admin_note === 'string' ? parsedBody.admin_note.trim() || null : null
    if (adminNote && adminNote.length > MAX_ADMIN_NOTE_LENGTH) {
      return NextResponse.json({ error: '管理员备注不能超过 4000 个字符。' }, { status: 400 })
    }
  }

  if (!hasStatus && !hasAdminNote) {
    return NextResponse.json({ error: '没有需要更新的内容。' }, { status: 400 })
  }

  const { id } = await params
  if (!/^\d{1,20}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid update request id' }, { status: 400 })
  }

  const update: { status?: string; admin_note?: string | null; resolved_at?: string | null } = {}
  if (hasStatus) {
    update.status = status as string
    update.resolved_at = status === 'completed' || status === 'rejected' ? new Date().toISOString() : null
  }
  if (hasAdminNote) update.admin_note = adminNote ?? null

  let query = getSupabaseServerClient()
    .from('case_update_requests')
    .update(update)
    .eq('id', id)

  if (status === 'reviewing') query = query.eq('status', 'pending')
  if (status === 'completed' || status === 'rejected') query = query.eq('status', 'reviewing')

  const { data, error } = await query
    .select('id, content, email, status, created_at, updated_at, admin_note, resolved_at')
    .maybeSingle()

  if (error) return NextResponse.json({ error: '更新修改反馈失败。' }, { status: 500 })
  if (!data) {
    return NextResponse.json({ error: hasStatus ? '状态已变化，或该请求不存在。' : '修改反馈不存在。' }, { status: 409 })
  }

  return NextResponse.json({ request: data })
}
