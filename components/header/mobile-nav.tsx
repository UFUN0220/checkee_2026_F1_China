'use client'

import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react'
import { clearAllBodyScrollLocks, disableBodyScroll, enableBodyScroll } from 'body-scroll-lock'
import { clsx } from 'clsx'
import { Menu, X } from 'lucide-react'
import { Fragment, useEffect, useRef, useState } from 'react'
import { Link } from '~/components/ui/link'
import { Twemoji } from '~/components/ui/twemoji'
import { HEADER_NAV_LINKS, MORE_NAV_LINKS } from '~/data/navigation'
import { SITE_METADATA } from '~/data/site-metadata'
import { Logo } from './logo'
import { ThemeSwitcher } from './theme-switcher'

export function MobileNav() {
  const [navShow, setNavShow] = useState(false)
  const navRef = useRef<HTMLDivElement | null>(null)

  const onToggleNav = () => {
    setNavShow((status) => {
      if (status) {
        if (navRef.current) enableBodyScroll(navRef.current)
      } else {
        // Prevent scrolling
        if (navRef.current) disableBodyScroll(navRef.current)
      }
      return !status
    })
  }

  useEffect(() => {
    return clearAllBodyScrollLocks
  })

  return (
    <>
      <div
        className={clsx([
          'rounded p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700',
          'flex items-center justify-center hidden sm:hidden',
        ])}
        data-umami-event="mobile-nav-toggle"
      >
        <button
          aria-label="Toggle Menu"
          onClick={onToggleNav}
          className="flex h-11 w-11 items-center justify-center"
        >
          <Menu size={22} />
        </button>
      </div>
      <Transition appear show={navShow} as={Fragment} unmount={false}>
        <Dialog as="div" onClose={onToggleNav} unmount={false}>
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
            <DialogPanel className="bg-paper dark:bg-paper-dark fixed inset-0 z-70 h-full w-full px-6 duration-300 sm:px-10">
              <div className="flex items-center gap-3 pt-7">
                <Logo />
                <span className="text-muted dark:text-muted-dark text-sm font-semibold">
                  {SITE_METADATA.headerTitle}
                </span>
              </div>
              <nav
                ref={navRef}
                className="mt-16 flex h-full basis-0 flex-col items-start gap-6 overflow-y-auto pt-2"
              >
                {[...HEADER_NAV_LINKS, ...MORE_NAV_LINKS].map((link) => (
                  <div key={link.title} className="flex flex-col items-start gap-3">
                    <Link
                      href={link.href}
                      className="font-display text-ink hover:text-accent dark:text-cream dark:hover:text-accent-soft py-1 text-4xl tracking-[-0.04em] outline outline-0"
                      onClick={onToggleNav}
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
                            className="text-muted hover:text-accent dark:text-muted-dark dark:hover:text-accent-soft py-1 text-lg font-semibold"
                            onClick={onToggleNav}
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
                className="text-ink hover:text-accent dark:text-cream dark:hover:text-accent-soft fixed top-5 right-4 z-80 h-12 w-12 p-3"
                aria-label="Toggle Menu"
                onClick={onToggleNav}
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
