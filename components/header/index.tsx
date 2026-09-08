'use client'

import clsx from 'clsx'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { Container } from '~/components/ui/container'
import { Link } from '~/components/ui/link'
import { HEADER_NAV_LINKS } from '~/data/navigation'
import { SITE_METADATA } from '~/data/site-metadata'
import { Logo } from './logo'
import { MobileNav } from './mobile-nav'

let logged = false

function logASCIItext() {
  if (logged) return
  console.info('UFUN: personal knowledge base')
  logged = true
}

export function Header() {
  const pathname = usePathname()
  const activeHref = HEADER_NAV_LINKS.find(({ href }) => pathname === href)?.href

  useEffect(logASCIItext, [])

  return (
    <Container
      as="header"
      className={clsx(
        'site-header',
        'dark:bg-dark/50 bg-white/50 px-1 py-1 sm:!px-1 xl:!px-1 backdrop-blur',
        'shadow-sm saturate-100 md:rounded-full',
        'mx-auto !w-fit !max-w-[calc(100vw-1rem)]',
        SITE_METADATA.stickyNav && 'sticky top-2 z-50 lg:top-8'
      )}
    >
      <div className="flex items-center justify-center">
        <div className="flex w-full items-center justify-between sm:w-auto sm:gap-1">
          <Logo
            className={clsx('shrink-0 sm:ml-4', pathname === '/about' && 'site-header-logo-active')}
          />
          <nav className="hidden items-center gap-2 sm:flex" aria-label="Primary navigation">
            {HEADER_NAV_LINKS.map(({ title, href }) => (
              <Link key={href} href={href} className="px-1 py-1 font-medium sm:px-0.5 sm:translate-x-0">
                <span
                  className="nav-interactive"
                  data-active={href === activeHref}
                  data-umami-event={`nav-${href.replace('/', '')}`}
                >
                  {title}
                </span>
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1 sm:gap-3">
            <MobileNav />
          </div>
        </div>
      </div>
    </Container>
  )
}
