'use client'

import {
  Dialog as HeadlessDialog,
  DialogBackdrop as HeadlessDialogBackdrop,
  DialogDescription as HeadlessDialogDescription,
  DialogPanel as HeadlessDialogPanel,
  DialogTitle as HeadlessDialogTitle,
} from '@headlessui/react'
import clsx from 'clsx'
import type { ReactNode } from 'react'

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <HeadlessDialog open={open} onClose={onOpenChange}>
      {children}
    </HeadlessDialog>
  )
}

export function DialogBackdrop({ className }: { className?: string }) {
  return <HeadlessDialogBackdrop className={clsx('form-dialog-backdrop', className)} />
}

export function DialogContent({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <HeadlessDialogPanel className={clsx('form-dialog-content', className)}>{children}</HeadlessDialogPanel>
}

export function DialogHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('mb-5 space-y-1', className)}>{children}</div>
}

export function DialogTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <HeadlessDialogTitle className={clsx('text-lg font-bold text-[var(--jade-ink)]', className)}>
      {children}
    </HeadlessDialogTitle>
  )
}

export function DialogDescription({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <HeadlessDialogDescription className={clsx('text-sm text-[var(--jade-ink)]/70', className)}>
      {children}
    </HeadlessDialogDescription>
  )
}

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('mt-6 flex items-center justify-end gap-2', className)}>{children}</div>
}
