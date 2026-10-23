import {
  normalizeSubmissionLocation,
  normalizeSubmissionStatus,
  type CaseSubmissionStatus,
} from '../validations/case-submission'
import {
  buildSubmitHallCaseRpcArgs,
  hashHallSubmissionKey,
  isIdempotencyToken,
} from './hall-submission-rpc'

const ALLOWED_STATUSES = new Set(['Check', 'Approved', 'Issued', 'Refused'])
const ALLOWED_DEGREES = new Set(['Bachelor', 'Master', 'PhD'])
const MAX_BODY_BYTES = 16 * 1024
const MAX_LENGTHS = {
  name: 120,
  location: 80,
  degree: 80,
  major: 120,
  school: 160,
  note: 1000,
} as const
const COMPACT_NOTE_LIMIT = 28

type SubmissionBody = {
  name?: unknown
  location?: unknown
  degree?: unknown
  major?: unknown
  interviewDate?: unknown
  status?: unknown
  endDate?: unknown
  school?: unknown
  note?: unknown
}

type SubmissionRow = {
  name: string | null
  location: string
  degree: string
  major: string
  school: string | null
  interview_date: string
  end_date: string | null
  status: string
  note: string | null
  compact_note: string | null
  detail_note: string | null
}

class BadRequestError extends Error {}

function requiredString(value: unknown, field: keyof typeof MAX_LENGTHS) {
  if (typeof value !== 'string') throw new BadRequestError(`Invalid ${field}`)
  const normalized = value.trim()
  if (!normalized) throw new BadRequestError(`Missing ${field}`)
  if (normalized.length > MAX_LENGTHS[field]) throw new BadRequestError(`Invalid ${field}`)
  return normalized
}

function optionalString(value: unknown, field: 'name' | 'school' | 'note') {
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

function currentDate(now: Date) {
  return now.toISOString().slice(0, 10)
}

function daysBetween(startDate: string, endDate: string) {
  const start = Date.parse(`${startDate}T00:00:00Z`)
  const end = Date.parse(`${endDate}T00:00:00Z`)
  return Math.round((end - start) / 86_400_000)
}

async function parseSubmissionBody(request: Request, now: Date): Promise<SubmissionRow> {
  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw new BadRequestError('Request body is too large')
  }
  const raw = await request.text()
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    throw new BadRequestError('Request body is too large')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    throw new BadRequestError('Invalid JSON')
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new BadRequestError('Invalid JSON body')
  }
  const body = parsed as SubmissionBody
  const rawLocation = requiredString(body.location, 'location')
  const location = normalizeSubmissionLocation(rawLocation)
  if (!location) throw new BadRequestError('Invalid location')
  const degree = requiredString(body.degree, 'degree')
  if (!ALLOWED_DEGREES.has(degree)) throw new BadRequestError('Invalid degree')
  const major = requiredString(body.major, 'major')
  const interviewDate = normalizedDate(body.interviewDate, 'interviewDate', true)
  if (!interviewDate) throw new BadRequestError('Missing interviewDate')
  const endDate = normalizedDate(body.endDate, 'endDate', false)
  const status = typeof body.status === 'string' ? body.status.trim() : ''
  if (!ALLOWED_STATUSES.has(status)) throw new BadRequestError('Invalid status')
  const normalizedStatus = normalizeSubmissionStatus(status as CaseSubmissionStatus, endDate)
  const normalizedEndDate = normalizedStatus === 'Check' ? null : endDate
  if (normalizedEndDate && normalizedEndDate < interviewDate) {
    throw new BadRequestError('End date cannot be earlier than interview date')
  }
  const waitingDays = normalizedEndDate
    ? daysBetween(interviewDate, normalizedEndDate)
    : normalizedStatus === 'Check'
      ? daysBetween(interviewDate, currentDate(now))
      : null
  if (waitingDays !== null && waitingDays < 0) throw new BadRequestError('Invalid waiting days')
  const name = optionalString(body.name, 'name')
  const note = optionalString(body.note, 'note')
  return {
    name,
    location,
    degree,
    major,
    school: optionalString(body.school, 'school'),
    interview_date: interviewDate,
    end_date: normalizedEndDate,
    status: normalizedStatus,
    note,
    compact_note: buildCompactNote(note),
    detail_note: note,
  }
}

export type SubmitHallCaseRpc = (args: ReturnType<typeof buildSubmitHallCaseRpcArgs>) => Promise<{
  data: { case_id?: string | null; rate_limited?: boolean } | null
  error: unknown
}>

export async function handleHallSubmissionPost(
  request: Request,
  dependencies: { secret: string; submit: SubmitHallCaseRpc; now?: Date }
) {
  try {
    const row = await parseSubmissionBody(request, dependencies.now ?? new Date())
    const token = request.headers.get('idempotency-key')?.trim().toLowerCase() ?? ''
    if (!isIdempotencyToken(token)) {
      return Response.json({ error: '提交请求无效，请刷新后重试。' }, { status: 400 })
    }
    // Vercel overwrites this platform-owned header at its edge. Generic
    // forwarding headers are client controlled unless a deployment proxy is
    // explicitly configured to sanitize them, so never use them as fallback.
    const clientAddress =
      process.env.VERCEL === '1'
        ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
        : null
    if (!clientAddress) {
      return Response.json({ error: '提交暂不可用，请稍后重试。' }, { status: 503 })
    }
    const idempotencyKey = hashHallSubmissionKey(
      dependencies.secret,
      'hall-submission-idempotency',
      token
    )
    const rateLimitKey = hashHallSubmissionKey(
      dependencies.secret,
      'hall-submission-rate-limit',
      clientAddress.slice(0, 200)
    )
    const requestFingerprint = hashHallSubmissionKey(
      dependencies.secret,
      'hall-submission-payload',
      JSON.stringify(row)
    )
    const { data, error } = await dependencies.submit(
      buildSubmitHallCaseRpcArgs(row, idempotencyKey, rateLimitKey, requestFingerprint)
    )
    if (error) {
      const rpcError = error as { code?: unknown; message?: unknown }
      if (
        rpcError.code === '22023' &&
        rpcError.message === 'Idempotency key reused with different payload'
      ) {
        return Response.json(
          { error: '该请求标识已用于不同内容，请刷新后重新提交。' },
          { status: 409 }
        )
      }
      return Response.json({ error: '提交失败，请稍后再试' }, { status: 500 })
    }
    if (data?.rate_limited) {
      return Response.json(
        { error: '提交次数较多，请稍后再试。' },
        { status: 429, headers: { 'Retry-After': '900' } }
      )
    }
    if (!data?.case_id) return Response.json({ error: '提交失败，请稍后再试' }, { status: 500 })
    return Response.json({ success: true, visibility: 'pending' })
  } catch (error) {
    if (error instanceof BadRequestError) {
      const status = error.message === 'Request body is too large' ? 413 : 400
      return Response.json({ error: '提交失败，请稍后再试' }, { status })
    }
    return Response.json({ error: '提交失败，请稍后再试' }, { status: 500 })
  }
}
