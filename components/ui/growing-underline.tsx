import { clsx } from 'clsx'
import type { CSSProperties, ElementType, ReactNode } from 'react'

export function GrowingUnderline({
  as: Component = 'span',
  children,
  active,
  className,
  duration,
  ...rest
}: {
  children: ReactNode
  as?: ElementType
  active?: boolean
  className?: string
  duration?: number
  [key: string]: unknown
}) {
  return (
    <Component
      className={clsx([
        'bg-gradient-to-r bg-left-bottom bg-no-repeat',
        'transition-[background-size] duration-[var(--duration,300ms)]',
        'from-pink-200 to-pink-100',
        'dark:from-emerald-800 dark:to-emerald-900',
        active
          ? 'bg-[length:100%_50%] hover:bg-[length:100%_100%]'
          : 'bg-[length:0px_50%] hover:bg-[length:100%_50%]',
        className,
      ])}
      style={{ '--duration': `${duration || 300}ms` } as CSSProperties}
      {...rest}
    >
      {children}
    </Component>
  )
}
