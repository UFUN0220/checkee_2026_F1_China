'use client'

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useState, type FormEvent } from 'react'
import type { CheckmateDataNotice } from '~/data/checkmate/config'
import styles from './checkmate-experience.module.css'

const DEVELOPER_EMAIL = 'fyou@wustl.edu'

export function ContactCaseDialogButton({
  notice,
  updatedAt,
}: {
  notice: CheckmateDataNotice
  updatedAt: string
}) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [supplementalMessage, setSupplementalMessage] = useState('')
  const [error, setError] = useState('')

  const close = () => {
    setOpen(false)
    setError('')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedMessage = message.trim()
    const trimmedSupplementalMessage = supplementalMessage.trim()

    if (!trimmedMessage) {
      setError('请先填写您的问题或修改需求')
      return
    }

    const body = [
      '您好，我想申请修改榜上案例或联系开发者。',
      '',
      trimmedMessage,
      ...(trimmedSupplementalMessage ? ['', '补充说明：', trimmedSupplementalMessage] : []),
      '',
      '（如涉及案例信息修改，我会按需补充相关凭证。）',
    ].join('\n')

    window.location.href = `mailto:${DEVELOPER_EMAIL}?subject=${encodeURIComponent('申请修改榜上案例')}&body=${encodeURIComponent(body)}`
  }

  return (
    <>
      <button
        type="button"
        className={styles.contactCaseButton}
        onClick={() => setOpen(true)}
        aria-expanded={open}
        data-open={open ? 'true' : undefined}
      >
        修改/说明
      </button>

      <Dialog open={open} onClose={close} className={styles.contactDialog}>
        <div className={styles.submitDialogBackdrop} aria-hidden="true" />
        <div className={styles.submitDialogViewport}>
          <DialogPanel className={`${styles.submitDialogPanel} ${styles.contactDialogPanel}`}>
            <div className={styles.submitDialogHeader}>
              <div>
                <DialogTitle className={styles.submitDialogTitle}>修改/说明</DialogTitle>
                <p>数据说明与案例反馈</p>
              </div>
              <button type="button" className={styles.submitDialogClose} onClick={close}>
                关闭
              </button>
            </div>

            <section className={styles.contactDataNotice} aria-labelledby="contact-data-notice-title">
              <h3 id="contact-data-notice-title">数据说明</h3>
              <p>数据来自用户提交案例，经整理后展示，不代表官方处理时间或个人结果。</p>
              <p>{notice.content}</p>
              <dl className={styles.contactDataStatusList}>
                <div className={styles.contactDataStatusItem}>
                  <dt className={styles.contactDataStatusCheck}>Check</dt>
                  <dd>案例正在等待更新。</dd>
                </div>
                <div className={styles.contactDataStatusItem}>
                  <dt className={styles.contactDataStatusApproved}>AP / Approved</dt>
                  <dd>已获得批准结果。</dd>
                </div>
                <div className={styles.contactDataStatusItem}>
                  <dt className={styles.contactDataStatusIssue}>Issue</dt>
                  <dd>已进入签发或完成阶段。</dd>
                </div>
                <div className={styles.contactDataStatusItem}>
                  <dt className={styles.contactDataStatusRefused}>Refused</dt>
                  <dd>拒签案例。</dd>
                </div>
              </dl>
              <p>等待天数沿用当前案例记录，表示面签日期到当前状态日期之间的时间差。</p>
              <p className={styles.contactDataNoticeUpdated}>更新时间：{updatedAt}</p>
            </section>

            <section className={styles.contactFeedbackSection} aria-labelledby="contact-feedback-title">
              <h3 id="contact-feedback-title" className={styles.contactSectionTitle}>
                修改反馈
              </h3>
              <p className={styles.contactDialogCopy}>
                如果您发现榜上案例信息有误，或需要联系开发者，请填写您的说明。
                <br />
                如涉及案例信息修改，建议提供相关凭证（例如签证状态截图、官方通知、时间证明等），方便核实。
              </p>

              <div className={styles.contactDialogEmail}>
                开发者邮箱：{' '}
                <a href={`mailto:${DEVELOPER_EMAIL}`}>{DEVELOPER_EMAIL}</a>
              </div>

              <form className={styles.contactDialogForm} onSubmit={handleSubmit}>
                <label className={styles.submitField}>
                  <span>说明</span>
                  <textarea
                    value={message}
                    placeholder="请输入您的问题、修改需求或想反馈的内容..."
                    rows={6}
                    onChange={(event) => {
                      setMessage(event.target.value)
                      setError('')
                    }}
                  />
                </label>

                <label className={styles.submitField}>
                  <span>补充说明（可选）</span>
                  <textarea
                    value={supplementalMessage}
                    placeholder="可补充更多背景、修改原因或备注信息..."
                    rows={3}
                    onChange={(event) => setSupplementalMessage(event.target.value)}
                  />
                </label>

                <div className={styles.contactDialogHint}>
                  <strong>提示：</strong>
                  如果申请修改案例信息，请尽量提供有效凭证，方便确认信息准确性。
                </div>

                {error ? <p className={styles.submitFormError}>{error}</p> : null}

                <div className={styles.submitFormActions}>
                  <button type="button" className={styles.submitSecondaryButton} onClick={close}>
                    取消
                  </button>
                  <button type="submit" className={styles.submitPrimaryButton}>
                    打开邮件客户端
                  </button>
                </div>
              </form>
            </section>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}
