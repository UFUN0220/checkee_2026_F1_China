import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '~/lib/supabase/server'

export const runtime = 'nodejs'

const ALLOWED_STATUSES = new Set(['Check', 'Approved', 'Issued', 'Refused'])
const MAX_LENGTHS = {
  location: 80,
  degree: 80,
  major: 120,
  school: 160,
  note: 1000,
} as const

type SubmissionBody = {
  location?: unknown
  degree?: unknown
  major?: unknown
  interviewDate?: unknown
  status?: unknown
  endDate?: unknown
  school?: unknown
  note?: unknown
}

class BadRequestError extends Error {}

function requiredString(value: unknown, field: keyof typeof MAX_LENGTHS) {
  if (typeof value !== 'string') throw new BadRequestError(`Invalid ${field}`)
  const normalized = value.trim()
  if (!normalized) throw new BadRequestError(`Missing ${field}`)
  if (normalized.length > MAX_LENGTHS[field]) throw new BadRequestError(`Invalid ${field}`)
  return normalized
}

function optionalString(value: unknown, field: 'school' | 'note') {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') throw new BadRequestError(`Invalid ${field}`)
  const normalized = value.trim()
  if (!normalized) return null
  if (normalized.length > MAX_LENGTHS[field]) throw new BadRequestError(`Invalid ${field}`)
  return normalized
}

function normalizedDate(value: unknown, field: 'interviewDate' | 'endDate', required: boolean) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new BadRequestError(`Missing ${field}`)
    return null
  }
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestError(`Invalid ${field}`)
  }
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new BadRequestError(`Invalid ${field}`)
  }
  return value
}

async function parseBody(request: Request) {
  let body: SubmissionBody
  try {
    const parsed = (await request.json()) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new BadRequestError('Invalid JSON body')
    }
    body = parsed as SubmissionBody
  } catch {
    throw new BadRequestError('Invalid JSON')
  }

  const location = requiredString(body.location, 'location')
  const degree = requiredString(body.degree, 'degree')
  const major = requiredString(body.major, 'major')
  const interviewDate = normalizedDate(body.interviewDate, 'interviewDate', true)
  const endDate = normalizedDate(body.endDate, 'endDate', false)
  const status = typeof body.status === 'string' ? body.status.trim() : ''
  if (!ALLOWED_STATUSES.has(status)) throw new BadRequestError('Invalid status')

  const normalizedEndDate = status === 'Check' ? null : endDate
  if (normalizedEndDate && interviewDate && normalizedEndDate < interviewDate) {
    throw new BadRequestError('End date cannot be earlier than interview date')
  }

  return {
    location,
    degree,
    major,
    interview_date: interviewDate,
    status,
    end_date: normalizedEndDate,
    school: optionalString(body.school, 'school'),
    note: optionalString(body.note, 'note'),
  }
}

export async function POST(request: Request) {
  try {
    const row = await parseBody(request)
    const { error } = await getSupabaseServerClient().from('case_submissions').insert(row)
    if (error) return NextResponse.json({ error: '提交失败，请稍后再试' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: '提交失败，请稍后再试' }, { status: 400 })
    }
    return NextResponse.json({ error: '提交失败，请稍后再试' }, { status: 500 })
  }
}
