import clsx from 'clsx'
import type { ElementType, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'default' | 'compact'

export function Button({
  children,
  as: Component = 'button',
  className,
  variant = 'primary',
  size = 'default',
  ...rest
}: {
  children: ReactNode
  as?: ElementType
  className?: string
  variant?: ButtonVariant
  size?: ButtonSize
  [key: string]: unknown
}) {
  return (
    <Component
      className={clsx('form-button', size === 'compact' && 'px-3 py-1.5 text-xs', className)}
      data-size={size}
      data-variant={variant}
      {...rest}
    >
      {children}
    </Component>
  )
}
