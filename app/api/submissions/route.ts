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
const COMPACT_NOTE_LIMIT = 28

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

function buildCompactNote(detailNote: string | null) {
  if (!detailNote) return null
  if (detailNote.length <= COMPACT_NOTE_LIMIT) return detailNote

  const firstSentence = detailNote.split(/(?<=[。！？!?；;\n])/u, 1)[0]?.trim() || detailNote
  if (firstSentence.length <= COMPACT_NOTE_LIMIT) return firstSentence
  return `${firstSentence.slice(0, COMPACT_NOTE_LIMIT - 1).trimEnd()}…`
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

function currentDate() {
  return new Date().toISOString().slice(0, 10)
}

function daysBetween(startDate: string, endDate: string) {
  const start = Date.parse(`${startDate}T00:00:00Z`)
  const end = Date.parse(`${endDate}T00:00:00Z`)
  return Math.round((end - start) / 86_400_000)
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
  if (!interviewDate) throw new BadRequestError('Missing interviewDate')
  const endDate = normalizedDate(body.endDate, 'endDate', false)
  const status = typeof body.status === 'string' ? body.status.trim() : ''
  if (!ALLOWED_STATUSES.has(status)) throw new BadRequestError('Invalid status')

  const normalizedEndDate = status === 'Check' ? null : endDate
  if (normalizedEndDate && interviewDate && normalizedEndDate < interviewDate) {
    throw new BadRequestError('End date cannot be earlier than interview date')
  }
  const waitingDays = normalizedEndDate
    ? daysBetween(interviewDate, normalizedEndDate)
    : status === 'Check'
      ? daysBetween(interviewDate, currentDate())
      : null
  if (waitingDays !== null && waitingDays < 0) throw new BadRequestError('Invalid waiting days')
  const detailNote = optionalString(body.note, 'note')

  return {
    location,
    degree,
    major,
    interview_date: interviewDate,
    start_date: interviewDate,
    status,
    end_date: normalizedEndDate,
    school: optionalString(body.school, 'school'),
    note: detailNote,
    compact_note: buildCompactNote(detailNote),
    detail_note: detailNote,
    waiting_days: waitingDays,
    source: 'submission_user',
    visibility: 'pending',
    published_at: null,
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
