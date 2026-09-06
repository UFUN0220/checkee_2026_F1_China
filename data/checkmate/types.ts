export const CHECKMATE_LOCATIONS = [
  'beijing',
  'shanghai',
  'guangzhou',
  'shenyang',
  'wuhan',
] as const

export type CheckmateLocation = (typeof CHECKMATE_LOCATIONS)[number]

export type WaitStats = {
  q1: number | null
  median: number | null
  q3: number | null
}

export type CheckmateCase = {
  publicId: string
  location: CheckmateLocation
  status: 'pending' | 'clear' | 'reject'
  checkDate: string
  completeDate: string | null
  effectiveEndDate: string | null
  durationDays: number | null
  majorCategory: string
}

export type CheckmateSnapshot = {
  manifest: { recordCount: number; snapshotDate: string; isLive: boolean }
  national: {
    sampleCount: number
    pendingCount: number
    clearCount: number
    waitStats: WaitStats
  }
  locations: Record<CheckmateLocation, { sampleCount: number; waitStats: WaitStats }>
  monthlyF1Trends: Array<{
    month: string
    pendingCount: number
    clearCount: number
    totalCount: number
    averageWaitingDays: number | null
  }>
  cases: CheckmateCase[]
}

export const HALL_STATUSES = ['Check', 'Approved', 'Issued', 'Refused'] as const

export type HallStatus = (typeof HALL_STATUSES)[number]

export const HALL_VISIBILITIES = ['draft', 'pending', 'published', 'rejected'] as const

export type HallVisibility = (typeof HALL_VISIBILITIES)[number]

export type HallSource = 'legacy_excel' | 'submission_user' | 'admin_import'

export type HallRecord = {
  id: string
  location: string
  degree: string
  major: string
  school: string | null
  startDate: string
  endDate: string | null
  waitingDays: number | null
  status: HallStatus
  note: string | null
  publishedAt: string | null
  source: HallSource
  visibility: HallVisibility
  compactNote: string | null
  detailNote: string | null
}

export type CheckeeRecord = HallRecord

export type CheckeeDataset = {
  schemaVersion: number
  generatedAt: string
  sourceDescription: string
  sourceName: string
  snapshotDate: string
  recordCount: number
  records: CheckeeRecord[]
}
