import { createHmac } from 'node:crypto'

export type HallSubmissionRpcRow = {
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

export function hashHallSubmissionKey(secret: string, purpose: string, value: string) {
  return createHmac('sha256', secret).update(`${purpose}\0${value}`).digest('hex')
}

export function isIdempotencyToken(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)
}

export function buildSubmitHallCaseRpcArgs(
  row: HallSubmissionRpcRow,
  idempotencyKey: string,
  rateLimitKey: string,
  requestFingerprint: string
) {
  return {
    p_idempotency_key: idempotencyKey,
    p_rate_limit_key: rateLimitKey,
    p_request_fingerprint: requestFingerprint,
    p_nickname: row.name,
    p_location: row.location,
    p_degree: row.degree,
    p_major: row.major,
    p_school: row.school,
    p_interview_date: row.interview_date,
    p_end_date: row.end_date,
    p_status: row.status,
    p_note: row.note,
    p_compact_note: row.compact_note,
    p_detail_note: row.detail_note,
  }
}
