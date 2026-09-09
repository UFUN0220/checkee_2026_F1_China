import {
  normalizeSubmissionLocation,
  type SubmissionLocation,
} from '~/lib/validations/case-submission'

export type SubmissionPayload = {
  name?: string | null
  location: SubmissionLocation
  degree: string
  major: string
  interviewDate: string
  status: 'Check' | 'Approved' | 'Issued' | 'Refused'
  endDate?: string | null
  school?: string | null
  note?: string | null
}

const SUBMISSION_STATUSES = ['Check', 'Approved', 'Issued', 'Refused'] as const

function normalizePayload(payload: SubmissionPayload) {
  const location = normalizeSubmissionLocation(String(payload.location ?? ''))
  if (!location || !payload.degree || !payload.major || !payload.interviewDate || !payload.status) {
    throw new Error('Required fields are missing')
  }

  if (!SUBMISSION_STATUSES.includes(payload.status)) {
    throw new Error('Invalid case status')
  }

  if (payload.status !== 'Check' && payload.endDate && payload.endDate < payload.interviewDate) {
    throw new Error('End date cannot be earlier than interview date')
  }

  return { ...payload, location }
}

export async function submitCase(payload: SubmissionPayload) {
  const normalizedPayload = normalizePayload(payload)

  const response = await fetch('/api/submissions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(normalizedPayload),
  })

  if (!response.ok) {
    throw new Error('Case submission failed')
  }
}
