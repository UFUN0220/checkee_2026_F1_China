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

export type CheckeeRecord = {
  id: string
  location: string | null
  degree: string | null
  major: string | null
  interviewDate: string | null
  endDate: string | null
  status: string | null
  waitingDays: number | null
  school: string | null
  note: string | null
}

export type CheckeeDataset = {
  sourceName: string
  snapshotDate: string
  recordCount: number
  records: CheckeeRecord[]
}
