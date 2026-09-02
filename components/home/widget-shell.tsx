import clsx from 'clsx'
import type { CSSProperties, ReactNode } from 'react'
import { desktopWidgets, type DesktopWidgetKey } from './geometry'

type WidgetShellProps = {
  widget: DesktopWidgetKey
  children: ReactNode
  className?: string
  label: string
  layout?: 'desktop' | 'flow'
}

export function WidgetShell({ widget, children, className, label, layout = 'desktop' }: WidgetShellProps) {
  const geometry = desktopWidgets[widget]
  const style = {
    '--widget-width': `${geometry.width}px`,
    '--widget-height': `${geometry.height}px`,
    '--widget-x': `${geometry.x}px`,
    '--widget-y': `${geometry.y}px`,
    '--widget-delay': `${geometry.delay}ms`,
  } as CSSProperties

  if (layout === 'flow') {
    return (
      <section className={clsx('mobile-widget', className)} aria-label={label}>
        {children}
      </section>
    )
  }

  return (
    <div className={clsx('home-widget-positioner', className)} style={style}>
      <section className="home-widget" aria-label={label}>
        {children}
      </section>
    </div>
  )
}
