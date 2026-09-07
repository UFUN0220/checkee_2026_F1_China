import Link from 'next/link'
import { isAdminAuthenticated } from '~/lib/admin/auth'
import { getAdminStats } from '~/lib/admin/submissions'
import hallMaster from '~/data/checkmate/hall-master.json'
import { AdminLoginForm } from '~/components/admin/admin-login-form'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function safeRedirectPath(value: string | string[] | undefined) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/admin'
  return value
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>
}) {
  const authenticated = await isAdminAuthenticated()
  if (!authenticated) {
    const params = await searchParams
    return <AdminLoginForm redirectTo={safeRedirectPath(params.next)} />
  }

  const { stats, error } = await getAdminStats()
  return (
    <main
      className="min-h-[100dvh] px-5 py-16 text-ink dark:text-cream sm:px-8"
      style={{ background: 'var(--page-background-about)' }}
    >
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted dark:text-muted-dark">Internal tool</p>
            <h1 className="mt-2 text-3xl font-bold">Hall Admin</h1>
            <p className="mt-2 text-sm text-muted dark:text-muted-dark">名人堂投稿审核与发布状态管理。</p>
          </div>
          <form action="/api/admin/logout" method="post">
            <button className="rounded-lg border border-line px-3 py-2 text-sm font-semibold dark:border-line-dark" type="submit">退出登录</button>
          </form>
        </header>

        {error ? <p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-200">{error}</p> : null}
        {stats ? (
          <section className="mt-8 grid gap-4 sm:grid-cols-3" aria-label="审核统计">
            {[
              ['Pending', stats.pending],
              ['Published', stats.published],
              ['Rejected', stats.rejected],
            ].map(([label, count]) => (
              <div className="rounded-2xl border border-line bg-white/75 p-5 shadow-sm dark:border-line-dark dark:bg-white/5" key={label}>
                <p className="text-sm text-muted dark:text-muted-dark">{label}</p>
                <p className="mt-2 text-3xl font-bold">{count}</p>
              </div>
            ))}
          </section>
        ) : null}

        <section className="mt-8 rounded-2xl border border-line bg-white/75 p-5 shadow-sm dark:border-line-dark dark:bg-white/5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted dark:text-muted-dark">Last Published</p>
              <p className="mt-2 font-mono text-sm">{formatDate(stats?.lastPublishedAt ?? null)}</p>
            </div>
            <div>
              <p className="text-sm text-muted dark:text-muted-dark">Last generated</p>
              <p className="mt-2 font-mono text-sm">{hallMaster.generatedAt || '—'}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted dark:text-muted-dark">案例审核通过后，需要重新生成 Hall Master 数据并部署后，才会显示在名人堂。</p>
        </section>

        <div className="mt-8">
          <div className="flex flex-wrap gap-3">
            <Link className="inline-flex rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 dark:bg-cream dark:text-ink" href="/admin/submissions">
              进入投稿审核
            </Link>
            <Link className="inline-flex rounded-xl border border-line px-5 py-3 text-sm font-bold transition hover:bg-black/5 dark:border-line-dark dark:hover:bg-white/10" href="/admin/hall">
              查看 Hall 发布
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
