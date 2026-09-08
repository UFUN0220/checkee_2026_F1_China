import clsx from 'clsx'
import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={clsx('form-control', className)} {...props} />
  )
)

Input.displayName = 'Input'
