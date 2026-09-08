import clsx from 'clsx'
import { forwardRef } from 'react'
import type { TextareaHTMLAttributes } from 'react'

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={clsx('form-control', className)} {...props} />
))

Textarea.displayName = 'Textarea'
