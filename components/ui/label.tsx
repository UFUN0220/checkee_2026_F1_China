import clsx from 'clsx'
import type { LabelHTMLAttributes } from 'react'

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={clsx('form-label', className)} {...props} />
}
