import type { CheckmateLocation } from '~/data/checkmate/types'

export type SubmissionPayload = {
  location: CheckmateLocation
  degree: string
  major: string
  interviewDate: string
  status: 'Check' | 'Approved' | 'Issued' | 'Refused'
  endDate: string | null
  school: string | null
  note: string | null
}

const SUBMISSIONS_STORAGE_KEY = 'checkmate-case-submissions'
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

  if (typeof window === 'undefined') {
    throw new Error('Case submission is only available in the browser')
  }

  const existing = window.localStorage.getItem(SUBMISSIONS_STORAGE_KEY)
  const submissions = existing ? (JSON.parse(existing) as Array<Record<string, unknown>>) : []

  submissions.push({
    ...payload,
    submittedAt: new Date().toISOString(),
  })
  window.localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(submissions))
}
