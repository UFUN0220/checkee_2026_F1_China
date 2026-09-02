'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Link } from '~/components/ui/link'

type CheckNavChild = {
  href: string
  title: string
}

export function CheckNavMenu({
  href,
  title,
  isActive,
  items,
}: {
  href: string
  title: string
  isActive: boolean
  items: CheckNavChild[]
}) {
  const menuRef = useRef<HTMLDivElement | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const scheduleClose = () => {
    clearCloseTimer()
    closeTimerRef.current = setTimeout(() => setOpen(false), 140)
  }

  useEffect(() => {
    return () => clearCloseTimer()
  }, [])

  useEffect(() => {
    if (!open) return

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [open])

  return (
    <div
      ref={menuRef}
      className="check-nav-menu"
      onMouseEnter={() => {
        clearCloseTimer()
        setOpen(true)
      }}
      onMouseLeave={scheduleClose}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false)
      }}
    >
      <Link
        href={href}
        className="-mx-1 px-1 py-1 font-medium sm:translate-x-1"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          clearCloseTimer()
          setOpen(false)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
          }
          if (event.key === 'Escape') setOpen(false)
        }}
      >
        <span className="nav-interactive" data-active={isActive} data-umami-event="nav-about">
          {title}
        </span>
      </Link>
      <div className="check-nav-menu-items" role="menu" hidden={!open}>
        {items.map((child) => (
          <Link
            key={child.href}
            href={child.href}
            role="menuitem"
            className="check-nav-menu-link nav-interactive"
            data-active={child.href === pathname}
            onClick={() => {
              clearCloseTimer()
              setOpen(false)
            }}
          >
            {child.title}
          </Link>
        ))}
      </div>
    </div>
  )
}
