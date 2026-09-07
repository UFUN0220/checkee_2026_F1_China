import 'server-only'

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const RELEASES_ROOT = path.join(process.cwd(), 'data', 'checkmate', 'releases')
const RELEASE_VERSION_PATTERN = /^\d{8}-v\d{3}$/

export const HALL_DIFF_FIELDS = [
  'location',
  'degree',
  'major',
  'school',
  'startDate',
  'endDate',
  'waitingDays',
  'status',
  'note',
  'visibility',
] as const

export type HallDiffField = (typeof HALL_DIFF_FIELDS)[number]

export type HallDiffRecord = {
  id: string | number
  [key: string]: unknown
}

type HallMasterDocument = {
  dataVersion?: string
  generatedAt?: string
  recordCount?: number
  records: HallDiffRecord[]
}

export type HallReleaseDocument = {
  version: string
  generatedAt: string
  recordCount: number
  records: HallDiffRecord[]
}

export type HallFieldChange = {
  field: HallDiffField
  before: unknown
  after: unknown
}

export type HallDiff = {
  releaseA: HallReleaseDocument
  releaseB: HallReleaseDocument
  added: HallDiffRecord[]
  removed: HallDiffRecord[]
  changed: Array<{ id: string; before: HallDiffRecord; after: HallDiffRecord; changes: HallFieldChange[] }>
  unchanged: number
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, 'utf-8')) as T
}

export async function getHallReleaseVersions() {
  try {
    const entries = await readdir(RELEASES_ROOT, { withFileTypes: true })
    return entries
      .filter((entry) => entry.isDirectory() && RELEASE_VERSION_PATTERN.test(entry.name))
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left))
  } catch (error) {
    if ((error as { code?: string }).code === 'ENOENT') return []
    throw error
  }
}

function assertReleaseVersion(version: string) {
  if (!RELEASE_VERSION_PATTERN.test(version)) throw new Error('Invalid release version')
}

async function readRelease(version: string): Promise<HallReleaseDocument> {
  assertReleaseVersion(version)
  const document = await readJson<HallMasterDocument>(
    path.join(RELEASES_ROOT, version, 'hall-master.json')
  )
  return {
    version: document.dataVersion || version,
    generatedAt: document.generatedAt || '—',
    recordCount: document.recordCount ?? document.records.length,
    records: document.records,
  }
}

function recordId(record: HallDiffRecord) {
  return String(record.id)
}

function valuesEqual(before: unknown, after: unknown) {
  return JSON.stringify(before) === JSON.stringify(after)
}

function getChanges(before: HallDiffRecord, after: HallDiffRecord) {
  return HALL_DIFF_FIELDS.filter((field) => !valuesEqual(before[field], after[field])).map((field) => ({
    field,
    before: before[field],
    after: after[field],
  }))
}

export async function getHallDiff(versionA: string, versionB: string): Promise<HallDiff> {
  const [releaseA, releaseB] = await Promise.all([readRelease(versionA), readRelease(versionB)])
  const recordsA = new Map(releaseA.records.map((record) => [recordId(record), record]))
  const recordsB = new Map(releaseB.records.map((record) => [recordId(record), record]))

  const added = releaseB.records.filter((record) => !recordsA.has(recordId(record)))
  const removed = releaseA.records.filter((record) => !recordsB.has(recordId(record)))
  const changed: HallDiff['changed'] = []
  let unchanged = 0

  for (const record of releaseB.records) {
    const before = recordsA.get(recordId(record))
    if (!before) continue

    const changes = getChanges(before, record)
    if (changes.length) {
      changed.push({ id: recordId(record), before, after: record, changes })
    } else {
      unchanged += 1
    }
  }

  return { releaseA, releaseB, added, removed, changed, unchanged }
}
