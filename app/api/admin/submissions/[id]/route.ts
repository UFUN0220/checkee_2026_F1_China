import { NextResponse } from 'next/server'
import { isAdminAuthenticated, isSameOrigin } from '~/lib/admin/auth'
import { getSupabaseServerClient } from '~/lib/supabase/server'

export const runtime = 'nodejs'

const ALLOWED_VISIBILITIES = new Set(['published', 'rejected'])

type SubmissionSyncResult = {
  submission_id: number
  case_id: string | null
  decision: 'inserted' | 'updated' | 'rejected'
  source_order: number | null
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

  const visibility =
    typeof body === 'object' && body !== null && !Array.isArray(body)
      ? (body as { visibility?: unknown }).visibility
      : undefined
  if (typeof visibility !== 'string' || !ALLOWED_VISIBILITIES.has(visibility)) {
    return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 })
  }

  const { id } = await params
  if (!/^\d+$/.test(id) || id.length > 19) {
    return NextResponse.json({ error: 'Invalid submission id' }, { status: 400 })
  }

  const submissionId = Number(id)
  if (!Number.isSafeInteger(submissionId) || submissionId <= 0) {
    return NextResponse.json({ error: 'Invalid submission id' }, { status: 400 })
  }

  const { data: rawData, error } = await getSupabaseServerClient()
    .rpc('sync_published_submission_to_hall_master', {
      p_submission_id: submissionId,
      p_decision: visibility,
    })
    .maybeSingle()
  const data = rawData as SubmissionSyncResult | null

  if (error) {
    const conflict = error.code === '40001' || error.code === 'P0002'
    return NextResponse.json(
      { error: conflict ? '投稿不存在，或已经被其他管理员处理。' : '发布投稿失败，Hall 主数据未更新。' },
      { status: conflict ? 409 : 500 }
    )
  }
  if (!data) {
    return NextResponse.json({ error: '投稿不存在，或已经被其他管理员处理。' }, { status: 409 })
  }

  let publishedAt: string | null = null
  if (visibility === 'published') {
    const { data: submissionRow } = await getSupabaseServerClient()
      .from('case_submissions')
      .select('published_at')
      .eq('id', submissionId)
      .maybeSingle()
    publishedAt = (submissionRow as { published_at?: string | null } | null)?.published_at ?? null
  }

  return NextResponse.json({
    submission: {
      id: data.submission_id,
      visibility,
      published_at: publishedAt,
    },
    master: {
      case_id: data.case_id,
      action: data.decision,
      source_order: data.source_order,
    },
  })
}
