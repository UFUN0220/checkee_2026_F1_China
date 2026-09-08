'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { FieldError, FormWrapper, SubmitButton } from '~/components/forms'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogBackdrop,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Label } from '~/components/ui/label'
import { Select } from '~/components/ui/select'
import { Textarea } from '~/components/ui/textarea'
import type {
  AdminUpdateRequest,
  AdminUpdateRequestFilter,
  AdminUpdateRequestStatus,
} from '~/lib/admin/update-requests'
import {
  adminUpdateRequestNoteSchema,
  adminUpdateRequestStatusSchema,
  type AdminUpdateRequestNoteFormValues,
  type AdminUpdateRequestNoteValues,
  type AdminUpdateRequestStatusFormValues,
  type AdminUpdateRequestStatusValues,
} from '~/lib/validations/update-request'

type AdminUpdateRequestActionStatus = Exclude<AdminUpdateRequestStatus, 'pending'>

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
    pending:
      'border border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200',
    reviewing:
      'border border-sky-200/70 bg-sky-50/70 text-sky-800 dark:border-sky-800/50 dark:bg-sky-950/30 dark:text-sky-200',
    completed:
      'border border-emerald-200/70 bg-emerald-50/70 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-200',
    rejected:
      'border border-rose-200/70 bg-rose-50/70 text-rose-800 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-200',
  }[status]
}

function statusActionLabel(status: AdminUpdateRequestActionStatus) {
  return {
    reviewing: '开始处理',
    completed: '标记为完成',
    rejected: '拒绝请求',
  }[status]
}

function statusSuccessMessage(status: AdminUpdateRequestActionStatus) {
  return {
    reviewing: '已开始处理该修改请求。',
    completed: '修改请求已标记为完成。',
    rejected: '修改请求已拒绝。',
  }[status]
}

function AdminUpdateRequestNoteForm({
  request,
  disabled,
  onSave,
}: {
  request: AdminUpdateRequest
  disabled: boolean
  onSave: (request: AdminUpdateRequest, values: AdminUpdateRequestNoteValues) => Promise<void>
}) {
  const form = useForm<AdminUpdateRequestNoteFormValues, unknown, AdminUpdateRequestNoteValues>({
    resolver: zodResolver(adminUpdateRequestNoteSchema),
    defaultValues: {
      admin_note: request.admin_note ?? '',
    },
  })
  const errorId = `admin-note-${request.id}-error`
  const hintId = `admin-note-${request.id}-hint`
  const hasError = Boolean(form.formState.errors.admin_note)

  useEffect(() => {
    form.reset({ admin_note: request.admin_note ?? '' })
  }, [form, request.admin_note, request.id])

  return (
    <FormWrapper
      form={form}
      onSubmit={(values) => onSave(request, values)}
      className="grid gap-3"
      noValidate
    >
      <div className="grid gap-2">
        <Label htmlFor={`admin-note-${request.id}`}>管理员备注</Label>
        <Textarea
          id={`admin-note-${request.id}`}
          maxLength={4000}
          placeholder="记录核实结果、数据同步情况或后续处理信息。"
          aria-describedby={`${hintId}${hasError ? ` ${errorId}` : ''}`}
          aria-invalid={hasError}
          {...form.register('admin_note')}
        />
        <p id={hintId} className="text-xs text-muted dark:text-muted-dark">
          最多 4000 个字符，留空可清除已有备注。
        </p>
        <FieldError<AdminUpdateRequestNoteFormValues> id={errorId} name="admin_note" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton
          variant="secondary"
          size="compact"
          disabled={disabled}
          loadingText="保存中…"
        >
          保存备注
        </SubmitButton>
        {request.status === 'completed' || request.status === 'rejected' ? (
          <span className="text-xs text-muted dark:text-muted-dark">终态记录仅支持查看和备注。</span>
        ) : null}
      </div>
    </FormWrapper>
  )
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
  const [pendingAction, setPendingAction] = useState<{
    id: string | number
    status: AdminUpdateRequestActionStatus
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const statusForm = useForm<
    AdminUpdateRequestStatusFormValues,
    unknown,
    AdminUpdateRequestStatusValues
  >({
    resolver: zodResolver(adminUpdateRequestStatusSchema),
    defaultValues: { status: 'reviewing' },
  })

  function openStatusDialog(id: string | number, status: AdminUpdateRequestActionStatus) {
    setError(null)
    setSuccess(null)
    statusForm.reset({ status })
    setPendingAction({ id, status })
  }

  function closeStatusDialog(open: boolean) {
    if (!open && busyId === null) {
      setPendingAction(null)
      statusForm.reset({ status: 'reviewing' })
    }
  }

  async function updateRequest(values: AdminUpdateRequestStatusValues) {
    if (!pendingAction) return

    const { id } = pendingAction
    setBusyId(id)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`/api/admin/update-requests/${encodeURIComponent(String(id))}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: values.status }),
      })
      const result = (await response.json()) as { error?: string; request?: AdminUpdateRequest }
      if (!response.ok || !result.request) {
        setError(result.error || '更新修改反馈状态失败。')
        return
      }
      setRequests((current) =>
        current.map((request) => (request.id === id ? (result.request as AdminUpdateRequest) : request))
      )
      setSuccess(statusSuccessMessage(values.status))
    } catch {
      setError('网络连接失败，请稍后重试。')
    } finally {
      setBusyId(null)
      setPendingAction(null)
      statusForm.reset({ status: 'reviewing' })
    }
  }

  async function saveNote(request: AdminUpdateRequest, values: AdminUpdateRequestNoteValues) {
    setNoteBusyId(request.id)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`/api/admin/update-requests/${encodeURIComponent(String(request.id))}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ admin_note: values.admin_note }),
      })
      const result = (await response.json()) as { error?: string; request?: AdminUpdateRequest }
      if (!response.ok || !result.request) {
        setError(result.error || '保存管理员备注失败。')
        return
      }
      setRequests((current) =>
        current.map((item) =>
          item.id === request.id ? (result.request as AdminUpdateRequest) : item
        )
      )
      setSuccess('管理员备注已保存。')
    } catch {
      setError('网络连接失败，请稍后重试。')
    } finally {
      setNoteBusyId(null)
    }
  }

  if (requests.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line p-6 text-center text-muted dark:border-line-dark dark:text-muted-dark">
        {filter === 'pending' ? '暂无待处理修改反馈。' : '暂无符合条件的修改反馈。'}
      </p>
    )
  }

  return (
    <>
      {pendingAction ? (
        <Dialog open onOpenChange={closeStatusDialog}>
          <DialogBackdrop />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <DialogContent>
              <DialogHeader>
                <DialogTitle>确认更新状态</DialogTitle>
                <DialogDescription>
                  请确认将这条修改请求更新为“{statusActionLabel(pendingAction.status)}”。
                </DialogDescription>
              </DialogHeader>
              <FormWrapper
                form={statusForm}
                onSubmit={updateRequest}
                className="grid gap-4"
                noValidate
              >
                <Label className="grid gap-2" htmlFor="admin-request-status">
                  <span>处理状态</span>
                  <Select
                    id="admin-request-status"
                    aria-describedby={
                      statusForm.formState.errors.status ? 'admin-request-status-error' : undefined
                    }
                    aria-invalid={Boolean(statusForm.formState.errors.status)}
                    {...statusForm.register('status')}
                  >
                    <option value={pendingAction.status}>
                      {pendingAction.status} · {statusActionLabel(pendingAction.status)}
                    </option>
                  </Select>
                  <FieldError<AdminUpdateRequestStatusFormValues>
                    id="admin-request-status-error"
                    name="status"
                  />
                </Label>
                <DialogFooter className="mt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={statusForm.formState.isSubmitting}
                    onClick={() => closeStatusDialog(false)}
                  >
                    取消
                  </Button>
                  <SubmitButton
                    variant={pendingAction.status === 'rejected' ? 'danger' : 'primary'}
                    loadingText="处理中…"
                  >
                    确认操作
                  </SubmitButton>
                </DialogFooter>
              </FormWrapper>
            </DialogContent>
          </div>
        </Dialog>
      ) : null}

      <div className="space-y-4">
        {success ? (
          <p className="rounded-xl border border-emerald-200/70 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-200" role="status">
            {success}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-rose-200/70 bg-rose-50/70 px-4 py-3 text-sm text-rose-800 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-200" role="alert">
            {error}
          </p>
        ) : null}
        {requests.map((request) => {
          const key = String(request.id)
          const isExpanded = expandedId === request.id
          const isBusy = busyId === request.id || noteBusyId === request.id
          const detailsId = `admin-request-details-${key}`

          return (
            <article className="border-b border-line py-4 first:pt-0 last:border-b-0 dark:border-line-dark" key={key}>
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
                <dl className="grid min-w-0 gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div><dt className="text-xs text-muted dark:text-muted-dark">请求 ID</dt><dd className="mt-0.5 break-all font-mono font-semibold">{display(request.id)}</dd></div>
                  <div><dt className="text-xs text-muted dark:text-muted-dark">提交时间</dt><dd className="mt-0.5">{formatDate(request.created_at, true)}</dd></div>
                  <div><dt className="text-xs text-muted dark:text-muted-dark">用户邮箱</dt><dd className="mt-0.5 break-words">{request.email ? <a className="text-accent hover:underline" href={`mailto:${request.email}`}>{request.email}</a> : '未提供'}</dd></div>
                  <div><dt className="text-xs text-muted dark:text-muted-dark">当前状态</dt><dd className="mt-0.5"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClass(request.status)}`}>{statusLabel(request.status)}</span></dd></div>
                  <div className="min-w-0 sm:col-span-2 lg:col-span-4"><dt className="text-xs text-muted dark:text-muted-dark">反馈内容</dt><dd className="mt-1 whitespace-pre-wrap break-words leading-6">{request.content}</dd></div>
                </dl>
                <div className="flex min-w-0 flex-wrap gap-2 md:justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="compact"
                    aria-expanded={isExpanded}
                    aria-controls={detailsId}
                    onClick={() => setExpandedId(isExpanded ? null : request.id)}
                  >
                    {isExpanded ? '收起详情' : '查看详情'}
                  </Button>
                  {request.status === 'pending' ? (
                    <Button
                      type="button"
                      size="compact"
                      disabled={isBusy}
                      onClick={() => openStatusDialog(request.id, 'reviewing')}
                    >
                      开始处理
                    </Button>
                  ) : null}
                  {request.status === 'reviewing' ? (
                    <>
                      <Button
                        type="button"
                        size="compact"
                        disabled={isBusy}
                        onClick={() => openStatusDialog(request.id, 'completed')}
                      >
                        完成
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="compact"
                        disabled={isBusy}
                        onClick={() => openStatusDialog(request.id, 'rejected')}
                      >
                        拒绝
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              {isExpanded ? (
                <div id={detailsId} className="mt-5 border-t border-line pt-4 text-sm dark:border-line-dark">
                  <dl className="grid min-w-0 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div><dt className="text-xs text-muted dark:text-muted-dark">创建时间</dt><dd className="mt-1">{formatDate(request.created_at, true)}</dd></div>
                    <div><dt className="text-xs text-muted dark:text-muted-dark">更新时间</dt><dd className="mt-1">{formatDate(request.updated_at, true)}</dd></div>
                    <div><dt className="text-xs text-muted dark:text-muted-dark">处理时间</dt><dd className="mt-1">{formatDate(request.resolved_at, true)}</dd></div>
                    <div className="min-w-0 sm:col-span-2 lg:col-span-3"><dt className="text-xs text-muted dark:text-muted-dark">完整反馈</dt><dd className="mt-1 whitespace-pre-wrap break-words leading-6">{request.content}</dd></div>
                  </dl>
                  <div className="mt-5 max-w-3xl">
                    <AdminUpdateRequestNoteForm
                      request={request}
                      disabled={isBusy}
                      onSave={saveNote}
                    />
                  </div>
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
    </>
  )
}
