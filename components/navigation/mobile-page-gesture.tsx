'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

const MOBILE_PAGE_PATHS = ['/about', '/', '/view'] as const
const MOBILE_PAGE_MEDIA_QUERY = '(max-width: 768px)'
const SWIPE_THRESHOLD = 50

type SwipeDirection = 'forward' | 'backward'

function getPageIndex(pathname: string | null) {
  return pathname ? MOBILE_PAGE_PATHS.indexOf(pathname as (typeof MOBILE_PAGE_PATHS)[number]) : -1
}

function isGestureExcludedTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        'a, button, input, textarea, select, dialog, [contenteditable="true"], [role="button"]'
      )
    )
  )
}

export function MobilePageGesture() {
  const pathname = usePathname()
  const router = useRouter()
  const pathnameRef = useRef(pathname)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const previousPathnameRef = useRef(pathname)

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_PAGE_MEDIA_QUERY)

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || isGestureExcludedTarget(event.target)) {
        touchStartRef.current = null
        return
      }

      const touch = event.touches[0]
      touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    }

    const handleTouchEnd = (event: TouchEvent) => {
      const start = touchStartRef.current
      touchStartRef.current = null

      if (!start || event.changedTouches.length !== 1 || !mediaQuery.matches) return

      const touch = event.changedTouches[0]
      const deltaX = touch.clientX - start.x
      const deltaY = touch.clientY - start.y

      if (Math.abs(deltaX) <= SWIPE_THRESHOLD || Math.abs(deltaX) <= Math.abs(deltaY)) return

      const currentIndex = getPageIndex(pathnameRef.current)
      if (currentIndex < 0) return

      const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1
      const nextPath = MOBILE_PAGE_PATHS[nextIndex]
      if (!nextPath) return

      router.push(nextPath)
    }

    const handleTouchCancel = () => {
      touchStartRef.current = null
    }

    const syncListeners = () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchCancel)

      if (!mediaQuery.matches) return

      window.addEventListener('touchstart', handleTouchStart, { passive: true })
      window.addEventListener('touchend', handleTouchEnd, { passive: true })
      window.addEventListener('touchcancel', handleTouchCancel, { passive: true })
    }

    syncListeners()
    mediaQuery.addEventListener('change', syncListeners)

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchCancel)
      mediaQuery.removeEventListener('change', syncListeners)
    }
  }, [router])

  useEffect(() => {
    const previousPathname = previousPathnameRef.current
    previousPathnameRef.current = pathname

    const previousIndex = getPageIndex(previousPathname)
    const currentIndex = getPageIndex(pathname)
    if (previousIndex < 0 || currentIndex < 0 || previousIndex === currentIndex) return
    if (!window.matchMedia(MOBILE_PAGE_MEDIA_QUERY).matches) return

    const direction: SwipeDirection = currentIndex > previousIndex ? 'forward' : 'backward'
    const main = document.querySelector('main')
    if (!main) return

    main.removeAttribute('data-mobile-page-transition')
    void main.offsetWidth
    main.setAttribute('data-mobile-page-transition', direction)

    const cleanupTimer = window.setTimeout(() => {
      main.removeAttribute('data-mobile-page-transition')
    }, 420)

    return () => window.clearTimeout(cleanupTimer)
  }, [pathname])

  return null
}
