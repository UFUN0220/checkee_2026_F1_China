'use client'

import { useState } from 'react'
import type { AdminSubmission, AdminVisibilityFilter } from '~/lib/admin/submissions'

function display(value: string | number | null | undefined) {
  return value === null || value === undefined || value === '' ? '—' : String(value)
}

function formatDate(value: string | null | undefined, includeTime = false) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    ...(includeTime ? { timeStyle: 'short' } : {}),
  }).format(date)
}

export function SubmissionList({
  filter,
  initialSubmissions,
}: {
  filter: AdminVisibilityFilter
  initialSubmissions: AdminSubmission[]
}) {
  const [submissions, setSubmissions] = useState(initialSubmissions)
  const [expandedId, setExpandedId] = useState<string | number | null>(null)
  const [busyId, setBusyId] = useState<string | number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function updateVisibility(id: string | number, visibility: 'published' | 'rejected') {
    const confirmation =
      visibility === 'published' ? '确认发布该案例到 Hall？' : '确认拒绝该案例？'
    if (!window.confirm(confirmation)) return

    setBusyId(id)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`/api/admin/submissions/${encodeURIComponent(String(id))}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ visibility }),
      })
      const result = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(result.error || '更新投稿状态失败。')
        return
      }
      setSuccess(visibility === 'published' ? 'Approved successfully' : 'Rejected successfully')
      setSubmissions((current) => current.filter((submission) => submission.id !== id))
    } catch {
      setError('网络连接失败，请稍后重试。')
    } finally {
      setBusyId(null)
    }
  }

  if (submissions.length === 0) {
    return <p className="rounded-xl border border-dashed border-line p-6 text-center text-muted dark:border-line-dark dark:text-muted-dark">{filter === 'pending' ? '暂无待审核投稿。' : '暂无符合条件的投稿。'}</p>
  }

  return (
    <div className="space-y-4">
      {success ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200" role="status">{success}</p> : null}
      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-200" role="alert">{error}</p> : null}
      {submissions.map((submission) => {
        const isBusy = busyId === submission.id
        const isExpanded = expandedId === submission.id
        return (
          <article className="border-b border-line py-4 first:pt-0 last:border-b-0 dark:border-line-dark" key={String(submission.id)}>
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
              <dl className="grid gap-x-5 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
                <div><dt className="text-xs text-muted dark:text-muted-dark">地点</dt><dd className="mt-0.5 truncate font-semibold">{display(submission.location)}</dd></div>
                <div><dt className="text-xs text-muted dark:text-muted-dark">学位</dt><dd className="mt-0.5 truncate font-semibold">{display(submission.degree)}</dd></div>
                <div><dt className="text-xs text-muted dark:text-muted-dark">专业</dt><dd className="mt-0.5 truncate font-semibold">{display(submission.major)}</dd></div>
                <div><dt className="text-xs text-muted dark:text-muted-dark">学校</dt><dd className="mt-0.5 truncate font-semibold">{display(submission.school)}</dd></div>
                <div><dt className="text-xs text-muted dark:text-muted-dark">面签日期</dt><dd className="mt-0.5">{formatDate(submission.interview_date)}</dd></div>
                <div><dt className="text-xs text-muted dark:text-muted-dark">状态</dt><dd className="mt-0.5">{display(submission.status)}</dd></div>
                <div><dt className="text-xs text-muted dark:text-muted-dark">等待天数</dt><dd className="mt-0.5">{submission.waiting_days === null ? '—' : `${submission.waiting_days} 天`}</dd></div>
                <div><dt className="text-xs text-muted dark:text-muted-dark">提交时间</dt><dd className="mt-0.5">{formatDate(submission.created_at, true)}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs text-muted dark:text-muted-dark">备注摘要</dt><dd className="mt-0.5 truncate">{display(submission.note || submission.detail_note)}</dd></div>
              </dl>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <button
                  className="rounded-lg border border-line px-3 py-2 text-sm font-semibold transition hover:bg-black/5 dark:border-line-dark dark:hover:bg-white/10"
                  onClick={() => setExpandedId(isExpanded ? null : submission.id)}
                  type="button"
                >
                  {isExpanded ? '收起详情' : '查看详情'}
                </button>
                {submission.visibility === 'pending' ? (
                  <>
                    <button
                      className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isBusy}
                      onClick={() => updateVisibility(submission.id, 'published')}
                      type="button"
                    >
                      通过
                    </button>
                    <button
                      className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isBusy}
                      onClick={() => updateVisibility(submission.id, 'rejected')}
                      type="button"
                    >
                      拒绝
                    </button>
                  </>
                ) : null}
              </div>
            </div>
            {isExpanded ? (
              <div className="mt-5 border-t border-line pt-4 text-sm dark:border-line-dark">
                <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div><dt className="text-xs text-muted dark:text-muted-dark">ID</dt><dd className="mt-1 break-all font-mono text-xs">{display(submission.id)}</dd></div>
                  <div><dt className="text-xs text-muted dark:text-muted-dark">案例状态</dt><dd className="mt-1">{display(submission.status)}</dd></div>
                  <div><dt className="text-xs text-muted dark:text-muted-dark">发布状态</dt><dd className="mt-1">{display(submission.visibility)}</dd></div>
                  <div><dt className="text-xs text-muted dark:text-muted-dark">来源</dt><dd className="mt-1 break-words font-mono text-xs">{display(submission.source)}</dd></div>
                  <div><dt className="text-xs text-muted dark:text-muted-dark">地点</dt><dd className="mt-1 break-words">{display(submission.location)}</dd></div>
                  <div><dt className="text-xs text-muted dark:text-muted-dark">学位</dt><dd className="mt-1 break-words">{display(submission.degree)}</dd></div>
                  <div><dt className="text-xs text-muted dark:text-muted-dark">专业</dt><dd className="mt-1 break-words">{display(submission.major)}</dd></div>
                  <div><dt className="text-xs text-muted dark:text-muted-dark">学校</dt><dd className="mt-1 break-words">{display(submission.school)}</dd></div>
                  <div><dt className="text-xs text-muted dark:text-muted-dark">面签日期</dt><dd className="mt-1">{formatDate(submission.interview_date)}</dd></div>
                  <div><dt className="text-xs text-muted dark:text-muted-dark">结束日期</dt><dd className="mt-1">{formatDate(submission.end_date)}</dd></div>
                  <div><dt className="text-xs text-muted dark:text-muted-dark">等待天数</dt><dd className="mt-1">{submission.waiting_days === null ? '—' : `${submission.waiting_days} 天`}</dd></div>
                  <div><dt className="text-xs text-muted dark:text-muted-dark">Created</dt><dd className="mt-1">{formatDate(submission.created_at, true)}</dd></div>
                  <div><dt className="text-xs text-muted dark:text-muted-dark">Reviewed</dt><dd className="mt-1">{formatDate(submission.published_at, true)}</dd></div>
                  <div className="sm:col-span-2 lg:col-span-3"><dt className="text-xs text-muted dark:text-muted-dark">备注</dt><dd className="mt-1 whitespace-pre-wrap break-words">{display(submission.detail_note || submission.note)}</dd></div>
                </dl>
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}
