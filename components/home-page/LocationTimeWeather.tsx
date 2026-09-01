'use client'

import { Cloud, Loader2, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export function LocationTimeWeather({ variant = 'default' }: { variant?: 'default' | 'home' }) {
  const [time, setTime] = useState<Date | null>(null)
  const [weather, setWeather] = useState<{ temp: number; condition: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setTime(new Date())
    // 1. 时间更新
    const timer = setInterval(() => setTime(new Date()), 1000)

    // 2. 获取天气
    async function fetchWeather() {
      try {
        // 调用之前创建的 API 路由
        const res = await fetch('/api/weather')
        if (!res.ok) return
        const data = await res.json()

        if (data.main && data.weather) {
          setWeather({
            temp: Math.round(data.main.temp),
            condition: data.weather[0].main,
          })
        }
      } catch (error) {
        console.error('Weather fetch failed', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchWeather()

    return () => clearInterval(timer)
  }, [])

  const date = time || new Date(0)

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Chicago',
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
      timeZone: 'America/Chicago',
    })
  }

  // 渲染组件容器和内容
  return (
    <div
      className={`relative flex h-full flex-col items-center justify-center rounded-[1.25rem] border p-4 text-center shadow dark:border-gray-600 ${variant === 'home' ? 'home-weather-content' : ''}`}
    >
      <div className="flex flex-col items-center justify-center gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          St. Louis
        </h3>

        <div className="font-sans text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">
          {time ? formatTime(date) : '--:--'}
        </div>

        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{formatDate(date)}</p>

        <div className="my-2 h-px w-16 bg-gray-200 dark:bg-gray-700" />

        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          {weather ? (
            <>
              {weather.condition === 'Clear' ? (
                <Sun className="h-5 w-5 text-amber-500" />
              ) : weather.condition === 'Rain' || weather.condition === 'Drizzle' ? (
                <Cloud className="h-5 w-5 text-blue-400" />
              ) : (
                <Cloud className="h-5 w-5 text-gray-400" />
              )}
              <span className="font-semibold">{weather.temp}°C</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{weather.condition}</span>
            </>
          ) : (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              {isLoading ? 'Loading...' : 'Weather unavailable'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
