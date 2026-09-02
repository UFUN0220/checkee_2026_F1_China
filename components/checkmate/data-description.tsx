'use client'

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { Info, X } from 'lucide-react'
import { useState } from 'react'
import type { CheckmateDataNotice } from '~/data/checkmate/config'
import styles from './checkmate-experience.module.css'

export function DataDescription({
  notice,
  updatedAt,
}: {
  notice: CheckmateDataNotice
  updatedAt: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className={styles.dataNoticeTrigger}
        aria-label={notice.title}
        onClick={() => setOpen(true)}
      >
        <Info size={13} strokeWidth={1.8} aria-hidden="true" />
        数据说明
      </button>
      <Dialog open={open} onClose={setOpen} className={styles.dataNoticeDialog}>
        <div className={styles.dataNoticeBackdrop} aria-hidden="true" />
        <div className={styles.dataNoticePositioner}>
          <DialogPanel className={styles.dataNoticePanel}>
            <div className={styles.dataNoticeHeading}>
              <DialogTitle>{notice.title}</DialogTitle>
              <button
                type="button"
                className={styles.dataNoticeClose}
                aria-label="关闭数据说明"
                onClick={() => setOpen(false)}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <p>{notice.content}</p>
            <p className={styles.dataNoticeUpdated}>更新时间：{updatedAt}</p>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}
