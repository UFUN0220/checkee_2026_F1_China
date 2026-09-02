'use client'

import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react'
import { clearAllBodyScrollLocks, disableBodyScroll, enableBodyScroll } from 'body-scroll-lock'
import { clsx } from 'clsx'
import { Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { Fragment, useEffect, useRef, useState } from 'react'
import { Link } from '~/components/ui/link'
import { Twemoji } from '~/components/ui/twemoji'
import { HEADER_NAV_LINKS, MORE_NAV_LINKS } from '~/data/navigation'
import { SITE_METADATA } from '~/data/site-metadata'
import { Logo } from './logo'
import { ThemeSwitcher } from './theme-switcher'

export function MobileNav() {
  const [navShow, setNavShow] = useState(false)
  const navRef = useRef<HTMLElement | null>(null)
  const pathname = usePathname()

  const openNav = () => {
    if (navRef.current) disableBodyScroll(navRef.current)
    setNavShow(true)
  }

  const closeNav = () => {
    if (navRef.current) enableBodyScroll(navRef.current)
    setNavShow(false)
  }

  useEffect(() => {
    return clearAllBodyScrollLocks
  }, [])

  return (
    <>
      <div
        className="flex items-center justify-center sm:hidden"
        data-umami-event="mobile-nav-toggle"
      >
        <button
          aria-label="Toggle Menu"
          aria-expanded={navShow}
          aria-controls="mobile-navigation"
          onClick={openNav}
          className="nav-interactive h-11 w-11 justify-center p-0"
        >
          <Menu size={22} />
        </button>
      </div>
      <Transition appear show={navShow} as={Fragment} unmount={false}>
        <Dialog as="div" onClose={closeNav} unmount={false}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            unmount={false}
          >
            <div className="fixed inset-0 z-60 bg-black/25" />
          </TransitionChild>
          <TransitionChild
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="translate-x-full opacity-0"
            enterTo="translate-x-0 opacity-95"
            leave="transition ease-in duration-200 transform"
            leaveFrom="translate-x-0 opacity-95"
            leaveTo="translate-x-full opacity-0"
            unmount={false}
          >
            <DialogPanel className="bg-paper/95 dark:bg-paper-dark/98 fixed inset-0 z-70 h-dvh w-full overflow-hidden px-7 backdrop-blur-xl duration-300">
              <div className="flex items-center gap-3 pt-6">
                <Logo />
                <span className="text-muted dark:text-muted-dark text-sm font-semibold">
                  {SITE_METADATA.headerTitle}
                </span>
              </div>
              <nav
                id="mobile-navigation"
                ref={navRef}
                aria-label="Mobile navigation"
                className="mt-12 flex h-[calc(100dvh-7rem)] flex-col items-start gap-7 overflow-y-auto pb-10"
              >
                {[...HEADER_NAV_LINKS, ...MORE_NAV_LINKS].map((link) => (
                  <div key={link.title} className="flex flex-col items-start gap-3">
                    <Link
                      href={link.href}
                      className={clsx(
                        'font-display hover:text-accent dark:hover:text-accent-soft py-1 text-2xl font-bold tracking-wide outline outline-0 transition-colors',
                        pathname === link.href || pathname.startsWith(`${link.href}/`)
                          ? 'text-accent dark:text-accent-soft'
                          : 'text-ink dark:text-cream'
                      )}
                      onClick={closeNav}
                    >
                      <Twemoji emoji={link.emoji} />
                      <span className="ml-2">{link.title}</span>
                    </Link>
                    {link.children ? (
                      <div className="border-line dark:border-line-dark ml-3 flex flex-col gap-2 border-l pl-5">
                        {link.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={clsx(
                              'hover:text-accent dark:hover:text-accent-soft py-1 text-base font-semibold transition-colors',
                              pathname === child.href
                                ? 'text-accent dark:text-accent-soft'
                                : 'text-muted dark:text-muted-dark'
                            )}
                            onClick={closeNav}
                          >
                            {child.title}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
                <div className="mt-5">
                  <ThemeSwitcher />
                </div>
              </nav>
              <button
                className="nav-interactive fixed top-5 right-4 z-80 h-11 w-11 justify-center p-0"
                aria-label="Toggle Menu"
                onClick={closeNav}
              >
                <X className="h-7 w-7" strokeWidth={1.5} />
              </button>
            </DialogPanel>
          </TransitionChild>
        </Dialog>
      </Transition>
    </>
  )
}
