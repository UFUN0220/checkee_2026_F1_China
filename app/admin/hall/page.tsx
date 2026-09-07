import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isAdminAuthenticated } from '~/lib/admin/auth'
import { getHallReleaseState, getUnreleasedPublishedCount, type HallReleaseSummary } from '~/lib/admin/hall'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function formatSource(source: HallReleaseSummary['source']) {
  return source.length ? source.join(' · ') : '—'
}

function Metric({ label, value, mono = false }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-white/75 p-5 shadow-sm dark:border-line-dark dark:bg-white/5">
      <p className="text-sm text-muted dark:text-muted-dark">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${mono ? 'font-mono text-lg sm:text-xl' : ''}`}>{value}</p>
    </div>
  )
}

function ReleaseCard({ release }: { release: HallReleaseSummary }) {
  return (
    <li className="rounded-2xl border border-line bg-white/75 p-5 shadow-sm dark:border-line-dark dark:bg-white/5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-mono text-base font-bold">{release.version}</h3>
        <span className="text-sm text-muted dark:text-muted-dark">{release.totalCount} records</span>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted dark:text-muted-dark">Generated</dt>
          <dd className="mt-1 font-mono">{release.generatedAt}</dd>
        </div>
        <div>
          <dt className="text-muted dark:text-muted-dark">Legacy / submissions</dt>
          <dd className="mt-1 font-mono">{release.legacyCount} / {release.submissionCount}</dd>
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
  const { count: unreleasedCount, error: publishedError } = await getUnreleasedPublishedCount(releasedIds)
  const legacyCount = state.hallMaster.records.filter((record) => record.source === 'legacy_excel').length
  const submissionCount = state.publishedSubmissions.records.length

  return (
    <main
      className="min-h-[100dvh] px-5 py-16 text-ink dark:text-cream sm:px-8"
      style={{ background: 'var(--page-background-about)' }}
    >
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link className="text-sm font-semibold text-accent hover:underline" href="/admin">← Hall Admin</Link>
            <p className="mt-5 font-mono text-xs uppercase tracking-[0.24em] text-muted dark:text-muted-dark">Internal tool</p>
            <h1 className="mt-2 text-3xl font-bold">Hall Release Control Center</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted dark:text-muted-dark">查看当前 Hall 发布状态与不可覆盖的 release 历史。</p>
          </div>
          <form action="/api/admin/logout" method="post">
            <button className="rounded-lg border border-line px-3 py-2 text-sm font-semibold dark:border-line-dark" type="submit">退出登录</button>
          </form>
        </header>

        <section className="mt-8" aria-labelledby="current-release-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-xl font-bold" id="current-release-heading">Current Hall Status</h2>
            <span className="text-sm text-muted dark:text-muted-dark">Latest release: {latestRelease?.version || '—'}</span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="Current Version" mono value={state.hallMaster.dataVersion || '—'} />
            <Metric label="Generated At" mono value={state.hallMaster.generatedAt || '—'} />
            <Metric label="Total Records" value={state.hallMaster.recordCount} />
            <Metric label="Legacy Records" value={legacyCount} />
            <Metric label="Published Submissions" value={submissionCount} />
          </div>
        </section>

        <section className="mt-8" aria-labelledby="release-status-heading">
          <h2 className="sr-only" id="release-status-heading">Release status</h2>
          {publishedError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
              当前 Hall 文件可读取，但暂时无法读取 Supabase published 投稿：{publishedError}
            </div>
          ) : unreleasedCount ? (
            <div className="rounded-2xl border border-accent/30 bg-accent/10 px-5 py-4 text-sm text-ink dark:text-cream">
              <p className="font-bold">New published cases waiting for release</p>
              <p className="mt-1">Count: {unreleasedCount}</p>
              <p className="mt-2 text-muted dark:text-muted-dark">这些记录已在 Supabase 标记为 published，但尚未进入最新本地 Hall release。页面不会自动发布。</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
              Hall is up to date
            </div>
          )}
        </section>

        <section className="mt-10" aria-labelledby="release-history-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-xl font-bold" id="release-history-heading">Release History</h2>
            <span className="text-sm text-muted dark:text-muted-dark">{state.releases.length} releases preserved</span>
          </div>
          {state.releases.length ? (
            <ol className="mt-4 grid gap-4">
              {state.releases.map((release) => <ReleaseCard key={release.version} release={release} />)}
            </ol>
          ) : (
            <p className="mt-4 rounded-2xl border border-line bg-white/75 p-5 text-sm text-muted dark:border-line-dark dark:bg-white/5 dark:text-muted-dark">尚未找到 release 记录。</p>
          )}
        </section>

        <section className="mt-10 grid gap-5 rounded-2xl border border-line bg-white/75 p-5 shadow-sm dark:border-line-dark dark:bg-white/5 sm:grid-cols-[1fr_auto] sm:items-start">
          <div>
            <h2 className="text-xl font-bold">Release Process</h2>
            <ol className="mt-4 grid gap-2 text-sm text-muted dark:text-muted-dark">
              <li><span className="font-mono text-ink dark:text-cream">1.</span> Review submissions</li>
              <li><span className="font-mono text-ink dark:text-cream">2.</span> Export Hall data</li>
              <li><span className="font-mono text-ink dark:text-cream">3.</span> Verify release</li>
              <li><span className="font-mono text-ink dark:text-cream">4.</span> Deploy production</li>
            </ol>
            <p className="mt-4 text-sm leading-6 text-muted dark:text-muted-dark">此页面只读发布状态，不直接修改 hall-master.json，也不会自动发布或部署。</p>
          </div>
          <div className="flex flex-wrap gap-3 sm:justify-end">
            <Link className="inline-flex rounded-xl border border-line px-4 py-3 text-sm font-bold transition hover:bg-black/5 dark:border-line-dark dark:hover:bg-white/10" href="/admin/submissions">
              投稿审核
            </Link>
            <Link className="inline-flex rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 dark:bg-cream dark:text-ink" href="/admin">
              返回 Dashboard
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
