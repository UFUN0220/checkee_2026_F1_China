import 'server-only'

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { getAdminSubmissions } from '~/lib/admin/submissions'

const DATA_ROOT = path.join(process.cwd(), 'data', 'checkmate')
const RELEASE_VERSION_PATTERN = /^\d{8}-v\d{3}$/

type HallRecordSource = 'legacy_excel' | 'submission_user' | 'admin_import'

type HallMasterFile = {
  dataVersion: string
  generatedAt: string
  recordCount: number
  records: Array<{ source: HallRecordSource }>
}

type PublishedSubmissionsFile = {
  records: Array<{ id: string }>
}

type ReleaseMetaFile = {
  version: string
  generatedAt: string
  legacyCount: number
  submissionCount: number
  totalCount: number
  source: HallRecordSource[]
}

export type HallReleaseSummary = ReleaseMetaFile & {
  snapshotIds: string[]
}

export type HallReleaseState = {
  hallMaster: HallMasterFile
  publishedSubmissions: PublishedSubmissionsFile
  releases: HallReleaseSummary[]
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, 'utf-8')) as T
}

async function readReleaseDirectories() {
  const releasesRoot = path.join(DATA_ROOT, 'releases')
  try {
    const entries = await readdir(releasesRoot, { withFileTypes: true })
    return entries
      .filter((entry) => entry.isDirectory() && RELEASE_VERSION_PATTERN.test(entry.name))
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left))
  } catch (error) {
    if ((error as { code?: string }).code === 'ENOENT') return []
    throw error
  }
}

export async function getHallReleaseState(): Promise<HallReleaseState> {
  const hallMaster = await readJson<HallMasterFile>(path.join(DATA_ROOT, 'hall-master.json'))
  const publishedSubmissions = await readJson<PublishedSubmissionsFile>(
    path.join(DATA_ROOT, 'published-submissions.json')
  )
  const releaseNames = await readReleaseDirectories()
  const releases = await Promise.all(
    releaseNames.map(async (version) => {
      const releaseRoot = path.join(DATA_ROOT, 'releases', version)
      const [meta, snapshot] = await Promise.all([
        readJson<ReleaseMetaFile>(path.join(releaseRoot, 'release-meta.json')),
        readJson<PublishedSubmissionsFile>(path.join(releaseRoot, 'published-submissions.json')),
      ])
      return { ...meta, snapshotIds: snapshot.records.map((record) => record.id) }
    })
  )

  return { hallMaster, publishedSubmissions, releases }
}

function normalizeSubmissionId(id: string | number) {
  const value = String(id).trim()
  return value.startsWith('submission-') ? value : `submission-${value}`
}

export async function getUnreleasedPublishedCount(releasedIds: ReadonlySet<string>) {
  try {
    const { submissions, error } = await getAdminSubmissions('published')
    if (error || !submissions) return { count: null, error: error || '无法读取 Supabase published 投稿。' }

    const count = submissions.filter((submission) => !releasedIds.has(normalizeSubmissionId(submission.id))).length
    return { count, error: null }
  } catch {
    return { count: null, error: '无法读取 Supabase published 投稿。' }
  }
}
