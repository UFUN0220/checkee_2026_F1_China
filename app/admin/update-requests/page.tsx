import Link from 'next/link'
import { redirect } from 'next/navigation'
import { UpdateRequestList } from '~/components/admin/update-request-list'
import { isAdminAuthenticated } from '~/lib/admin/auth'
import {
  ADMIN_UPDATE_REQUEST_FILTERS,
  getAdminUpdateRequests,
  type AdminUpdateRequestFilter,
} from '~/lib/admin/update-requests'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function normalizeFilter(value: string | string[] | undefined): AdminUpdateRequestFilter {
  const selected = Array.isArray(value) ? value[0] : value
  return ADMIN_UPDATE_REQUEST_FILTERS.includes(selected as AdminUpdateRequestFilter)
    ? (selected as AdminUpdateRequestFilter)
    : 'pending'
}

export default async function AdminUpdateRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>
}) {
  if (!(await isAdminAuthenticated())) redirect('/admin?next=/admin/update-requests')

  const params = await searchParams
  const filter = normalizeFilter(params.status)
  const { requests, error } = await getAdminUpdateRequests(filter)
  const filterLabels: Record<AdminUpdateRequestFilter, string> = {
    pending: 'Pending',
    reviewing: 'Reviewing',
    completed: 'Completed',
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
            <h1 className="mt-4 text-3xl font-bold">修改反馈</h1>
            <p className="mt-2 text-sm text-muted dark:text-muted-dark">收集、核实并记录用户对 Hall 案例的修改请求。</p>
          </div>
          <form action="/api/admin/logout" method="post">
            <button className="rounded-lg border border-line px-3 py-2 text-sm font-semibold dark:border-line-dark" type="submit">退出登录</button>
          </form>
        </header>

        <nav className="mt-7 flex flex-wrap gap-2" aria-label="修改反馈状态筛选">
          {ADMIN_UPDATE_REQUEST_FILTERS.map((option) => (
            <Link
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${filter === option ? 'bg-ink text-white dark:bg-cream dark:text-ink' : 'border border-line text-muted hover:bg-black/5 dark:border-line-dark dark:text-muted-dark dark:hover:bg-white/10'}`}
              href={`/admin/update-requests?status=${option}`}
              key={option}
            >
              {filterLabels[option]}
            </Link>
          ))}
        </nav>

        {error ? <p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-200">{error}</p> : null}
        <div className="mt-8">
          <UpdateRequestList filter={filter} initialRequests={requests ?? []} />
        </div>
      </div>
    </main>
  )
}
