import clsx from 'clsx'
import { forwardRef } from 'react'
import type { SelectHTMLAttributes } from 'react'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={clsx('form-control', className)} {...props} />
  )
)

Select.displayName = 'Select'
