'use client'

import { Droplets, MapPin, Thermometer, Wind } from 'lucide-react'
import type { WeatherLocationConfig } from '~/types/home-widgets'
import { getWeatherConditionLabel } from '~/utils/weather'
import { getWeatherDisplayCity, WEATHER_CONDITION_ICONS } from './weather-presentation'
import { useWeatherData } from './weather-data'

type WeatherWidgetProps = {
  location: WeatherLocationConfig
}

export function formatDegrees(value?: number) {
  return typeof value === 'number' ? `${Math.round(value)}°` : '—'
}

export function WeatherWidget({ location }: WeatherWidgetProps) {
  const { weather, isLoading, hasError } = useWeatherData()

  const condition = weather?.condition || 'unknown'
  const WeatherIcon = WEATHER_CONDITION_ICONS[condition]
  const details = [
    weather?.feelsLike !== undefined
      ? { label: '体感', value: formatDegrees(weather.feelsLike), icon: Thermometer }
      : null,
    weather?.humidity !== undefined
      ? { label: '湿度', value: `${Math.round(weather.humidity)}%`, icon: Droplets }
      : null,
    weather?.windSpeed !== undefined
      ? { label: '风速', value: weather.windSpeed.toFixed(1), unit: 'm/s', icon: Wind }
      : null,
    weather?.precipitationProbability !== undefined
      ? { label: '降水', value: `${Math.round(weather.precipitationProbability)}%`, icon: null }
      : null,
  ].filter((detail): detail is NonNullable<typeof detail> => detail !== null).slice(0, 4)

  return (
    <div className="home-weather-card" data-condition={condition}>
      <div className="home-weather-topline">
        <div className="home-weather-location">
          <span className="home-weather-city">
            <MapPin size={13} strokeWidth={2} aria-hidden="true" />
            {getWeatherDisplayCity(location.city || location.displayName)}
          </span>
        </div>
        <div className="home-weather-icon-shell">
          <WeatherIcon className="home-weather-icon" aria-hidden="true" />
        </div>
      </div>

      <div className="home-weather-current" aria-live="polite">
        <div className="home-weather-temperature-wrap">
          <span className="home-weather-temperature">
            {isLoading ? '--' : formatDegrees(weather?.temperature).replace('°', '')}
          </span>
          <span className="home-weather-temperature-unit">°</span>
        </div>
        <div className="home-weather-condition-stack">
          <span className="home-weather-condition">
            {hasError ? '天气暂不可用' : getWeatherConditionLabel(condition)}
          </span>
          {!hasError && !isLoading ? (
            <span className="home-weather-live">
              <span className="home-weather-live-dot" aria-hidden="true" />
              实时
            </span>
          ) : null}
        </div>
      </div>

      {details.length > 0 ? (
        <div className="home-weather-details">
          {details.map(({ label, value, unit, icon: DetailIcon }) => (
            <div className="home-weather-detail" key={label}>
              <span className="home-weather-detail-label">
                {DetailIcon ? <DetailIcon size={12} aria-hidden="true" /> : null}
                {label}
              </span>
              <strong>
                <span>{value}</span>
                {unit ? <small>{unit}</small> : null}
              </strong>
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
