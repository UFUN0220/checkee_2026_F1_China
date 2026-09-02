'use client'

import { Loader2, MapPin } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { WorldClockCity } from '~/types/home-widgets'
import type { WeatherSnapshot } from '~/types/home-widgets'
import { getWeatherConditionLabel } from '~/utils/weather'
import { WEATHER_CONDITION_ICONS } from './weather-presentation'

type WorldClockWidgetProps = {
  cities: WorldClockCity[]
}

type WeatherResponse = {
  weather?: WeatherSnapshot
}

export function WorldClockWidget({ cities }: WorldClockWidgetProps) {
  const [now, setNow] = useState<Date | null>(null)
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // The original BENTO weather clock presents one local clock. Prefer St. Louis,
  // which is the city used by the source component, while retaining a safe fallback.
  const city = useMemo(() => cities.find((item) => item.id === 'st-louis') || cities[0], [cities])

  useEffect(() => {
    setNow(new Date())
    const timer = setInterval(() => setNow(new Date()), 1_000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!city) {
      setWeather(null)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()

    async function loadWeather() {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/weather?locationId=${encodeURIComponent(city.id)}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`Weather request failed: ${response.status}`)

        const payload = (await response.json()) as WeatherResponse
        setWeather(payload.weather && typeof payload.weather.temperature === 'number' ? payload.weather : null)
      } catch {
        if (!controller.signal.aborted) setWeather(null)
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadWeather()
    return () => controller.abort()
  }, [city])

  const WeatherIcon = WEATHER_CONDITION_ICONS[weather?.condition || 'unknown']
  const timeText = now
    ? now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: city?.timezone,
      })
    : '--:--'
  const dateText = now
    ? now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        weekday: 'short',
        timeZone: city?.timezone,
      })
    : '—'

  return (
    <div className="home-weather-clock-card" data-weather-condition={weather?.condition || 'unknown'}>
      <div className="home-weather-clock-content">
        <div className="home-weather-clock-city">
          <MapPin size={13} strokeWidth={2} aria-hidden="true" />
          <span>{city?.city || '—'}</span>
        </div>

        <time className="home-weather-clock-time" dateTime={now?.toISOString()}>
          {timeText}
        </time>

        <p className="home-weather-clock-date">{dateText}</p>

        <div className="home-weather-clock-divider" aria-hidden="true" />

        <div className="home-weather-clock-weather" aria-live="polite">
          {isLoading ? (
            <span className="home-weather-clock-loading">
              <Loader2 size={13} className="home-weather-clock-spinner" aria-hidden="true" />
              Loading...
            </span>
          ) : weather ? (
            <>
              <WeatherIcon className="home-weather-clock-icon" aria-hidden="true" />
              <strong>{Math.round(weather.temperature)}°C</strong>
              <span>{getWeatherConditionLabel(weather.condition)}</span>
            </>
          ) : (
            <span className="home-weather-clock-loading">天气暂不可用</span>
          )}
        </div>
      </div>
    </div>
  )
}
