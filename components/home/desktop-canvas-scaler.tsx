'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useRef } from 'react'

const CANVAS_WIDTH = 1082
const CANVAS_HEIGHT_TO_BOTTOM = 820
const HORIZONTAL_SAFE_AREA = 32
const VERTICAL_SAFE_AREA = 32
const MIN_DESKTOP_SCALE = 0.8

export function DesktopCanvasScaler({ children }: { children: ReactNode }) {
  const scalerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const scaler = scalerRef.current
    if (!scaler) return

    const updateScale = () => {
      const scaleX = (window.innerWidth - HORIZONTAL_SAFE_AREA) / CANVAS_WIDTH
      const scaleY = (window.innerHeight - VERTICAL_SAFE_AREA) / CANVAS_HEIGHT_TO_BOTTOM
      const scale = Math.max(MIN_DESKTOP_SCALE, Math.min(1, scaleX, scaleY))
      scaler.style.setProperty('--home-scale', String(scale))
    }

    const scheduleScaleUpdate = () => window.requestAnimationFrame(updateScale)

    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(document.documentElement)
    window.addEventListener('resize', scheduleScaleUpdate)
    window.visualViewport?.addEventListener('resize', scheduleScaleUpdate)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', scheduleScaleUpdate)
      window.visualViewport?.removeEventListener('resize', scheduleScaleUpdate)
    }
  }, [])

  return (
    <div
      ref={scalerRef}
      className="desktop-home-canvas-scale"
      style={{ '--home-scale': 1 } as CSSProperties}
    >
      {children}
    </div>
  )
}
