'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import type { WorldClockCity } from '~/types/home-widgets'
import {
  getBeijingTimeAtmosphere,
  WORLD_CLOCK_ATMOSPHERES,
  type BeijingTimePeriod,
} from './world-clock-atmosphere'
import { formatCityTime, formatTimeZoneName, getNextMinuteDelay, getRelativeDayLabel } from '~/utils/world-clock'

type WorldClockWidgetProps = {
  cities: WorldClockCity[]
}

export function WorldClockWidget({ cities }: WorldClockWidgetProps) {
  const [now, setNow] = useState<Date | null>(null)
  const [timePeriod, setTimePeriod] = useState<BeijingTimePeriod>('day')
  const atmosphere = WORLD_CLOCK_ATMOSPHERES[timePeriod]
  const atmosphereStyle = {
    '--wc-ambient-primary': atmosphere.ambientPrimary,
    '--wc-ambient-secondary': atmosphere.ambientSecondary,
    '--wc-ambient-position': atmosphere.ambientPosition,
    '--wc-ambient-secondary-position': atmosphere.ambientSecondaryPosition,
    '--wc-ambient-opacity': atmosphere.ambientOpacity,
    '--wc-ambient-spread': atmosphere.ambientSpread,
    '--wc-ambient-secondary-spread': atmosphere.ambientSecondarySpread,
  } as CSSProperties

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined
    const updateClock = () => {
      const nextNow = new Date()
      setNow(nextNow)
      setTimePeriod((currentPeriod) => {
        const nextPeriod = getBeijingTimeAtmosphere(nextNow)
        return currentPeriod === nextPeriod ? currentPeriod : nextPeriod
      })
    }

    updateClock()
    const timeout = setTimeout(() => {
      updateClock()
      interval = setInterval(updateClock, 60_000)
    }, getNextMinuteDelay())

    return () => {
      clearTimeout(timeout)
      if (interval) clearInterval(interval)
    }
  }, [])

  return (
    <div className="home-world-clock-card" data-time-period={timePeriod} style={atmosphereStyle}>
      <div className="home-world-clock-atmosphere" aria-hidden="true" />
      <span className="sr-only">
        北京时间氛围：{WORLD_CLOCK_ATMOSPHERES[timePeriod].label}
      </span>
      <div className="home-world-clock-rows">
        {cities.map((city) => (
          <div className="home-world-clock-row" key={city.id}>
            <div className="home-world-clock-city">
              <span>{city.city}</span>
              <span className="home-world-clock-meta">
                {now ? getRelativeDayLabel(now, city.timezone) : '—'}
                <span aria-hidden="true"> · </span>
                {now ? formatTimeZoneName(now, city.timezone) : '—'}
              </span>
            </div>
            <time className="home-world-clock-time" dateTime={now?.toISOString()}>
              {now ? formatCityTime(now, city.timezone) : '--:--'}
            </time>
          </div>
        ))}
      </div>
    </div>
  )
}
