'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
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
import type { AdminSubmission, AdminVisibilityFilter } from '~/lib/admin/submissions'
import {
  adminSubmissionDecisionSchema,
  type AdminSubmissionDecisionFormValues,
  type AdminSubmissionDecisionValues,
} from '~/lib/validations/admin-submission'

type SubmissionVisibility = 'published' | 'rejected'

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

function visibilityLabel(visibility: string) {
  return (
    {
      pending: 'Pending',
      published: 'Published',
      rejected: 'Rejected',
    }[visibility] ?? display(visibility)
  )
}

function visibilityClass(visibility: string) {
  return {
    pending:
      'border border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200',
    published:
      'border border-emerald-200/70 bg-emerald-50/70 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-200',
    rejected:
      'border border-rose-200/70 bg-rose-50/70 text-rose-800 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-200',
  }[visibility]
}

function successMessage(visibility: SubmissionVisibility) {
  return visibility === 'published' ? '投稿已发布到 Hall。' : '投稿已拒绝。'
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
  const [pendingAction, setPendingAction] = useState<{
    submission: AdminSubmission
    visibility: SubmissionVisibility
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const decisionForm = useForm<
    AdminSubmissionDecisionFormValues,
    unknown,
    AdminSubmissionDecisionValues
  >({
    resolver: zodResolver(adminSubmissionDecisionSchema),
    defaultValues: { visibility: 'published' },
  })

  function openDecisionDialog(submission: AdminSubmission, visibility: SubmissionVisibility) {
    setError(null)
    setSuccess(null)
    decisionForm.reset({ visibility })
    setPendingAction({ submission, visibility })
  }

  function closeDecisionDialog(open: boolean) {
    if (!open && busyId === null) {
      setPendingAction(null)
      decisionForm.reset({ visibility: 'published' })
    }
  }

  async function updateVisibility(values: AdminSubmissionDecisionValues) {
    if (!pendingAction) return

    const { submission } = pendingAction
    setBusyId(submission.id)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(
        `/api/admin/submissions/${encodeURIComponent(String(submission.id))}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ visibility: values.visibility }),
        }
      )
      const result = (await response.json()) as {
        error?: string
        submission?: { id: string | number; visibility: string; published_at: string | null }
      }
      if (!response.ok) {
        setError(result.error || '更新投稿状态失败。')
        return
      }
      setSuccess(successMessage(values.visibility))
      setSubmissions((current) => current.filter((item) => item.id !== submission.id))
    } catch {
      setError('网络连接失败，请稍后重试。')
    } finally {
      setBusyId(null)
      setPendingAction(null)
      decisionForm.reset({ visibility: 'published' })
    }
  }

  return (
    <>
      {pendingAction ? (
        <Dialog open onOpenChange={closeDecisionDialog}>
          <DialogBackdrop />
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {pendingAction.visibility === 'published' ? '确认发布投稿' : '确认拒绝投稿'}
                </DialogTitle>
                <DialogDescription>
                  {pendingAction.visibility === 'published'
                    ? '发布后，该案例将进入 Hall 展示数据。'
                    : '拒绝后，该投稿不会进入 Hall 展示数据。'}
                </DialogDescription>
              </DialogHeader>

              <dl className="border-line dark:border-line-dark grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 rounded-xl border bg-white/45 p-4 text-sm dark:bg-white/5">
                <div className="min-w-0">
                  <dt className="text-muted dark:text-muted-dark text-xs">地点</dt>
                  <dd className="mt-1 font-semibold break-words">
                    {display(pendingAction.submission.location)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-muted dark:text-muted-dark text-xs">学位</dt>
                  <dd className="mt-1 font-semibold break-words">
                    {display(pendingAction.submission.degree)}
                  </dd>
                </div>
                <div className="col-span-2 min-w-0">
                  <dt className="text-muted dark:text-muted-dark text-xs">专业 / 学校</dt>
                  <dd className="mt-1 font-semibold break-words">
                    {display(pendingAction.submission.major)} /{' '}
                    {display(pendingAction.submission.school)}
                  </dd>
                </div>
                <div className="col-span-2 min-w-0">
                  <dt className="text-muted dark:text-muted-dark text-xs">面签日期</dt>
                  <dd className="mt-1">{formatDate(pendingAction.submission.interview_date)}</dd>
                </div>
              </dl>

              <FormWrapper
                form={decisionForm}
                onSubmit={updateVisibility}
                className="mt-5 grid gap-4"
                noValidate
              >
                <Label className="grid gap-2" htmlFor="admin-submission-visibility">
                  <span>审核结果</span>
                  <Select
                    id="admin-submission-visibility"
                    aria-describedby={
                      decisionForm.formState.errors.visibility
                        ? 'admin-submission-visibility-error'
                        : undefined
                    }
                    aria-invalid={Boolean(decisionForm.formState.errors.visibility)}
                    {...decisionForm.register('visibility')}
                  >
                    <option value={pendingAction.visibility}>
                      {pendingAction.visibility === 'published'
                        ? 'Published · 发布'
                        : 'Rejected · 拒绝'}
                    </option>
                  </Select>
                  <FieldError<AdminSubmissionDecisionFormValues>
                    id="admin-submission-visibility-error"
                    name="visibility"
                  />
                </Label>
                <DialogFooter className="mt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={decisionForm.formState.isSubmitting}
                    onClick={() => closeDecisionDialog(false)}
                  >
                    取消
                  </Button>
                  <SubmitButton
                    variant={pendingAction.visibility === 'rejected' ? 'danger' : 'primary'}
                    loadingText="处理中…"
                  >
                    {pendingAction.visibility === 'published' ? '确认发布' : '确认拒绝'}
                  </SubmitButton>
                </DialogFooter>
              </FormWrapper>
            </DialogContent>
          </div>
        </Dialog>
      ) : null}

      <div className="space-y-4">
        {success ? (
          <p
            className="rounded-xl border border-emerald-200/70 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-200"
            role="status"
          >
            {success}
          </p>
        ) : null}
        {error ? (
          <p
            className="rounded-xl border border-rose-200/70 bg-rose-50/70 px-4 py-3 text-sm text-rose-800 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-200"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {submissions.length === 0 ? (
          <p className="border-line text-muted dark:border-line-dark dark:text-muted-dark rounded-xl border border-dashed p-6 text-center">
            {filter === 'pending' ? '暂无待审核投稿。' : '暂无符合条件的投稿。'}
          </p>
        ) : (
          submissions.map((submission) => {
            const key = String(submission.id)
            const isBusy = busyId === submission.id
            const isExpanded = expandedId === submission.id
            const detailsId = `admin-submission-details-${key}`

            return (
              <article
                className="border-line dark:border-line-dark border-b py-4 first:pt-0 last:border-b-0"
                key={key}
              >
                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
                  <dl className="grid min-w-0 gap-x-5 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
                    <div className="min-w-0">
                      <dt className="text-muted dark:text-muted-dark text-xs">地点</dt>
                      <dd className="mt-0.5 truncate font-semibold">
                        {display(submission.location)}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted dark:text-muted-dark text-xs">学位</dt>
                      <dd className="mt-0.5 truncate font-semibold">
                        {display(submission.degree)}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted dark:text-muted-dark text-xs">专业</dt>
                      <dd className="mt-0.5 truncate font-semibold">{display(submission.major)}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted dark:text-muted-dark text-xs">学校</dt>
                      <dd className="mt-0.5 truncate font-semibold">
                        {display(submission.school)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted dark:text-muted-dark text-xs">面签日期</dt>
                      <dd className="mt-0.5">{formatDate(submission.interview_date)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted dark:text-muted-dark text-xs">状态</dt>
                      <dd className="mt-0.5">{display(submission.status)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted dark:text-muted-dark text-xs">等待天数</dt>
                      <dd className="mt-0.5">
                        {submission.waiting_days === null ? '—' : `${submission.waiting_days} 天`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted dark:text-muted-dark text-xs">提交时间</dt>
                      <dd className="mt-0.5">{formatDate(submission.created_at, true)}</dd>
                    </div>
                    <div className="min-w-0 sm:col-span-2">
                      <dt className="text-muted dark:text-muted-dark text-xs">发布状态</dt>
                      <dd className="mt-0.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${visibilityClass(submission.visibility)}`}
                        >
                          {visibilityLabel(submission.visibility)}
                        </span>
                      </dd>
                    </div>
                    <div className="min-w-0 sm:col-span-2 lg:col-span-5">
                      <dt className="text-muted dark:text-muted-dark text-xs">备注摘要</dt>
                      <dd className="mt-0.5 truncate">
                        {display(submission.note || submission.detail_note)}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex min-w-0 flex-wrap gap-2 md:justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      size="compact"
                      aria-expanded={isExpanded}
                      aria-controls={detailsId}
                      onClick={() => setExpandedId(isExpanded ? null : submission.id)}
                    >
                      {isExpanded ? '收起详情' : '查看详情'}
                    </Button>
                    {submission.visibility === 'pending' ? (
                      <>
                        <Button
                          type="button"
                          size="compact"
                          disabled={isBusy}
                          aria-busy={isBusy}
                          onClick={() => openDecisionDialog(submission, 'published')}
                        >
                          通过
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="compact"
                          disabled={isBusy}
                          aria-busy={isBusy}
                          onClick={() => openDecisionDialog(submission, 'rejected')}
                        >
                          拒绝
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>

                {isExpanded ? (
                  <div
                    id={detailsId}
                    className="border-line dark:border-line-dark mt-5 border-t pt-4 text-sm"
                  >
                    <dl className="grid min-w-0 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <dt className="text-muted dark:text-muted-dark text-xs">ID</dt>
                        <dd className="mt-1 font-mono text-xs break-all">
                          {display(submission.id)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted dark:text-muted-dark text-xs">名字</dt>
                        <dd className="mt-1 break-words">{display(submission.name)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted dark:text-muted-dark text-xs">案例状态</dt>
                        <dd className="mt-1">{display(submission.status)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted dark:text-muted-dark text-xs">发布状态</dt>
                        <dd className="mt-1">{visibilityLabel(submission.visibility)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted dark:text-muted-dark text-xs">来源</dt>
                        <dd className="mt-1 font-mono text-xs break-words">
                          {display(submission.source)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted dark:text-muted-dark text-xs">地点</dt>
                        <dd className="mt-1 break-words">{display(submission.location)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted dark:text-muted-dark text-xs">学位</dt>
                        <dd className="mt-1 break-words">{display(submission.degree)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted dark:text-muted-dark text-xs">专业</dt>
                        <dd className="mt-1 break-words">{display(submission.major)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted dark:text-muted-dark text-xs">学校</dt>
                        <dd className="mt-1 break-words">{display(submission.school)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted dark:text-muted-dark text-xs">面签日期</dt>
                        <dd className="mt-1">{formatDate(submission.interview_date)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted dark:text-muted-dark text-xs">结束日期</dt>
                        <dd className="mt-1">{formatDate(submission.end_date)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted dark:text-muted-dark text-xs">等待天数</dt>
                        <dd className="mt-1">
                          {submission.waiting_days === null ? '—' : `${submission.waiting_days} 天`}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted dark:text-muted-dark text-xs">Created</dt>
                        <dd className="mt-1">{formatDate(submission.created_at, true)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted dark:text-muted-dark text-xs">Reviewed</dt>
                        <dd className="mt-1">{formatDate(submission.published_at, true)}</dd>
                      </div>
                      <div className="min-w-0 sm:col-span-2 lg:col-span-3">
                        <dt className="text-muted dark:text-muted-dark text-xs">备注</dt>
                        <dd className="mt-1 break-words whitespace-pre-wrap">
                          {display(submission.detail_note || submission.note)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ) : null}
              </article>
            )
          })
        )}
      </div>
    </>
  )
}
