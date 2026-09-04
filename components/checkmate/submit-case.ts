import type { CheckmateLocation } from '~/data/checkmate/types'

export type SubmissionPayload = {
  location: CheckmateLocation
  degree: string
  major: string
  interviewDate: string
  status: 'Check' | 'Approved' | 'Issued' | 'Refused'
  endDate?: string | null
  school?: string | null
  note?: string | null
}

const SUBMISSION_STATUSES = ['Check', 'Approved', 'Issued', 'Refused'] as const

function validateSubmission(payload: SubmissionPayload) {
  if (!payload.location || !payload.degree || !payload.major || !payload.interviewDate || !payload.status) {
    throw new Error('Required fields are missing')
  }

  if (!SUBMISSION_STATUSES.includes(payload.status)) {
    throw new Error('Invalid case status')
  }

  if (payload.status !== 'Check' && payload.endDate && payload.endDate < payload.interviewDate) {
    throw new Error('End date cannot be earlier than interview date')
  }
}

export async function submitCase(payload: SubmissionPayload) {
  validateSubmission(payload)

  const response = await fetch('/api/submissions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('Case submission failed')
  }
}
