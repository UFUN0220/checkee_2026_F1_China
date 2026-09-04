'use client'

import { usePathname } from 'next/navigation'
import { Link } from '~/components/ui/link'
import { HEADER_NAV_LINKS } from '~/data/navigation'

const MOBILE_NAV_TITLES: Record<string, string> = {
  '/': '名人堂',
  '/view': '白宫严选',
}

export function MobileNav() {
  const pathname = usePathname()
  const activeHref = HEADER_NAV_LINKS.find(({ href }) => pathname === href)?.href

  return (
    <nav className="site-mobile-navigation" aria-label="Primary navigation">
      {HEADER_NAV_LINKS.map(({ title, href }) => (
        <Link
          key={href}
          href={href}
          className="mobile-nav-link"
          data-active={href === activeHref}
          data-umami-event={`nav-${href.replace('/', '')}`}
          aria-current={href === activeHref ? 'page' : undefined}
        >
          {MOBILE_NAV_TITLES[href] ?? title}
        </Link>
      ))}
    </nav>
  )
}
