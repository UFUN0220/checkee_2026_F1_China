'use client'

import type { ReactNode } from 'react'
import { useFormContext, type FieldValues } from 'react-hook-form'

import { Button, type ButtonSize, type ButtonVariant } from '~/components/ui/button'

export function SubmitButton({
  children,
  loadingText = '提交中…',
  disabled,
  className,
  variant = 'primary',
  size = 'default',
  ...props
}: {
  children: ReactNode
  loadingText?: ReactNode
  disabled?: boolean
  className?: string
  variant?: ButtonVariant
  size?: ButtonSize
  [key: string]: unknown
}) {
  const {
    formState: { isSubmitting },
  } = useFormContext<FieldValues>()

  return (
    <Button
      {...props}
      type="submit"
      disabled={disabled || isSubmitting}
      className={className}
      variant={variant}
      size={size}
      data-loading={isSubmitting ? 'true' : undefined}
      aria-busy={isSubmitting}
    >
      {isSubmitting ? loadingText : children}
    </Button>
  )
}
