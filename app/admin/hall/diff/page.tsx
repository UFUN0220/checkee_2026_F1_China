import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isAdminAuthenticated } from '~/lib/admin/auth'
import {
  getHallDiff,
  getHallReleaseVersions,
  type HallDiffField,
  type HallDiffRecord,
} from '~/lib/admin/hall-diff'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FIELD_LABELS: Record<HallDiffField, string> = {
  location: 'Location',
  degree: 'Degree',
  major: 'Major',
  school: 'School',
  startDate: 'Start Date',
  endDate: 'End Date',
  waitingDays: 'Waiting Days',
  status: 'Status',
  note: 'Note',
  visibility: 'Visibility',
}

function selectedVersion(
  value: string | string[] | undefined,
  versions: string[],
  fallback: string
) {
  const candidate = Array.isArray(value) ? value[0] : value
  return candidate && versions.includes(candidate) ? candidate : fallback
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function RecordFacts({ record }: { record: HallDiffRecord }) {
  return (
    <dl className="mt-3 grid gap-x-5 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <dt className="text-muted dark:text-muted-dark text-xs">Location</dt>
        <dd className="mt-0.5 break-words">{displayValue(record.location)}</dd>
      </div>
      <div>
        <dt className="text-muted dark:text-muted-dark text-xs">Waiting Days</dt>
        <dd className="mt-0.5">{displayValue(record.waitingDays)}</dd>
      </div>
      <div>
        <dt className="text-muted dark:text-muted-dark text-xs">Status</dt>
        <dd className="mt-0.5">{displayValue(record.status)}</dd>
      </div>
      <div>
        <dt className="text-muted dark:text-muted-dark text-xs">Visibility</dt>
        <dd className="mt-0.5 font-mono text-xs">{displayValue(record.visibility)}</dd>
      </div>
    </dl>
  )
}

function AddedSection({ records }: { records: HallDiffRecord[] }) {
  return (
    <section aria-labelledby="added-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold" id="added-heading">
          Added{' '}
          <span className="text-muted dark:text-muted-dark font-mono text-sm">
            {records.length}
          </span>
        </h2>
      </div>
      {records.length ? (
        <ul className="divide-line border-line dark:divide-line-dark dark:border-line-dark mt-3 divide-y rounded-xl border bg-white/60 dark:bg-white/5">
          {records.map((record) => (
            <li className="p-4" key={String(record.id)}>
              <p className="font-mono text-sm font-bold break-all">
                Case ID: {displayValue(record.id)}
              </p>
              <RecordFacts record={record} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted dark:text-muted-dark mt-3 text-sm">No records added.</p>
      )}
    </section>
  )
}

function RemovedSection({ records }: { records: HallDiffRecord[] }) {
  return (
    <section aria-labelledby="removed-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold" id="removed-heading">
          Removed{' '}
          <span className="text-muted dark:text-muted-dark font-mono text-sm">
            {records.length}
          </span>
        </h2>
      </div>
      {records.length ? (
        <ul className="divide-line border-line dark:divide-line-dark dark:border-line-dark mt-3 divide-y rounded-xl border bg-white/60 dark:bg-white/5">
          {records.map((record) => (
            <li className="p-4" key={String(record.id)}>
              <p className="font-mono text-sm font-bold break-all">
                Case ID: {displayValue(record.id)}
              </p>
              <RecordFacts record={record} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted dark:text-muted-dark mt-3 text-sm">No records removed.</p>
      )}
    </section>
  )
}

function IdentityMigrationSection({
  records,
}: {
  records: Array<{
    oldCaseId: string
    newCaseId: string
    recordA: HallDiffRecord
    recordB: HallDiffRecord
  }>
}) {
  return (
    <section aria-labelledby="identity-migrations-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold" id="identity-migrations-heading">
          Identity migrations{' '}
          <span className="text-muted dark:text-muted-dark font-mono text-sm">
            {records.length}
          </span>
        </h2>
      </div>
      {records.length ? (
        <ul className="divide-line border-line dark:divide-line-dark dark:border-line-dark mt-3 divide-y rounded-xl border bg-white/60 dark:bg-white/5">
          {records.map((record) => (
            <li className="p-4" key={`${record.oldCaseId}:${record.newCaseId}`}>
              <p className="font-mono text-sm font-bold break-all">
                {record.oldCaseId} → {record.newCaseId}
              </p>
              <p className="text-muted dark:text-muted-dark mt-1 text-sm">
                Identity migration; excluded from Added and Removed counts.
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-muted dark:text-muted-dark text-xs font-semibold uppercase">
                    Release A identity
                  </p>
                  <RecordFacts record={record.recordA} />
                </div>
                <div>
                  <p className="text-muted dark:text-muted-dark text-xs font-semibold uppercase">
                    Release B identity
                  </p>
                  <RecordFacts record={record.recordB} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted dark:text-muted-dark mt-3 text-sm">No identity migrations.</p>
      )}
    </section>
  )
}

function ChangedSection({
  records,
}: {
  records: Array<{
    id: string
    before: HallDiffRecord
    after: HallDiffRecord
    changes: Array<{ field: HallDiffField; before: unknown; after: unknown }>
  }>
}) {
  return (
    <section aria-labelledby="changed-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold" id="changed-heading">
          Changed{' '}
          <span className="text-muted dark:text-muted-dark font-mono text-sm">
            {records.length}
          </span>
        </h2>
      </div>
      {records.length ? (
        <ul className="divide-line border-line dark:divide-line-dark dark:border-line-dark mt-3 divide-y rounded-xl border bg-white/60 dark:bg-white/5">
          {records.map((record) => (
            <li className="p-4" key={record.id}>
              <p className="font-mono text-sm font-bold break-all">Case ID: {record.id}</p>
              <ul className="mt-3 grid gap-2 text-sm">
                {record.changes.map((change) => (
                  <li className="grid gap-2 sm:grid-cols-[8rem_1fr_1fr]" key={change.field}>
                    <span className="font-semibold">{FIELD_LABELS[change.field]}</span>
                    <span className="text-muted dark:text-muted-dark break-words">
                      <span className="mr-1 text-xs uppercase">Before:</span>
                      {displayValue(change.before)}
                    </span>
                    <span className="break-words">
                      <span className="mr-1 text-xs uppercase">After:</span>
                      {displayValue(change.after)}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted dark:text-muted-dark mt-3 text-sm">No records changed.</p>
      )}
    </section>
  )
}

export default async function AdminHallDiffPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string | string[]; b?: string | string[] }>
}) {
  if (!(await isAdminAuthenticated())) redirect('/admin?next=/admin/hall/diff')

  const versions = await getHallReleaseVersions()
  const latest = versions[0] || ''
  const previous = versions[1] || latest
  const params = await searchParams
  const versionA = selectedVersion(params.a, versions, previous)
  const versionB = selectedVersion(params.b, versions, latest)
  const diff = versionA && versionB ? await getHallDiff(versionA, versionB) : null

  return (
    <main
      className="text-ink dark:text-cream min-h-[100dvh] px-5 py-16 sm:px-8"
      style={{ background: 'var(--page-background-hall)' }}
    >
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link className="text-accent text-sm font-semibold hover:underline" href="/admin/hall">
              ← Hall Release Control
            </Link>
            <p className="text-muted dark:text-muted-dark mt-5 font-mono text-xs tracking-[0.24em] uppercase">
              Internal tool
            </p>
            <h1 className="mt-2 text-3xl font-bold">Hall Release Diff</h1>
            <p className="text-muted dark:text-muted-dark mt-2 max-w-2xl text-sm">
              比较两个 Hall release 的案例增删与字段变化。
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

        {versions.length ? (
          <form
            className="border-line dark:border-line-dark mt-8 grid gap-4 rounded-2xl border bg-white/70 p-5 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-end dark:bg-white/5"
            method="get"
          >
            <label className="grid gap-2 text-sm font-semibold" htmlFor="release-a">
              Release A
              <select
                className="border-line dark:border-line-dark rounded-lg border bg-white px-3 py-2 font-mono text-sm font-normal dark:bg-black/20"
                defaultValue={versionA}
                id="release-a"
                name="a"
              >
                {versions.map((version) => (
                  <option key={version} value={version}>
                    {version}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold" htmlFor="release-b">
              Release B
              <select
                className="border-line dark:border-line-dark rounded-lg border bg-white px-3 py-2 font-mono text-sm font-normal dark:bg-black/20"
                defaultValue={versionB}
                id="release-b"
                name="b"
              >
                {versions.map((version) => (
                  <option key={version} value={version}>
                    {version}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="bg-ink dark:bg-cream dark:text-ink rounded-lg px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
              type="submit"
            >
              Compare
            </button>
          </form>
        ) : null}

        {diff ? (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2" aria-label="Release summary">
              <div className="border-line dark:border-line-dark rounded-xl border bg-white/60 p-4 dark:bg-white/5">
                <p className="text-muted dark:text-muted-dark text-xs tracking-wide uppercase">
                  Release A
                </p>
                <p className="mt-1 font-mono text-sm font-bold break-all">
                  {diff.releaseA.version}
                </p>
                <p className="text-muted dark:text-muted-dark mt-1 text-xs">
                  Generated {diff.releaseA.generatedAt} · {diff.releaseA.recordCount} records
                </p>
              </div>
              <div className="border-line dark:border-line-dark rounded-xl border bg-white/60 p-4 dark:bg-white/5">
                <p className="text-muted dark:text-muted-dark text-xs tracking-wide uppercase">
                  Release B
                </p>
                <p className="mt-1 font-mono text-sm font-bold break-all">
                  {diff.releaseB.version}
                </p>
                <p className="text-muted dark:text-muted-dark mt-1 text-xs">
                  Generated {diff.releaseB.generatedAt} · {diff.releaseB.recordCount} records
                </p>
              </div>
            </section>

            <section
              className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5"
              aria-label="Diff summary"
            >
              {[
                ['Added', diff.added.length],
                ['Removed', diff.removed.length],
                ['Identity migrations', diff.identityMigrations.length],
                ['Changed', diff.changed.length],
                ['Unchanged', diff.unchanged],
              ].map(([label, count]) => (
                <div
                  className="border-line dark:border-line-dark rounded-xl border bg-white/60 p-4 dark:bg-white/5"
                  key={label}
                >
                  <p className="text-muted dark:text-muted-dark text-xs">{label}</p>
                  <p className="mt-1 font-mono text-xl font-bold">{count}</p>
                </div>
              ))}
            </section>

            <div className="mt-10 grid gap-10">
              <IdentityMigrationSection records={diff.identityMigrations} />
              <AddedSection records={diff.added} />
              <RemovedSection records={diff.removed} />
              <ChangedSection records={diff.changed} />
            </div>
          </>
        ) : (
          <p className="border-line text-muted dark:border-line-dark dark:text-muted-dark mt-8 rounded-xl border border-dashed p-6 text-center text-sm">
            尚未找到可比较的 release。
          </p>
        )}

        <p className="text-muted dark:text-muted-dark mt-10 text-sm leading-6">
          此页面只读取 release 中的 hall-master.json，不修改发布文件、数据库或 Hall 发布流程。
        </p>
      </div>
    </main>
  )
}
