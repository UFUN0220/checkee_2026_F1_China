import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isAdminAuthenticated } from '~/lib/admin/auth'
import { ADMIN_VISIBILITY_FILTERS, getAdminSubmissions, type AdminVisibilityFilter } from '~/lib/admin/submissions'
import { SubmissionList } from '~/components/admin/submission-list'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function normalizeFilter(value: string | string[] | undefined): AdminVisibilityFilter {
  const selected = Array.isArray(value) ? value[0] : value
  return ADMIN_VISIBILITY_FILTERS.includes(selected as AdminVisibilityFilter)
    ? (selected as AdminVisibilityFilter)
    : 'pending'
}

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ visibility?: string | string[] }>
}) {
  if (!(await isAdminAuthenticated())) redirect('/admin?next=/admin/submissions')

  const params = await searchParams
  const filter = normalizeFilter(params.visibility)
  const { submissions, error } = await getAdminSubmissions(filter)
  const filterLabels: Record<AdminVisibilityFilter, string> = {
    pending: 'Pending',
    published: 'Published',
    rejected: 'Rejected',
    all: 'All',
  }
  return (
    <main
      className="min-h-[100dvh] px-5 py-16 text-ink dark:text-cream sm:px-8"
      style={{ background: 'var(--page-background-hall)' }}
    >
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link className="text-sm font-semibold text-accent hover:underline" href="/admin">← Hall Admin</Link>
            <h1 className="mt-4 text-3xl font-bold">投稿审核</h1>
            <p className="mt-2 text-sm text-muted dark:text-muted-dark">按 visibility 筛选，按提交时间从新到旧排列。</p>
          </div>
          <form action="/api/admin/logout" method="post">
            <button className="rounded-lg border border-line px-3 py-2 text-sm font-semibold dark:border-line-dark" type="submit">退出登录</button>
          </form>
        </header>

        <nav className="mt-7 flex flex-wrap gap-2" aria-label="投稿状态筛选">
          {ADMIN_VISIBILITY_FILTERS.map((option) => (
            <Link
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${filter === option ? 'bg-ink text-white dark:bg-cream dark:text-ink' : 'border border-line text-muted hover:bg-black/5 dark:border-line-dark dark:text-muted-dark dark:hover:bg-white/10'}`}
              href={`/admin/submissions?visibility=${option}`}
              key={option}
            >
              {filterLabels[option]}
            </Link>
          ))}
        </nav>

        {error ? <p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-200">{error}</p> : null}
        <div className="mt-8">
          <SubmissionList filter={filter} initialSubmissions={submissions ?? []} />
        </div>
      </div>
    </main>
  )
}
