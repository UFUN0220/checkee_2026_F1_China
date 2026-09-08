'use client'

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useEffect, useState } from 'react'
import styles from './checkmate-experience.module.css'

const HALL_WELCOME_STORAGE_KEY = 'checkee:hall-welcome-seen'

export function HallWelcomeDialog({
  caseCount,
  updatedAt,
}: {
  caseCount: number
  updatedAt: string
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (window.localStorage.getItem(HALL_WELCOME_STORAGE_KEY) === 'true') return
      window.localStorage.setItem(HALL_WELCOME_STORAGE_KEY, 'true')
    } catch {
      // Private browsing or disabled storage should not prevent the Hall from rendering.
    }
    setOpen(true)
  }, [])

  return (
    <Dialog open={open} onClose={setOpen} className={styles.submitDialog}>
      <div className={styles.submitDialogBackdrop} aria-hidden="true" />
      <div className={styles.submitDialogViewport}>
        <DialogPanel className={`${styles.submitDialogPanel} ${styles.hallWelcomeDialogPanel}`}>
          <div className={styles.submitDialogHeader}>
            <div>
              <DialogTitle className={styles.submitDialogTitle}>Checkee 名人堂</DialogTitle>
              <p>首次访问说明</p>
            </div>
            <button type="button" className={styles.submitDialogClose} onClick={() => setOpen(false)}>
              关闭
            </button>
          </div>

          <div className={styles.hallWelcomeIntro}>
            <p>收录42天（6周）以上 F-1 案例。</p>
            <p>帮助大家观察真实样本，不代表官方处理时间预测或个人结果。</p>
          </div>

          <div className={styles.hallWelcomeStats} aria-label="名人堂数据概览">
            <div>
              <span>当前案例</span>
              <strong>{caseCount}</strong>
            </div>
            <div>
              <span>数据更新时间</span>
              <strong>{updatedAt}</strong>
            </div>
          </div>

          <section className={styles.hallWelcomeGuide} aria-labelledby="hall-welcome-guide-title">
            <h2 id="hall-welcome-guide-title">你可以</h2>
            <ul>
              <li>
                <strong>查看案例</strong>
                <span>浏览不同地点、学位与等待时长的真实记录。</span>
              </li>
              <li>
                <strong>提交案例</strong>
                <span>分享你的时间线，帮助后来的人了解情况。</span>
              </li>
              <li>
                <strong>修改/说明</strong>
                <span>发现错误或遗漏时，欢迎反馈给我们。</span>
              </li>
            </ul>
          </section>

          <div className={styles.hallWelcomeActions}>
            <button type="button" className={styles.submitPrimaryButton} onClick={() => setOpen(false)}>
              开始浏览
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
