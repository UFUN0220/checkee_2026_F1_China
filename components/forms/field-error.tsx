'use client'

import clsx from 'clsx'
import { get, useFormContext } from 'react-hook-form'
import type { FieldPath, FieldValues } from 'react-hook-form'

export function FieldError<TFieldValues extends FieldValues>({
  name,
  id,
  className,
}: {
  name: FieldPath<TFieldValues>
  id?: string
  className?: string
}) {
  const {
    formState: { errors },
  } = useFormContext<TFieldValues>()
  const message = get(errors, name)?.message

  if (typeof message !== 'string') return null

  return (
    <p id={id} className={clsx('form-error', className)} role="alert">
      {message}
    </p>
  )
}
