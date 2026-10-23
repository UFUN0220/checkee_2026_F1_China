import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isAdminAuthenticated } from '~/lib/admin/auth'
import {
  getHallReleaseState,
  getUnreleasedPublishedCount,
  type HallReleaseSummary,
} from '~/lib/admin/hall'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function formatSource(source: HallReleaseSummary['source']) {
  return source.length ? source.join(' · ') : '—'
}

function Metric({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string | number
  mono?: boolean
}) {
  return (
    <div className="border-line dark:border-line-dark rounded-2xl border bg-white/75 p-5 shadow-sm dark:bg-white/5">
      <p className="text-muted dark:text-muted-dark text-sm">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${mono ? 'font-mono text-lg sm:text-xl' : ''}`}>
        {value}
      </p>
    </div>
  )
}

function ReleaseCard({ release }: { release: HallReleaseSummary }) {
  return (
    <li className="border-line dark:border-line-dark rounded-2xl border bg-white/75 p-5 shadow-sm dark:bg-white/5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-mono text-base font-bold">{release.version}</h3>
        <span className="text-muted dark:text-muted-dark text-sm">
          {release.totalCount} records
        </span>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted dark:text-muted-dark">Generated</dt>
          <dd className="mt-1 font-mono">{release.generatedAt}</dd>
        </div>
        <div>
          <dt className="text-muted dark:text-muted-dark">Legacy / submissions / migrations</dt>
          <dd className="mt-1 font-mono">
            {release.legacyCount} / {release.submissionCount} / {release.migrationCount ?? 0}
          </dd>
        </div>
        <div>
          <dt className="text-muted dark:text-muted-dark">Source</dt>
          <dd className="mt-1 break-words">{formatSource(release.source)}</dd>
        </div>
      </dl>
    </li>
  )
}

export default async function AdminHallPage() {
  if (!(await isAdminAuthenticated())) redirect('/admin?next=/admin/hall')

  const state = await getHallReleaseState()
  const latestRelease = state.releases[0]
  const releasedIds = new Set(latestRelease?.snapshotIds ?? [])
  const { count: unreleasedCount, error: publishedError } =
    await getUnreleasedPublishedCount(releasedIds)
  const legacyCount = state.hallMaster.records.filter(
    (record) => record.source === 'legacy_excel'
  ).length
  const migrationCount = state.hallMaster.records.filter(
    (record) => record.submissionOrigin === 'legacy_migration'
  ).length
  const submissionCount = state.publishedSubmissions.records.length

  return (
    <main
      className="text-ink dark:text-cream min-h-[100dvh] px-5 py-16 sm:px-8"
      style={{ background: 'var(--page-background-hall)' }}
    >
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link className="text-accent text-sm font-semibold hover:underline" href="/admin">
              ← Hall Admin
            </Link>
            <p className="text-muted dark:text-muted-dark mt-5 font-mono text-xs tracking-[0.24em] uppercase">
              Internal tool
            </p>
            <h1 className="mt-2 text-3xl font-bold">Hall Release Control Center</h1>
            <p className="text-muted dark:text-muted-dark mt-2 max-w-2xl text-sm">
              查看当前 Hall 发布状态与不可覆盖的 release 历史。
            </p>
          </div>
          <form action="/api/admin/logout" method="post">
            <button
              className="border-line dark:border-line-dark rounded-lg border px-3 py-2 text-sm font-semibold"
              type="submit"
            >
              退出登录
            </button>
          </form>
        </header>

        <section className="mt-8" aria-labelledby="current-release-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-xl font-bold" id="current-release-heading">
              Current Hall Status
            </h2>
            <span className="text-muted dark:text-muted-dark text-sm">
              Latest release: {latestRelease?.version || '—'}
            </span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Current Version" mono value={state.hallMaster.dataVersion || '—'} />
            <Metric label="Generated At" mono value={state.hallMaster.generatedAt || '—'} />
            <Metric
              label="Master Rows"
              value={state.hallMaster.masterRecordCount ?? state.hallMaster.recordCount}
            />
            <Metric
              label="Published Hall Records"
              value={state.hallMaster.publishedRecordCount ?? state.hallMaster.recordCount}
            />
            <Metric label="Legacy Records" value={legacyCount} />
            <Metric label="Real Web Submissions" value={submissionCount} />
            <Metric label="Migrated Legacy Identities" value={migrationCount} />
          </div>
        </section>

        <section className="mt-8" aria-labelledby="release-status-heading">
          <h2 className="sr-only" id="release-status-heading">
            Release status
          </h2>
          {publishedError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
              当前 Hall 文件可读取，但暂时无法核对真实 published 投稿与 Hall Master：
              {publishedError}
            </div>
          ) : unreleasedCount ? (
            <div className="border-accent/30 bg-accent/10 text-ink dark:text-cream rounded-2xl border px-5 py-4 text-sm">
              <p className="font-bold">New published cases waiting for release</p>
              <p className="mt-1">Count: {unreleasedCount}</p>
              <p className="text-muted dark:text-muted-dark mt-2">
                这些真实投稿已标记为 published，但尚未进入最新本地 Hall release。页面不会自动发布。
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
              Hall is up to date
            </div>
          )}
        </section>

        <section className="mt-10" aria-labelledby="release-history-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-xl font-bold" id="release-history-heading">
              Release History
            </h2>
            <span className="text-muted dark:text-muted-dark text-sm">
              {state.releases.length} releases preserved
            </span>
          </div>
          {state.releases.length ? (
            <ol className="mt-4 grid gap-4">
              {state.releases.map((release) => (
                <ReleaseCard key={release.version} release={release} />
              ))}
            </ol>
          ) : (
            <p className="border-line text-muted dark:border-line-dark dark:text-muted-dark mt-4 rounded-2xl border bg-white/75 p-5 text-sm dark:bg-white/5">
              尚未找到 release 记录。
            </p>
          )}
        </section>

        <section className="border-line dark:border-line-dark mt-10 grid gap-5 rounded-2xl border bg-white/75 p-5 shadow-sm sm:grid-cols-[1fr_auto] sm:items-start dark:bg-white/5">
          <div>
            <h2 className="text-xl font-bold">Release Process</h2>
            <ol className="text-muted dark:text-muted-dark mt-4 grid gap-2 text-sm">
              <li>
                <span className="text-ink dark:text-cream font-mono">1.</span> Review submissions
              </li>
              <li>
                <span className="text-ink dark:text-cream font-mono">2.</span> Export Hall data
              </li>
              <li>
                <span className="text-ink dark:text-cream font-mono">3.</span> Verify release
              </li>
              <li>
                <span className="text-ink dark:text-cream font-mono">4.</span> Deploy production
              </li>
            </ol>
            <p className="text-muted dark:text-muted-dark mt-4 text-sm leading-6">
              此页面只读发布状态，不直接修改 hall-master.json，也不会自动发布或部署。
            </p>
          </div>
          <div className="flex flex-wrap gap-3 sm:justify-end">
            <Link
              className="border-line dark:border-line-dark inline-flex rounded-xl border px-4 py-3 text-sm font-bold transition hover:bg-black/5 dark:hover:bg-white/10"
              href="/admin/submissions"
            >
              投稿审核
            </Link>
            <Link
              className="border-line dark:border-line-dark inline-flex rounded-xl border px-4 py-3 text-sm font-bold transition hover:bg-black/5 dark:hover:bg-white/10"
              href="/admin/hall/diff"
            >
              比较 Release
            </Link>
            <Link
              className="bg-ink dark:bg-cream dark:text-ink inline-flex rounded-xl px-4 py-3 text-sm font-bold text-white transition hover:opacity-90"
              href="/admin"
            >
              返回 Dashboard
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
