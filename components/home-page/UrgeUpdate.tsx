'use client'

import { Bell, Flame, Heart, Rocket, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

type UrgeStatus = 'loading' | 'idle' | 'press' | 'success' | 'rate-limited' | 'error'

type UrgeResponse = {
  count?: number
  available?: boolean
  accepted?: boolean
  code?: string
  retryAfter?: number
}

function getCopy(userClickCount: number, status: UrgeStatus) {
  if (status === 'loading') return '准备中'
  if (status === 'rate-limited') return '先歇会儿再点吧～'
  if (status === 'error') return '稍后再试'

  switch (userClickCount) {
    case 0:
      return '催更'
    case 1:
      return '在写了(づ｡◕‿‿◕｡)づ'
    case 2:
      return '好啦别点了૮꒰ ˶• ༝ •˶꒱ა'
    case 3:
      return '点也没用૮₍˃⤙˂₎ა'
    default:
      return '那你点吧^⦁⩊⦁^ ੭'
  }
}

function getButtonState(userClickCount: number, status: UrgeStatus) {
  const text = getCopy(userClickCount, status)
  if (status === 'rate-limited' || status === 'error') {
    return {
      text,
      colorClass: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300',
      icon: <Bell className="h-8 w-8" aria-hidden="true" />,
      ping: false,
    }
  }

  switch (userClickCount) {
    case 0:
      return {
        text,
        colorClass:
          'bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40',
        icon: <Bell className="h-8 w-8 group-hover:animate-wiggle" aria-hidden="true" />,
        ping: status === 'idle',
      }
    case 1:
      return {
        text,
        colorClass: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        icon: <Sparkles className="h-8 w-8" aria-hidden="true" />,
        ping: false,
      }
    case 2:
      return {
        text,
        colorClass: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
        icon: <Rocket className="h-8 w-8" aria-hidden="true" />,
        ping: false,
      }
    case 3:
      return {
        text,
        colorClass: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
        icon: <Flame className="h-8 w-8 animate-bounce" aria-hidden="true" />,
        ping: false,
      }
    default:
      return {
        text,
        colorClass:
          'bg-pink-100 text-pink-500 hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:hover:bg-pink-900/50',
        icon: <Heart className="h-8 w-8 animate-pulse fill-current" aria-hidden="true" />,
        ping: false,
      }
  }
}

export function UrgeUpdate({ variant = 'default' }: { variant?: 'default' | 'home' }) {
  const [count, setCount] = useState<number | null>(null)
  const [userClickCount, setUserClickCount] = useState(0)
  const [status, setStatus] = useState<UrgeStatus>('loading')
  const [retryAfter, setRetryAfter] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchCount() {
      try {
        const response = await fetch('/api/urge', { signal: controller.signal })
        const payload = (await response.json()) as UrgeResponse
        if (!response.ok || payload.available === false) throw new Error('Urge count unavailable')
        setCount(typeof payload.count === 'number' ? payload.count : 0)
        setStatus('idle')
      } catch {
        if (!controller.signal.aborted) {
          setCount(null)
          setStatus('error')
        }
      }
    }

    fetchCount()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (retryAfter <= 0) return
    const timer = window.setInterval(() => {
      setRetryAfter((value) => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [retryAfter])

  useEffect(() => {
    if (retryAfter === 0 && status === 'rate-limited') setStatus('idle')
  }, [retryAfter, status])

  async function handleUrge() {
    if (status === 'loading' || status === 'press' || status === 'rate-limited' || count === null) return

    setStatus('press')
    try {
      const response = await fetch('/api/urge', { method: 'POST' })
      const payload = (await response.json()) as UrgeResponse

      if (payload.code === 'RATE_LIMITED') {
        setRetryAfter(payload.retryAfter || 60)
        setStatus('rate-limited')
        if (typeof payload.count === 'number') setCount(payload.count)
        return
      }

      if (!response.ok || payload.accepted !== true || typeof payload.count !== 'number') {
        throw new Error('Urge was not accepted')
      }

      setCount(payload.count)
      setUserClickCount((value) => value + 1)
      setStatus('success')
      window.setTimeout(() => setStatus('idle'), 900)
    } catch {
      setStatus('error')
    }
  }

  const buttonState = getButtonState(userClickCount, status)
  const isDisabled = status === 'loading' || status === 'press' || status === 'rate-limited' || count === null

  return (
    <div
      className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[1.25rem] border p-4 shadow transition-all hover:shadow-md dark:border-gray-600 ${variant === 'home' ? 'home-urge-content' : ''}`}
    >
      <button
        type="button"
        onClick={handleUrge}
        disabled={isDisabled}
        aria-label="催更作者"
        className={`group relative flex h-16 w-16 items-center justify-center rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:opacity-70 ${buttonState.colorClass} ${status === 'press' || status === 'success' ? 'scale-90' : 'hover:scale-110'} ${variant === 'home' ? 'home-urge-button' : ''}`}
      >
        {buttonState.icon}
        {buttonState.ping ? (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-20 duration-1000" />
        ) : null}
      </button>

      <div className="home-urge-copy mt-3 flex flex-col items-center" aria-live="polite">
        <span className="animate-scale-up text-center text-sm font-bold text-gray-800 transition-colors duration-300 dark:text-gray-200">
          {buttonState.text}
        </span>
        <span className="home-urge-count mt-2 text-xs text-gray-400 dark:text-gray-500">
          {status === 'loading' ? '—' : count === null ? '暂时无法读取' : `已有 ${count} 次催更`}
        </span>
      </div>
    </div>
  )
}
