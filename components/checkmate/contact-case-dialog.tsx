'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import type { CheckmateDataNotice } from '~/data/checkmate/config'
import { FieldError, FormWrapper, SubmitButton } from '~/components/forms'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import {
  updateRequestSchema,
  type UpdateRequestFormValues,
  type UpdateRequestValues,
} from '~/lib/validations/update-request'
import {
  otherFeedbackSchema,
  type OtherFeedbackFormValues,
  type OtherFeedbackValues,
} from '~/lib/validations/other-feedback'
import styles from './checkmate-experience.module.css'

const DEVELOPER_EMAIL = 'fyou@wustl.edu'

type ContactDialogView = 'menu' | 'info' | 'update' | 'other'

export function ContactCaseDialogButton({
  notice,
  updatedAt,
}: {
  notice: CheckmateDataNotice
  updatedAt: string
}) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<ContactDialogView>('menu')
  const [draftPrepared, setDraftPrepared] = useState(false)
  const [error, setError] = useState('')
  const updateForm = useForm<UpdateRequestFormValues, unknown, UpdateRequestValues>({
    resolver: zodResolver(updateRequestSchema),
    defaultValues: {
      content: '',
      email: '',
    },
  })
  const otherForm = useForm<OtherFeedbackFormValues, unknown, OtherFeedbackValues>({
    resolver: zodResolver(otherFeedbackSchema),
    defaultValues: {
      otherMessage: '',
    },
  })

  const reset = () => {
    setView('menu')
    setDraftPrepared(false)
    setError('')
    updateForm.reset()
    otherForm.reset()
  }

  const openDialog = () => {
    reset()
    setOpen(true)
  }

  const close = () => {
    setOpen(false)
    reset()
  }

  const returnToMenu = () => {
    setError('')
    setDraftPrepared(false)
    setView('menu')
  }

  const handleUpdateSubmit = async (values: UpdateRequestValues) => {
    setError('')
    try {
      const response = await fetch('/api/update-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          content: values.content,
          email: values.email,
        }),
      })

      let result: { error?: string } = {}
      try {
        result = (await response.json()) as { error?: string }
      } catch {
        // Keep the generic error below when the response is not JSON.
      }

      if (!response.ok) {
        setError(result.error || '提交失败，请稍后再试。')
        return
      }

      setDraftPrepared(true)
    } catch {
      setError('提交失败，请稍后再试。')
    }
  }

  const handleOtherSubmit = (values: OtherFeedbackValues) => {
    const body = ['您好，我想提交其他反馈。', '', values.otherMessage].join('\n')
    setDraftPrepared(true)
    window.location.href = `mailto:${DEVELOPER_EMAIL}?subject=${encodeURIComponent('Checkee 其他反馈')}&body=${encodeURIComponent(body)}`
  }

  const title = draftPrepared
    ? view === 'update'
      ? '反馈已收到'
      : '邮件草稿已准备好'
    : view === 'menu'
      ? '更新/说明'
      : view === 'info'
        ? '数据说明'
        : view === 'update'
        ? '更新数据'
        : '其他反馈'
  const subtitle = draftPrepared
    ? view === 'update'
      ? '我们会核实相关信息'
      : '请在邮件客户端确认并发送'
    : undefined
  return (
    <>
      <button
        type="button"
        className={styles.contactCaseButton}
        onClick={openDialog}
        aria-expanded={open}
        data-open={open ? 'true' : undefined}
      >
        更新/说明
      </button>

      <Dialog open={open} onClose={close} className={styles.contactDialog}>
        <div className={styles.submitDialogBackdrop} aria-hidden="true" />
        <div className={styles.submitDialogViewport}>
          <DialogPanel className={`${styles.submitDialogPanel} ${styles.contactDialogPanel}`}>
            <div className={styles.submitDialogHeader}>
              <div>
                <DialogTitle className={styles.submitDialogTitle}>{title}</DialogTitle>
                {subtitle ? <p>{subtitle}</p> : null}
              </div>
            </div>

            {view === 'menu' ? (
              <>
                <section
                  className={styles.contactFeedbackSection}
                  aria-labelledby="contact-menu-title"
                >
                  <h3 id="contact-menu-title" className={styles.contactSectionTitle}>
                    选择你要了解或维护的内容
                  </h3>
                  <div className={styles.contactIntentList}>
                    <button
                      type="button"
                      className={styles.contactIntentOption}
                      data-intent="info"
                      onClick={() => setView('info')}
                    >
                      <strong>数据说明</strong>
                      <span>查看数据来源与展示边界</span>
                    </button>
                    <button
                      type="button"
                      className={styles.contactIntentOption}
                      data-intent="update"
                      onClick={() => setView('update')}
                    >
                      <strong>更新数据</strong>
                      <span>修改已有案例中的信息</span>
                    </button>
                    <button
                      type="button"
                      className={styles.contactIntentOption}
                      data-intent="other"
                      onClick={() => setView('other')}
                    >
                      <strong>其他反馈</strong>
                      <span>提交建议或其他说明</span>
                    </button>
                  </div>
                </section>
                <div className={styles.submitFormActions}>
                  <button type="button" className={styles.submitSecondaryButton} onClick={close}>
                    关闭
                  </button>
                </div>
              </>
            ) : view === 'info' ? (
              <>
                <section
                  className={styles.contactDataNotice}
                  aria-labelledby="contact-data-notice-title"
                >
                  <h3 id="contact-data-notice-title">数据说明</h3>
                  <p>{notice.content}</p>
                  <p className={styles.contactDataNoticeUpdated}>更新时间：{updatedAt}</p>
                </section>
                <div className={styles.submitFormActions}>
                  <button
                    type="button"
                    className={styles.submitSecondaryButton}
                    onClick={returnToMenu}
                  >
                    返回
                  </button>
                </div>
              </>
            ) : draftPrepared ? (
              <section className={styles.contactFeedbackSuccess} role="status" aria-live="polite">
                <span aria-hidden="true">✓</span>
                <strong>{view === 'update' ? '反馈已收到' : '感谢你愿意帮助我们完善记录'}</strong>
                <p>
                  {view === 'update'
                    ? '感谢你帮助维护 Checkee 数据。我们会核实相关信息，确认后更新案例。'
                    : '请在邮件客户端确认并发送。我们会检查相关记录，确认后才会更新。'}
                </p>
                {view === 'update' && updateForm.getValues('email')?.trim() ? (
                  <p>如需进一步确认，我们会通过邮箱联系你。</p>
                ) : null}
                <div className={styles.submitFormActions}>
                  <button
                    type="button"
                    className={styles.submitSecondaryButton}
                    onClick={() => setDraftPrepared(false)}
                  >
                    返回
                  </button>
                  <button type="button" className={styles.submitPrimaryButton} onClick={close}>
                    关闭
                  </button>
                </div>
              </section>
            ) : view === 'update' ? (
              <section className={styles.contactFeedbackSection} aria-label="更新数据">
                <FormWrapper
                  form={updateForm}
                  onSubmit={handleUpdateSubmit}
                  className={styles.contactDialogForm}
                  noValidate
                >
                  <p className={styles.contactDialogCopy}>
                    如果你的案例信息发生变化，请告诉我们需要更新的内容。我们会人工核实后进行调整。
                  </p>

                  <Label className={styles.submitField} htmlFor="update-content">
                    <span>更新内容</span>
                    <Textarea
                      id="update-content"
                      placeholder="例如：我的签证状态已经更新为 Issued。建议提供地点、学校、专业或日期，帮助我们定位案例。"
                      rows={7}
                      aria-invalid={Boolean(updateForm.formState.errors.content)}
                      aria-describedby={
                        updateForm.formState.errors.content ? 'update-content-error' : undefined
                      }
                      {...updateForm.register('content', {
                        onChange: () => {
                          setError('')
                        },
                      })}
                    />
                    <FieldError<UpdateRequestFormValues> id="update-content-error" name="content" />
                  </Label>

                  <Label className={styles.submitField} htmlFor="update-email">
                    <span>
                      邮箱 <em>可选</em>
                    </span>
                    <Input
                      id="update-email"
                      type="email"
                      autoComplete="email"
                      placeholder="如需进一步确认，可填写邮箱"
                      aria-invalid={Boolean(updateForm.formState.errors.email)}
                      aria-describedby={
                        updateForm.formState.errors.email ? 'update-email-error' : undefined
                      }
                      {...updateForm.register('email', {
                        onChange: () => {
                          setError('')
                        },
                      })}
                    />
                    <FieldError<UpdateRequestFormValues> id="update-email-error" name="email" />
                  </Label>

                  <p className={styles.contactDialogHint}>
                    如果涉及案例信息修改，建议提供相关凭证以帮助我们确认。敏感信息可以遮挡。
                  </p>

                  {error ? (
                    <p className={styles.submitFormError} role="alert">
                      {error}
                    </p>
                  ) : null}
                  <div className={styles.submitFormActions}>
                    <button
                      type="button"
                      className={styles.submitSecondaryButton}
                      onClick={returnToMenu}
                    >
                      返回
                    </button>
                    <SubmitButton className={styles.submitPrimaryButton} loadingText="正在提交...">
                      提交更新
                    </SubmitButton>
                  </div>
                </FormWrapper>
              </section>
            ) : (
              <section className={styles.contactFeedbackSection}>
                <FormWrapper
                  form={otherForm}
                  onSubmit={handleOtherSubmit}
                  className={styles.contactDialogForm}
                  noValidate
                >
                  <Label className={styles.submitField} htmlFor="other-feedback-content">
                    <span>反馈内容</span>
                    <Textarea
                      id="other-feedback-content"
                      placeholder="请输入你的建议或其他说明…"
                      rows={7}
                      aria-invalid={Boolean(otherForm.formState.errors.otherMessage)}
                      aria-describedby={
                        otherForm.formState.errors.otherMessage
                          ? 'other-feedback-content-error'
                          : undefined
                      }
                      {...otherForm.register('otherMessage', {
                        onChange: () => {
                          setError('')
                        },
                      })}
                    />
                    <FieldError<OtherFeedbackFormValues>
                      id="other-feedback-content-error"
                      name="otherMessage"
                    />
                  </Label>

                  {error ? (
                    <p className={styles.submitFormError} role="alert">
                      {error}
                    </p>
                  ) : null}
                  <div className={styles.submitFormActions}>
                    <button
                      type="button"
                      className={styles.submitSecondaryButton}
                      onClick={returnToMenu}
                    >
                      返回
                    </button>
                    <SubmitButton className={styles.submitPrimaryButton}>提交反馈</SubmitButton>
                  </div>
                </FormWrapper>
              </section>
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}
