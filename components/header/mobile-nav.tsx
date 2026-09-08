'use client'

import { usePathname } from 'next/navigation'
import { Link } from '~/components/ui/link'
import { HEADER_NAV_LINKS } from '~/data/navigation'

export function MobileNav({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname()
  const activeHref = HEADER_NAV_LINKS.find(({ href }) => pathname === href)?.href

  return (
    <nav className="site-mobile-navigation" aria-label="Primary navigation" aria-hidden={collapsed}>
      {HEADER_NAV_LINKS.map(({ title, href }) => (
        <Link
          key={href}
          href={href}
          tabIndex={collapsed ? -1 : undefined}
          className="mobile-nav-link"
          data-active={href === activeHref}
          data-umami-event={`nav-${href.replace('/', '')}`}
          aria-current={href === activeHref ? 'page' : undefined}
        >
          {title}
        </Link>
      ))}
    </nav>
  )
}
