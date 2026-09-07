import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '~/lib/supabase/server'

export const runtime = 'nodejs'

const MAX_CONTENT_LENGTH = 4000
const MAX_EMAIL_LENGTH = 320
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u

type UpdateRequestBody = {
  content?: unknown
  email?: unknown
}

class BadRequestError extends Error {}

function parseBody(body: unknown) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequestError('Invalid JSON body')
  }

  const { content: rawContent, email: rawEmail } = body as UpdateRequestBody
  if (typeof rawContent !== 'string') throw new BadRequestError('Invalid content')

  const content = rawContent.trim()
  if (!content || content.length > MAX_CONTENT_LENGTH) {
    throw new BadRequestError('Invalid content')
  }

  let email: string | null = null
  if (rawEmail !== undefined && rawEmail !== null) {
    if (typeof rawEmail !== 'string') throw new BadRequestError('Invalid email')
    const normalizedEmail = rawEmail.trim()
    if (normalizedEmail) {
      if (normalizedEmail.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(normalizedEmail)) {
        throw new BadRequestError('Invalid email')
      }
      email = normalizedEmail
    }
  }

  return { content, email }
}

export async function POST(request: Request) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      throw new BadRequestError('Invalid JSON')
    }

    const row = parseBody(body)
    const { data, error } = await getSupabaseServerClient()
      .from('case_update_requests')
      .insert(row)
      .select('id, status, created_at')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: '反馈提交失败，请稍后再试。' }, { status: 500 })
    }

    return NextResponse.json({ success: true, request: data })
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: '请填写有效的反馈内容；邮箱如填写也需有效。' }, { status: 400 })
    }
    return NextResponse.json({ error: '反馈提交失败，请稍后再试。' }, { status: 500 })
  }
}
