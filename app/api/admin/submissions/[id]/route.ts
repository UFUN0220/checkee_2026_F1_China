import { NextResponse } from 'next/server'
import { isAdminAuthenticated, isSameOrigin } from '~/lib/admin/auth'
import { getSupabaseServerClient } from '~/lib/supabase/server'

export const runtime = 'nodejs'

const ALLOWED_VISIBILITIES = new Set(['published', 'rejected'])

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

  const visibility =
    typeof body === 'object' && body !== null && !Array.isArray(body)
      ? (body as { visibility?: unknown }).visibility
      : undefined
  if (typeof visibility !== 'string' || !ALLOWED_VISIBILITIES.has(visibility)) {
    return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 })
  }

  const { id } = await params
  if (!id || id.length > 200) {
    return NextResponse.json({ error: 'Invalid submission id' }, { status: 400 })
  }

  const { data, error } = await getSupabaseServerClient()
    .from('case_submissions')
    .update({ visibility })
    .eq('id', id)
    .eq('visibility', 'pending')
    .select('id, visibility, published_at')
    .maybeSingle()

  if (error) return NextResponse.json({ error: '更新投稿状态失败。' }, { status: 500 })
  if (!data) {
    return NextResponse.json({ error: '投稿不存在，或已经被其他管理员处理。' }, { status: 409 })
  }

  return NextResponse.json({ submission: data })
}
