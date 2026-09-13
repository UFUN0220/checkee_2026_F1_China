'use client'

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useEffect, useState } from 'react'
import { HallAnnouncementContent } from './hall-announcement-content'
import styles from './checkmate-experience.module.css'

const HALL_WELCOME_VERSION = '20260914-v1'
const HALL_WELCOME_STORAGE_KEY = 'checkee:hall-welcome-version'

export function HallWelcomeDialog({
  caseCount,
  updatedAt,
}: {
  caseCount: number
  updatedAt: string
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let seenVersion: string | null = null
    try {
      seenVersion = window.localStorage.getItem(HALL_WELCOME_STORAGE_KEY)
    } catch {
      // Private browsing or disabled storage should not prevent the Hall from rendering.
    }
    if (seenVersion !== HALL_WELCOME_VERSION) setOpen(true)
  }, [])

  const handleClose = () => {
    try {
      window.localStorage.setItem(HALL_WELCOME_STORAGE_KEY, HALL_WELCOME_VERSION)
    } catch {
      // Private browsing or disabled storage should not prevent the Hall from closing.
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onClose={handleClose} className={styles.submitDialog}>
      <div className={styles.submitDialogBackdrop} aria-hidden="true" />
      <div className={styles.submitDialogViewport}>
        <DialogPanel className={`${styles.submitDialogPanel} ${styles.hallWelcomeDialogPanel}`}>
          <div className={styles.submitDialogHeader}>
            <div>
              <DialogTitle className={styles.submitDialogTitle}>Checkee“名人堂”与统计看板</DialogTitle>
            </div>
            <button type="button" className={styles.submitDialogClose} onClick={handleClose}>
              关闭
            </button>
          </div>

          <HallAnnouncementContent caseCount={caseCount} hallUpdatedAt={updatedAt} />

          <div className={styles.hallWelcomeActions}>
            <button type="button" className={styles.submitPrimaryButton} onClick={handleClose}>
              开始浏览
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
