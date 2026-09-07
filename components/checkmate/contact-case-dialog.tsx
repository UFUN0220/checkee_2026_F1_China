'use client'

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useState, type FormEvent } from 'react'
import type { CheckmateDataNotice } from '~/data/checkmate/config'
import styles from './checkmate-experience.module.css'

const DEVELOPER_EMAIL = 'fyou@wustl.edu'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u

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
  const [updateMessage, setUpdateMessage] = useState('')
  const [updateEmail, setUpdateEmail] = useState('')
  const [otherMessage, setOtherMessage] = useState('')
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false)

  const reset = () => {
    setView('menu')
    setDraftPrepared(false)
    setError('')
    setUpdateMessage('')
    setUpdateEmail('')
    setOtherMessage('')
    setIsSubmittingUpdate(false)
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (view === 'update') {
      if (isSubmittingUpdate) return

      const trimmedUpdateMessage = updateMessage.trim()
      if (!trimmedUpdateMessage) {
        setError('请说明需要更新的内容')
        return
      }

      const normalizedEmail = updateEmail.trim()
      if (normalizedEmail && !EMAIL_PATTERN.test(normalizedEmail)) {
        setError('请输入有效的邮箱地址')
        return
      }

      setError('')
      setIsSubmittingUpdate(true)
      try {
        const response = await fetch('/api/update-requests', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            content: trimmedUpdateMessage,
            email: normalizedEmail || undefined,
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
      } finally {
        setIsSubmittingUpdate(false)
      }
      return
    }

    const trimmedMessage = otherMessage.trim()
    if (!trimmedMessage) {
      setError('请先填写你的建议或说明')
      return
    }

    const body = ['您好，我想提交其他反馈。', '', trimmedMessage].join('\n')
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
    : view === 'menu'
      ? '了解数据，并帮助维护时间线档案'
      : view === 'info'
        ? '了解数据来源与展示边界'
        : view === 'update'
          ? '修改已有案例中的信息'
          : '提交建议或其他说明'

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
                <p>{subtitle}</p>
              </div>
            </div>

            {view === 'menu' ? (
              <>
                <section className={styles.contactFeedbackSection} aria-labelledby="contact-menu-title">
                  <h3 id="contact-menu-title" className={styles.contactSectionTitle}>选择你要了解或维护的内容</h3>
                  <div className={styles.contactIntentList}>
                    <button
                      type="button"
                      className={styles.contactIntentOption}
                      data-intent="info"
                      onClick={() => setView('info')}
                    >
                      <strong>数据说明</strong>
                      <span>了解数据来源与展示边界</span>
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
                <section className={styles.contactDataNotice} aria-labelledby="contact-data-notice-title">
                  <h3 id="contact-data-notice-title">数据说明</h3>
                  <p>数据来自用户提交案例，经整理后展示，不代表官方处理时间或个人结果。</p>
                  <p>{notice.content}</p>
                  <p className={styles.contactDataNoticeUpdated}>更新时间：{updatedAt}</p>
                </section>
                <div className={styles.submitFormActions}>
                  <button type="button" className={styles.submitSecondaryButton} onClick={returnToMenu}>
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
                {view === 'update' && updateEmail.trim() ? (
                  <p>如需进一步确认，我们会通过邮箱联系你。</p>
                ) : null}
                <div className={styles.submitFormActions}>
                  <button type="button" className={styles.submitSecondaryButton} onClick={() => setDraftPrepared(false)}>
                    返回
                  </button>
                  <button type="button" className={styles.submitPrimaryButton} onClick={close}>
                    关闭
                  </button>
                </div>
              </section>
            ) : view === 'update' ? (
              <section className={styles.contactFeedbackSection} aria-labelledby="update-data-title">
                <form className={styles.contactDialogForm} onSubmit={handleSubmit}>
                  <h3 id="update-data-title" className={styles.contactSectionTitle}>更新内容</h3>
                  <p className={styles.contactDialogCopy}>
                    如果你的案例信息发生变化，请告诉我们需要更新的内容。我们会人工核实后进行调整。
                  </p>

                  <label className={styles.submitField}>
                    <span>更新内容</span>
                    <textarea
                      value={updateMessage}
                      placeholder="例如：我的签证状态已经更新为 Issued。建议提供地点、学校、专业或日期，帮助我们定位案例。"
                      rows={7}
                      onChange={(event) => {
                        setUpdateMessage(event.target.value)
                        setError('')
                      }}
                    />
                  </label>

                  <label className={styles.submitField}>
                    <span>邮箱 <em>可选</em></span>
                    <input
                      type="email"
                      autoComplete="email"
                      value={updateEmail}
                      placeholder="如需进一步确认，可填写邮箱"
                      onChange={(event) => {
                        setUpdateEmail(event.target.value)
                        setError('')
                      }}
                    />
                  </label>

                  <p className={styles.contactDialogHint}>
                    如果涉及案例信息修改，建议提供相关凭证以帮助我们确认。敏感信息可以遮挡。
                  </p>

                  {error ? <p className={styles.submitFormError} role="alert">{error}</p> : null}
                  <div className={styles.submitFormActions}>
                    <button type="button" className={styles.submitSecondaryButton} onClick={returnToMenu}>
                      返回
                    </button>
                    <button type="submit" className={styles.submitPrimaryButton} disabled={isSubmittingUpdate}>
                      {isSubmittingUpdate ? '正在提交...' : '提交更新'}
                    </button>
                  </div>
                </form>
              </section>
            ) : (
              <section className={styles.contactFeedbackSection} aria-labelledby="other-feedback-title">
                <form className={styles.contactDialogForm} onSubmit={handleSubmit}>
                  <h3 id="other-feedback-title" className={styles.contactSectionTitle}>反馈内容</h3>
                  <label className={styles.submitField}>
                    <span>反馈内容</span>
                    <textarea
                      value={otherMessage}
                      placeholder="请输入你的建议或其他说明…"
                      rows={7}
                      onChange={(event) => {
                        setOtherMessage(event.target.value)
                        setError('')
                      }}
                    />
                  </label>

                  {error ? <p className={styles.submitFormError} role="alert">{error}</p> : null}
                  <div className={styles.submitFormActions}>
                    <button type="button" className={styles.submitSecondaryButton} onClick={returnToMenu}>
                      返回
                    </button>
                    <button type="submit" className={styles.submitPrimaryButton}>
                      提交反馈
                    </button>
                  </div>
                </form>
              </section>
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}
