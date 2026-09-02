'use client'

import { Cloud, Loader2, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { WeatherSnapshot } from '~/types/home-widgets'
import { getWeatherConditionLabel } from '~/utils/weather'

type WeatherResponse = {
  weather?: WeatherSnapshot
}

const LOCATION_ID = 'st-louis'
const LOCATION_NAME = 'St. Louis'
const LOCATION_TIMEZONE = 'America/Chicago'

export function LocationTimeWeather() {
  const [time, setTime] = useState<Date | null>(null)
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null)

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const updateTime = () => setTime(new Date())
    const timer = window.setInterval(updateTime, 1_000)

    updateTime()

    async function fetchWeather() {
      try {
        const response = await fetch(`/api/weather?locationId=${LOCATION_ID}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`Weather request failed: ${response.status}`)

        const payload = (await response.json()) as WeatherResponse
        if (!active || controller.signal.aborted) return

        const nextWeather = payload.weather
        setWeather(nextWeather && typeof nextWeather.temperature === 'number' ? nextWeather : null)
      } catch {
        if (active && !controller.signal.aborted) setWeather(null)
      }
    }

    fetchWeather()

    return () => {
      active = false
      controller.abort()
      window.clearInterval(timer)
    }
  }, [])

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: LOCATION_TIMEZONE,
    })

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
      timeZone: LOCATION_TIMEZONE,
    })

  const WeatherIcon = weather?.condition === 'clear' ? Sun : Cloud
  const weatherLabel = weather ? getWeatherConditionLabel(weather.condition) : null
  const weatherIconClass =
    weather?.condition === 'clear'
      ? 'h-5 w-5 text-amber-500'
      : weather?.condition === 'rain' || weather?.condition === 'drizzle'
        ? 'h-5 w-5 text-blue-400'
        : 'h-5 w-5 text-gray-400'

  return (
    <div className="relative flex h-full flex-col items-center justify-center rounded-[1.25rem] border p-4 text-center shadow dark:border-gray-600">
      <div className="flex flex-col items-center justify-center gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {LOCATION_NAME}
        </h3>

        <time
          className="font-sans text-4xl font-bold text-gray-900 md:text-5xl dark:text-white"
          dateTime={time?.toISOString()}
        >
          {time ? formatTime(time) : '--:--'}
        </time>

        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{time ? formatDate(time) : '—'}</p>

        <div className="my-2 h-px w-16 bg-gray-200 dark:bg-gray-700" />

        <div className="flex min-h-5 items-center gap-2 text-sm text-gray-700 dark:text-gray-200" aria-live="polite">
          {weather ? (
            <>
              <WeatherIcon
                className={weatherIconClass}
                aria-hidden="true"
              />
              <span className="font-semibold">{Math.round(weather.temperature)}°C</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{weatherLabel}</span>
            </>
          ) : (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              Loading...
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
