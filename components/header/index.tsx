'use client'

import clsx from 'clsx'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Container } from '~/components/ui/container'
import { Link } from '~/components/ui/link'
import { HEADER_NAV_LINKS } from '~/data/navigation'
import { SITE_METADATA } from '~/data/site-metadata'
import { Logo } from './logo'
import { MobileNav } from './mobile-nav'

const DESKTOP_IDLE_DELAY = 5_000
const MOBILE_IDLE_DELAY = 5_000

let logged = false

function logASCIItext() {
  if (logged) return
  console.info('UFUN: personal knowledge base')
  logged = true
}

export function Header() {
  const pathname = usePathname()
  const activeHref = HEADER_NAV_LINKS.find(({ href }) => pathname === href)?.href
  const [isNavCollapsed, setIsNavCollapsed] = useState(false)
  const isNavCollapsedRef = useRef(false)
  const isNavHoveredRef = useRef(false)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
  }, [])

  const scheduleIdleCollapse = useCallback(() => {
    clearIdleTimer()

    if (isNavCollapsedRef.current) return

    const idleDelay = window.matchMedia('(max-width: 639px)').matches
      ? MOBILE_IDLE_DELAY
      : DESKTOP_IDLE_DELAY

    idleTimerRef.current = setTimeout(() => {
      isNavCollapsedRef.current = true
      setIsNavCollapsed(true)
      idleTimerRef.current = null
    }, idleDelay)
  }, [clearIdleTimer])

  useEffect(() => {
    scheduleIdleCollapse()

    return () => {
      clearIdleTimer()
    }
  }, [clearIdleTimer, scheduleIdleCollapse])

  const handleNavbarMouseEnter = useCallback(() => {
    isNavHoveredRef.current = true
    clearIdleTimer()
  }, [clearIdleTimer])

  const handleNavbarMouseLeave = useCallback(() => {
    isNavHoveredRef.current = false
    scheduleIdleCollapse()
  }, [scheduleIdleCollapse])

  const handleNavbarInteraction = useCallback(() => {
    if (isNavCollapsedRef.current || isNavHoveredRef.current) return
    scheduleIdleCollapse()
  }, [scheduleIdleCollapse])

  const handleNavbarTouchStart = useCallback(() => {
    if (isNavCollapsedRef.current || isNavHoveredRef.current) return
    scheduleIdleCollapse()
  }, [scheduleIdleCollapse])

  const handleLogoClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (!isNavCollapsedRef.current) return

      event.preventDefault()
      isNavCollapsedRef.current = false
      setIsNavCollapsed(false)
      if (isNavHoveredRef.current) {
        clearIdleTimer()
      } else {
        scheduleIdleCollapse()
      }
    },
    [clearIdleTimer, scheduleIdleCollapse]
  )

  useEffect(logASCIItext, [])

  return (
    <Container
      as="header"
      className={clsx(
        'site-header',
        'dark:bg-dark/50 bg-white/50 px-1 py-1 backdrop-blur sm:!px-1 xl:!px-1',
        'shadow-sm saturate-100 md:rounded-full',
        'mx-auto !w-fit !max-w-[calc(100vw-1rem)]',
        SITE_METADATA.stickyNav && 'sticky top-2 z-50 lg:top-8'
      )}
      data-nav-collapsed={isNavCollapsed}
    >
      <div
        className="flex items-center justify-center"
        onClick={handleNavbarInteraction}
        onMouseEnter={handleNavbarMouseEnter}
        onMouseLeave={handleNavbarMouseLeave}
        onTouchStart={handleNavbarTouchStart}
      >
        <div className="flex w-full items-center justify-between sm:w-auto sm:gap-3">
          <Logo
            className={clsx(
              'mr-1 shrink-0 sm:ml-3',
              pathname === '/about' && 'site-header-logo-active'
            )}
            onClick={handleLogoClick}
            aria-expanded={!isNavCollapsed}
            aria-label={isNavCollapsed ? '展开导航' : undefined}
          />
          <nav
            className="site-header-navigation hidden items-center gap-2 sm:flex"
            aria-label="Primary navigation"
            aria-hidden={isNavCollapsed}
          >
            {HEADER_NAV_LINKS.map(({ title, href }) => (
              <Link
                key={href}
                href={href}
                tabIndex={isNavCollapsed ? -1 : undefined}
                className="px-1 py-1 font-medium sm:translate-x-0 sm:px-0.5"
              >
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
            <MobileNav collapsed={isNavCollapsed} />
          </div>
        </div>
      </div>
    </Container>
  )
}
