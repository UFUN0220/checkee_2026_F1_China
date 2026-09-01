'use client'

import { Cloud, CloudLightning, CloudRain, CloudSnow, Droplets, Sun, Umbrella, Wind } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { WeatherLocationConfig, WeatherSnapshot } from '~/types/home-widgets'

type WeatherResponse = {
  weather?: WeatherSnapshot
}

type WeatherWidgetProps = {
  location: WeatherLocationConfig
}

function getConditionIcon(condition?: string) {
  const normalized = condition?.toLowerCase() || ''
  if (normalized === 'clear') return Sun
  if (normalized.includes('thunder')) return CloudLightning
  if (normalized.includes('snow')) return CloudSnow
  if (normalized.includes('rain') || normalized.includes('drizzle')) return CloudRain
  return Cloud
}

function getConditionLabel(condition?: string) {
  switch (condition?.toLowerCase()) {
    case 'clear':
      return '晴朗'
    case 'clouds':
      return '多云'
    case 'rain':
    case 'drizzle':
      return '有雨'
    case 'snow':
      return '降雪'
    case 'thunderstorm':
      return '雷雨'
    default:
      return condition || '天气暂不可用'
  }
}

function formatDegrees(value?: number) {
  return typeof value === 'number' ? `${Math.round(value)}°` : '—'
}

function formatWindSpeed(value?: number) {
  return typeof value === 'number' ? `${Math.round(value)} km/h` : '—'
}

export function WeatherWidget({ location }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadWeather() {
      setIsLoading(true)
      setHasError(false)

      try {
        const response = await fetch(`/api/weather?locationId=${encodeURIComponent(location.id)}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`Weather request failed: ${response.status}`)

        const payload = (await response.json()) as WeatherResponse
        if (!payload.weather || typeof payload.weather.temperature !== 'number') {
          throw new Error('Weather response is incomplete')
        }
        setWeather(payload.weather)
      } catch {
        if (!controller.signal.aborted) {
          setWeather(null)
          setHasError(true)
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadWeather()
    return () => controller.abort()
  }, [location.id])

  const condition = weather?.condition
  const WeatherIcon = getConditionIcon(condition)
  const details = [
    weather?.humidity !== undefined
      ? { label: '湿度', value: `${Math.round(weather.humidity)}%`, icon: Droplets }
      : null,
    weather?.windSpeed !== undefined
      ? { label: '风速', value: formatWindSpeed(weather.windSpeed), icon: Wind }
      : null,
    weather?.precipitationProbability !== undefined
      ? { label: '降水', value: `${Math.round(weather.precipitationProbability)}%`, icon: Umbrella }
      : null,
    weather?.feelsLike !== undefined
      ? { label: '体感', value: formatDegrees(weather.feelsLike), icon: null }
      : null,
  ].filter((detail): detail is NonNullable<typeof detail> => detail !== null).slice(0, 4)

  return (
    <div className="home-weather-card" data-condition={condition?.toLowerCase()}>
      <div className="home-weather-topline">
        <div className="home-weather-location">
          <span className="home-widget-kicker">天气</span>
          <span className="home-weather-city">{location.displayName}</span>
        </div>
        <WeatherIcon className="home-weather-icon" aria-hidden="true" />
      </div>

      <div className="home-weather-current" aria-live="polite">
        <span className="home-weather-temperature">
          {isLoading ? '--°' : formatDegrees(weather?.temperature)}
        </span>
        <span className="home-weather-condition">
          {hasError ? '天气暂不可用' : getConditionLabel(condition)}
        </span>
      </div>

      <div className="home-weather-range">
        <span>最高 {formatDegrees(weather?.high)}</span>
        <span aria-hidden="true">·</span>
        <span>最低 {formatDegrees(weather?.low)}</span>
      </div>

      {details.length > 0 ? (
        <div className="home-weather-details">
          {details.map(({ label, value, icon: DetailIcon }) => (
            <div className="home-weather-detail" key={label}>
              <span className="home-weather-detail-label">
                {DetailIcon ? <DetailIcon size={12} aria-hidden="true" /> : null}
                {label}
              </span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="home-weather-details home-weather-details-empty" aria-hidden="true">
          <span>{hasError ? '—' : '正在获取天气'}</span>
        </div>
      )}
    </div>
  )
}
