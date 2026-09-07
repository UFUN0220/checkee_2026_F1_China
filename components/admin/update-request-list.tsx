'use client'

import { useState } from 'react'
import type {
  AdminUpdateRequest,
  AdminUpdateRequestFilter,
  AdminUpdateRequestStatus,
} from '~/lib/admin/update-requests'

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

function statusLabel(status: AdminUpdateRequestStatus) {
  return {
    pending: 'Pending',
    reviewing: 'Reviewing',
    completed: 'Completed',
    rejected: 'Rejected',
  }[status]
}

function statusClass(status: AdminUpdateRequestStatus) {
  return {
    pending: 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200',
    reviewing: 'bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200',
    completed: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200',
    rejected: 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200',
  }[status]
}

export function UpdateRequestList({
  filter,
  initialRequests,
}: {
  filter: AdminUpdateRequestFilter
  initialRequests: AdminUpdateRequest[]
}) {
  const [requests, setRequests] = useState(initialRequests)
  const [expandedId, setExpandedId] = useState<string | number | null>(null)
  const [busyId, setBusyId] = useState<string | number | null>(null)
  const [noteBusyId, setNoteBusyId] = useState<string | number | null>(null)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function updateRequest(id: string | number, status: AdminUpdateRequestStatus) {
    const confirmation = status === 'rejected' ? '确认拒绝该修改请求？' : status === 'completed' ? '确认将该修改请求标记为已完成？' : '确认开始处理该修改请求？'
    if (!window.confirm(confirmation)) return

    setBusyId(id)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`/api/admin/update-requests/${encodeURIComponent(String(id))}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const result = (await response.json()) as { error?: string; request?: AdminUpdateRequest }
      if (!response.ok || !result.request) {
        setError(result.error || '更新修改反馈状态失败。')
        return
      }
      setRequests((current) => current.map((request) => request.id === id ? result.request as AdminUpdateRequest : request))
      setSuccess(status === 'reviewing' ? '已开始处理该修改请求。' : status === 'completed' ? '修改请求已标记为完成。' : '修改请求已拒绝。')
    } catch {
      setError('网络连接失败，请稍后重试。')
    } finally {
      setBusyId(null)
    }
  }

  async function saveNote(request: AdminUpdateRequest) {
    const value = noteDrafts[String(request.id)] ?? request.admin_note ?? ''
    setNoteBusyId(request.id)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`/api/admin/update-requests/${encodeURIComponent(String(request.id))}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ admin_note: value.trim() || null }),
      })
      const result = (await response.json()) as { error?: string; request?: AdminUpdateRequest }
      if (!response.ok || !result.request) {
        setError(result.error || '保存管理员备注失败。')
        return
      }
      setRequests((current) => current.map((item) => item.id === request.id ? result.request as AdminUpdateRequest : item))
      setNoteDrafts((current) => ({ ...current, [String(request.id)]: result.request?.admin_note ?? '' }))
      setSuccess('管理员备注已保存。')
    } catch {
      setError('网络连接失败，请稍后重试。')
    } finally {
      setNoteBusyId(null)
    }
  }

  if (requests.length === 0) {
    return <p className="rounded-xl border border-dashed border-line p-6 text-center text-muted dark:border-line-dark dark:text-muted-dark">{filter === 'pending' ? '暂无待处理修改反馈。' : '暂无符合条件的修改反馈。'}</p>
  }

  return (
    <div className="space-y-4">
      {success ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200" role="status">{success}</p> : null}
      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-200" role="alert">{error}</p> : null}
      {requests.map((request) => {
        const key = String(request.id)
        const isExpanded = expandedId === request.id
        const isBusy = busyId === request.id
        const isNoteBusy = noteBusyId === request.id
        const noteValue = noteDrafts[key] ?? request.admin_note ?? ''
        const isTerminal = request.status === 'completed' || request.status === 'rejected'

        return (
          <article className="border-b border-line py-4 first:pt-0 last:border-b-0 dark:border-line-dark" key={key}>
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div><dt className="text-xs text-muted dark:text-muted-dark">请求 ID</dt><dd className="mt-0.5 font-mono font-semibold">{display(request.id)}</dd></div>
                <div><dt className="text-xs text-muted dark:text-muted-dark">提交时间</dt><dd className="mt-0.5">{formatDate(request.created_at, true)}</dd></div>
                <div><dt className="text-xs text-muted dark:text-muted-dark">用户邮箱</dt><dd className="mt-0.5 break-words">{request.email ? <a className="text-accent hover:underline" href={`mailto:${request.email}`}>{request.email}</a> : '未提供'}</dd></div>
                <div><dt className="text-xs text-muted dark:text-muted-dark">当前状态</dt><dd className="mt-0.5"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClass(request.status)}`}>{statusLabel(request.status)}</span></dd></div>
                <div className="sm:col-span-2 lg:col-span-4"><dt className="text-xs text-muted dark:text-muted-dark">反馈内容</dt><dd className="mt-1 whitespace-pre-wrap break-words leading-6">{request.content}</dd></div>
              </dl>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <button
                  className="rounded-lg border border-line px-3 py-2 text-sm font-semibold transition hover:bg-black/5 dark:border-line-dark dark:hover:bg-white/10"
                  onClick={() => setExpandedId(isExpanded ? null : request.id)}
                  type="button"
                >
                  {isExpanded ? '收起详情' : '查看详情'}
                </button>
                {request.status === 'pending' ? (
                  <button className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50" disabled={isBusy} onClick={() => updateRequest(request.id, 'reviewing')} type="button">开始处理</button>
                ) : null}
                {request.status === 'reviewing' ? (
                  <>
                    <button className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50" disabled={isBusy} onClick={() => updateRequest(request.id, 'completed')} type="button">完成</button>
                    <button className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50" disabled={isBusy} onClick={() => updateRequest(request.id, 'rejected')} type="button">拒绝</button>
                  </>
                ) : null}
              </div>
            </div>

            {isExpanded ? (
              <div className="mt-5 border-t border-line pt-4 text-sm dark:border-line-dark">
                <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div><dt className="text-xs text-muted dark:text-muted-dark">创建时间</dt><dd className="mt-1">{formatDate(request.created_at, true)}</dd></div>
                  <div><dt className="text-xs text-muted dark:text-muted-dark">更新时间</dt><dd className="mt-1">{formatDate(request.updated_at, true)}</dd></div>
                  <div><dt className="text-xs text-muted dark:text-muted-dark">处理时间</dt><dd className="mt-1">{formatDate(request.resolved_at, true)}</dd></div>
                  <div className="sm:col-span-2 lg:col-span-3"><dt className="text-xs text-muted dark:text-muted-dark">完整反馈</dt><dd className="mt-1 whitespace-pre-wrap break-words leading-6">{request.content}</dd></div>
                </dl>
                <div className="mt-5 max-w-3xl">
                  <label className="grid gap-2 text-sm font-semibold" htmlFor={`admin-note-${key}`}>
                    管理员备注
                    <textarea
                      className="min-h-24 w-full rounded-xl border border-line bg-white/70 px-3 py-2 text-sm font-normal outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-line-dark dark:bg-white/5"
                      id={`admin-note-${key}`}
                      maxLength={4000}
                      onChange={(event) => setNoteDrafts((current) => ({ ...current, [key]: event.target.value }))}
                      placeholder="记录核实结果、数据同步情况或后续处理信息。"
                      value={noteValue}
                    />
                  </label>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button className="rounded-lg border border-line px-3 py-2 text-sm font-semibold transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-line-dark dark:hover:bg-white/10" disabled={isNoteBusy || isBusy} onClick={() => saveNote(request)} type="button">{isNoteBusy ? '保存中...' : '保存备注'}</button>
                    {isTerminal ? <span className="text-xs text-muted dark:text-muted-dark">终态记录仅支持查看和备注。</span> : null}
                  </div>
                </div>
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}
