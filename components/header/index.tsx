'use client'

import clsx from 'clsx'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { KbarSearchTrigger } from '~/components/search/kbar-trigger'
import { Container } from '~/components/ui/container'
import { Link } from '~/components/ui/link'
import { HEADER_NAV_LINKS } from '~/data/navigation'
import { SITE_METADATA } from '~/data/site-metadata'
import { MoreLinks } from './more-links'
import { Logo } from './logo'
import { MobileNav } from './mobile-nav'
import { CheckNavMenu } from './check-nav-menu'

let logged = false

function logASCIItext() {
  if (logged) return
  console.info('UFUN: personal knowledge base')
  logged = true
}

export function Header() {
  const pathname = usePathname()

  useEffect(logASCIItext, [])

  return (
    <Container
      as="header"
      className={clsx(
        'bg-white/50 px-1 py-1 backdrop-blur dark:bg-dark/50',
        'shadow-sm saturate-100 md:rounded-full',
        'mx-auto max-w-lg md:max-w-md',
        SITE_METADATA.stickyNav && 'sticky top-2 z-50 lg:top-8'
      )}
    >
      <div className="flex items-center justify-center gap-3">
        <div className="flex items-center gap-8">
          <Logo />
          <div className="gap-3 sm:flex">
            {HEADER_NAV_LINKS.map(({ title, href, children }) => {
              const isActive = pathname.startsWith(href)
              return (
                children ? (
                  <CheckNavMenu
                    key={title}
                    href={href}
                    title={title}
                    isActive={isActive}
                    items={children}
                  />
                ) : (
                  <Link key={title} href={href} className="px-1 py-1 font-medium">
                    <span
                      className="nav-interactive"
                      data-active={isActive}
                      data-umami-event={`nav-${href.replace('/', '')}`}
                    >
                      {title}
                    </span>
                  </Link>
                )
              )
            })}
            <MoreLinks />
          </div>
          <div className="hidden h-4 w-px shrink-0 bg-gray-200 md:block dark:bg-gray-600" />
          <div className="flex items-center gap-3">
            <KbarSearchTrigger />
            <MobileNav />
          </div>
        </div>
      </div>
    </Container>
  )
}
