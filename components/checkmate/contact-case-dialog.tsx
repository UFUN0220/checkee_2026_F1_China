'use client'

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useState, type FormEvent } from 'react'
import styles from './checkmate-experience.module.css'

const DEVELOPER_EMAIL = 'fyou@wustl.edu'

export function ContactCaseDialogButton() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const close = () => {
    setOpen(false)
    setError('')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedMessage = message.trim()

    if (!trimmedMessage) {
      setError('请先填写您的问题或修改需求')
      return
    }

    const body = [
      '您好，我想申请修改榜上案例或联系开发者。',
      '',
      trimmedMessage,
      '',
      '（如涉及案例信息修改，我会按需补充相关凭证。）',
    ].join('\n')

    window.location.href = `mailto:${DEVELOPER_EMAIL}?subject=${encodeURIComponent('申请修改榜上案例')}&body=${encodeURIComponent(body)}`
  }

  return (
    <>
      <button type="button" className={styles.contactCaseButton} onClick={() => setOpen(true)}>
        修改/反馈
      </button>

      <Dialog open={open} onClose={close} className={styles.contactDialog}>
        <div className={styles.submitDialogBackdrop} aria-hidden="true" />
        <div className={styles.submitDialogViewport}>
          <DialogPanel className={`${styles.submitDialogPanel} ${styles.contactDialogPanel}`}>
            <div className={styles.submitDialogHeader}>
              <div>
                <DialogTitle className={styles.submitDialogTitle}>申请修改榜上案例</DialogTitle>
                <p>修改信息或联系开发者</p>
              </div>
              <button type="button" className={styles.submitDialogClose} onClick={close}>
                关闭
              </button>
            </div>

            <p className={styles.contactDialogCopy}>
              如果您希望修改榜上展示的信息，或者需要联系开发者，请填写您的说明。
              <br />
              如果涉及案例信息修改，建议提供相关凭证（例如签证状态截图、官方通知、时间证明等），方便核实。
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

              <div className={styles.contactDialogHint}>
                <strong>提示：</strong>
                如果申请修改案例信息，建议同时提供有效凭证，以便确认信息准确性。
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
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}
