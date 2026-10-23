import 'server-only'

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { getSupabaseServerClient } from '~/lib/supabase/server'
import {
  diffHallReleaseRecords,
  type HallIdentityMigrationPair,
} from '~/lib/admin/hall-diff-identities'

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
  changed: Array<{
    id: string
    before: HallDiffRecord
    after: HallDiffRecord
    changes: HallFieldChange[]
  }>
  identityMigrations: Array<{
    oldCaseId: string
    newCaseId: string
    recordA: HallDiffRecord
    recordB: HallDiffRecord
  }>
  unchanged: number
}

async function readIdentityMigrations(): Promise<HallIdentityMigrationPair[]> {
  const { data, error } = await getSupabaseServerClient()
    .from('hall_case_identity_migrations')
    .select('old_case_id,new_case_id')
  if (error) throw new Error('Unable to read Hall case identity migration map')
  return (data ?? []) as HallIdentityMigrationPair[]
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

export async function getHallDiff(versionA: string, versionB: string): Promise<HallDiff> {
  const [releaseA, releaseB, identityMigrations] = await Promise.all([
    readRelease(versionA),
    readRelease(versionB),
    readIdentityMigrations(),
  ])
  const diff = diffHallReleaseRecords(
    releaseA.records,
    releaseB.records,
    identityMigrations,
    HALL_DIFF_FIELDS
  )
  return {
    releaseA,
    releaseB,
    added: diff.added,
    removed: diff.removed,
    changed: diff.changed,
    identityMigrations: diff.migrations,
    unchanged: diff.unchanged,
  }
}
