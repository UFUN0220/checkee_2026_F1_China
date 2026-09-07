'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

export function AdminLoginForm({ redirectTo }: { redirectTo: string }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password, redirectTo }),
      })
      const result = (await response.json()) as { error?: string; redirectTo?: string }
      if (!response.ok) {
        setError(result.error || '登录失败，请稍后重试。')
        return
      }
      window.location.assign(result.redirectTo || '/admin')
    } catch {
      setError('网络连接失败，请稍后重试。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main
      className="flex min-h-[100dvh] items-center justify-center px-5 py-16 text-ink dark:text-cream"
      style={{ background: 'var(--page-background-about)' }}
    >
      <section className="w-full max-w-sm rounded-2xl border border-line bg-white/80 p-7 shadow-sm backdrop-blur dark:border-line-dark dark:bg-white/5">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted dark:text-muted-dark">
          Internal tool
        </p>
        <h1 className="mt-3 text-2xl font-bold">Hall Admin</h1>
        <p className="mt-2 text-sm text-muted dark:text-muted-dark">请输入管理员密码继续。</p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold" htmlFor="admin-password">
            管理员密码
          </label>
          <input
            autoComplete="current-password"
            className="w-full rounded-xl border border-line bg-white px-4 py-3 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-line-dark dark:bg-black/20"
            id="admin-password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
          {error ? <p className="text-sm text-accent" role="alert">{error}</p> : null}
          <button
            className="w-full rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-cream dark:text-ink"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? '验证中…' : '进入审核后台'}
          </button>
        </form>
      </section>
    </main>
  )
}
