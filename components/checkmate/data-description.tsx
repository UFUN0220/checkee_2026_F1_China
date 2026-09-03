'use client'

import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { Info } from 'lucide-react'
import type { CheckmateDataNotice } from '~/data/checkmate/config'
import styles from './checkmate-experience.module.css'

export function DataDescription({
  notice,
  updatedAt,
}: {
  notice: CheckmateDataNotice
  updatedAt: string
}) {
  return (
    <Popover className={styles.dataNoticePopover}>
      <PopoverButton type="button" className={styles.dataNoticeTrigger} aria-label={notice.title}>
        <Info size={13} strokeWidth={1.8} aria-hidden="true" />
        数据说明
      </PopoverButton>
      <PopoverPanel transition className={styles.dataNoticePanel}>
        <strong>{notice.title}</strong>
        <p>{notice.content}</p>
        <p className={styles.dataNoticeUpdated}>更新时间：{updatedAt}</p>
      </PopoverPanel>
    </Popover>
  )
}
