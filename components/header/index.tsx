'use client'

import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { KbarSearchTrigger } from '~/components/search/kbar-trigger'
import { PinkHover } from '~/components/ui/PinkHover'
import { Link } from '~/components/ui/link'
import { HEADER_NAV_LINKS } from '~/data/navigation'
import { SITE_METADATA } from '~/data/site-metadata'
import { Logo } from './logo'
import { MobileNav } from './mobile-nav'
import { MoreLinks } from './more-links'

let logged = false
function logASCIItext() {
  if (logged) return
  console.info(
    " ___                  __                              __              __                    \r\n/\\_ \\                /\\ \\                            /\\ \\            /\\ \\                   \r\n\\//\\ \\      __    ___\\ \\ \\___   __  __  __  __    ___\\ \\ \\___        \\_\\ \\     __   __  __  \r\n  \\ \\ \\   /'__`\\ / __`\\ \\  _ `\\/\\ \\/\\ \\/\\ \\/\\ \\ /' _ `\\ \\  _ `\\      /'_` \\  /'__`\\/\\ \\/\\ \\ \r\n   \\_\\ \\_/\\  __//\\ \\L\\ \\ \\ \\ \\ \\ \\ \\_\\ \\ \\ \\_\\ \\/\\ \\/\\ \\ \\ \\ \\ \\  __/\\ \\L\\ \\/\\  __/\\ \\ \\_/ |\r\n   /\\____\\ \\____\\ \\____/\\ \\_\\ \\_\\ \\____/\\/`____ \\ \\_\\ \\_\\ \\_\\ \\_\\/\\_\\ \\___,_\\ \\____\\\\ \\___/ \r\n   \\/____/\\/____/\\/___/  \\/_/\\/_/\\/___/  `/___/> \\/_/\\/_/\\/_/\\/_/\\/_/\\/__,_ /\\/____/ \\/__/  \r\n                                            /\\___/                                          \r\n                                            \\/__/                                           "
  )
  console.log('🧑‍💻 View source:', SITE_METADATA.siteRepo)
  // console.log(`🙌 Let's connect:`, SITE_METADATA.x)
  logged = true
}

export function Header() {
  const pathname = usePathname()
  const isHomepage = pathname === '/'
  const [expanded, setExpanded] = useState(isHomepage)

  useEffect(logASCIItext, [])

  useEffect(() => setExpanded(isHomepage), [isHomepage])

  return (
    <motion.header
      layout
      initial={false}
      animate={expanded || isHomepage ? 'expanded' : 'collapsed'}
      variants={{
        expanded: { borderRadius: 24 },
        collapsed: { borderRadius: 18 },
      }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      className={clsx(
        isHomepage
          ? 'fixed left-2 right-2 top-3 z-[100] mx-auto max-w-lg bg-transparent shadow-none backdrop-blur-none'
          : expanded
            ? 'fixed left-3 top-3 w-[min(32rem,calc(100vw-1.5rem))] bg-white/65 p-1 shadow-lg shadow-zinc-800/5 backdrop-blur-xl dark:bg-dark/65'
            : 'fixed left-3 top-3 h-12 w-12 bg-white/65 p-1 shadow-lg shadow-zinc-800/5 backdrop-blur-xl dark:bg-dark/65',
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {expanded || isHomepage ? (
          <motion.div
            key="expanded-nav"
            layout
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className={clsx(
              'flex items-center justify-center gap-2 px-1 py-1',
              isHomepage &&
                'rounded-full border border-white/70 bg-white/60 shadow-lg shadow-zinc-800/5 backdrop-blur-xl dark:bg-dark/60'
            )}
          >
            <Logo className="shrink-0" />
            <nav className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              {HEADER_NAV_LINKS.map(({ title, href }) => {
                const isActive = pathname.startsWith(href)
                return (
                  <Link key={title} href={href} className="px-1 py-1 text-sm font-medium">
                    <PinkHover
                      className={clsx(isActive && 'bg-[length:100%_50%]')}
                      data-umami-event={`nav-${href.replace('/', '')}`}
                    >
                      {title}
                    </PinkHover>
                  </Link>
                )
              })}
              <MoreLinks />
            </nav>
            <div
              data-orientation="vertical"
              role="separator"
              className="h-4 w-px shrink-0 bg-gray-200 dark:bg-gray-600"
            />
            <div className="flex shrink-0 items-center gap-1">
              <KbarSearchTrigger />
              <MobileNav />
              {!isHomepage && (
                <button
                  type="button"
                  aria-label="Collapse navigation"
                  className="rounded p-1.5 text-gray-500 transition hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
                  onClick={() => setExpanded(false)}
                >
                  <X size={17} strokeWidth={1.7} />
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="collapsed-nav"
            layout
            type="button"
            aria-label="Expand navigation"
            aria-expanded={expanded}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            className="grid h-10 w-10 place-items-center rounded-xl p-0.5"
            onClick={() => setExpanded(true)}
          >
            <img
              src="/static/images/const/logo.jpg"
              alt={SITE_METADATA.headerTitle}
              className="h-9 w-9 rounded-xl object-cover"
            />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
