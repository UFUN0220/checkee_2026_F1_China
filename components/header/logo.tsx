import { clsx } from 'clsx'
import NextImage from 'next/image'
import type { MouseEventHandler } from 'react'
import { Link } from '~/components/ui/link'
import { SITE_METADATA } from '~/data/site-metadata'

type LogoProps = {
  className?: string
  onClick?: MouseEventHandler<HTMLAnchorElement>
  'aria-expanded'?: boolean
  'aria-label'?: string
}

export function Logo({
  className,
  onClick,
  'aria-expanded': ariaExpanded,
  'aria-label': ariaLabel,
}: LogoProps) {
  return (
    <Link
      href="/about"
      aria-label={ariaLabel ?? SITE_METADATA.headerTitle}
      aria-expanded={ariaExpanded}
      onClick={onClick}
      className={clsx([
        'rounded-xl p-0.5',
        'ring-1 ring-zinc-900/5 dark:ring-white/10', //环形边框
        'shadow-lg shadow-zinc-800/5',
        className,
      ])}
    >
      <NextImage
        src="/static/images/const/logo.jpg"
        alt={SITE_METADATA.headerTitle}
        width={100}
        height={100}
        sizes="40px"
        className="h-10 w-10 rounded-xl object-cover"
        loading="eager"
      />
    </Link>
  )
}
