'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import type { WorldClockCity } from '~/types/home-widgets'
import {
  BEIJING_TIME_ZONE,
  formatBeijingTime,
  getBeijingTimeAtmosphere,
  getBeijingTimeParts,
  WORLD_CLOCK_ATMOSPHERES,
  type BeijingTimePeriod,
} from './world-clock-atmosphere'
import {
  getOrbitArcPath,
  getOrbitPoint,
  getTimeOfDayHours,
  ORBIT_ATMOSPHERE_SEGMENTS,
  ORBIT_CENTER,
  ORBIT_RADIUS,
  ORBIT_VIEWBOX_SIZE,
} from './world-clock-orbit'
import { formatCityTime, getNextMinuteDelay, getRelativeDayLabel } from '~/utils/world-clock'

type WorldClockWidgetProps = {
  cities: WorldClockCity[]
}

function getBeijingHours(date: Date) {
  const { hour, minute } = getBeijingTimeParts(date)
  return hour + minute / 60
}

export function WorldClockWidget({ cities }: WorldClockWidgetProps) {
  const [now, setNow] = useState<Date | null>(null)
  const [timePeriod, setTimePeriod] = useState<BeijingTimePeriod>('day')
  const atmosphere = WORLD_CLOCK_ATMOSPHERES[timePeriod]
  const primaryCity = cities.find((city) => city.timezone === BEIJING_TIME_ZONE) ?? cities[0]
  const secondaryCity = cities.find((city) => city.id !== primaryCity?.id)
  const primaryPoint = getOrbitPoint(now && primaryCity ? getBeijingHours(now) : 12)
  const secondaryPoint = getOrbitPoint(
    now && secondaryCity ? getTimeOfDayHours(now, secondaryCity.timezone) : 12,
  )
  const atmosphereStyle = {
    '--wc-ambient-primary': atmosphere.ambientPrimary,
    '--wc-ambient-secondary': atmosphere.ambientSecondary,
    '--wc-ambient-position': atmosphere.ambientPosition,
    '--wc-ambient-secondary-position': atmosphere.ambientSecondaryPosition,
    '--wc-ambient-opacity': atmosphere.ambientOpacity,
    '--wc-ambient-spread': atmosphere.ambientSpread,
    '--wc-ambient-secondary-spread': atmosphere.ambientSecondarySpread,
    '--wc-orbit-highlight': atmosphere.ambientPrimary,
    '--wc-marker-primary': atmosphere.ambientPrimary,
    '--wc-marker-secondary': atmosphere.ambientSecondary,
    '--wc-center-glow': atmosphere.ambientPrimary,
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
      <div className="home-world-clock-orbit-shell">
        <svg
          className="home-world-clock-orbit"
          viewBox={`0 0 ${ORBIT_VIEWBOX_SIZE} ${ORBIT_VIEWBOX_SIZE}`}
          aria-hidden="true"
        >
          <circle
            className="home-world-clock-orbit-base"
            cx={ORBIT_CENTER}
            cy={ORBIT_CENTER}
            r={ORBIT_RADIUS}
          />
          {ORBIT_ATMOSPHERE_SEGMENTS.map((segment) => (
            <path
              className="home-world-clock-orbit-segment"
              d={getOrbitArcPath(segment.startHour, segment.endHour)}
              key={segment.id}
              pathLength="24"
              stroke={segment.color}
            />
          ))}
          <circle
            className="home-world-clock-orbit-highlight"
            cx={ORBIT_CENTER}
            cy={ORBIT_CENTER}
            r={ORBIT_RADIUS}
          />
          {primaryCity ? (
            <g className="home-world-clock-marker home-world-clock-marker-primary">
              <circle cx={primaryPoint.x} cy={primaryPoint.y} r="7" />
              <text
                x={primaryPoint.labelX}
                y={primaryPoint.labelY}
                dy={primaryPoint.labelDy}
                textAnchor={primaryPoint.textAnchor}
              >
                {primaryCity.city}
              </text>
            </g>
          ) : null}
          {secondaryCity ? (
            <g className="home-world-clock-marker home-world-clock-marker-secondary">
              <circle cx={secondaryPoint.x} cy={secondaryPoint.y} r="5.5" />
              <text
                x={secondaryPoint.labelX}
                y={secondaryPoint.labelY}
                dy={secondaryPoint.labelDy}
                textAnchor={secondaryPoint.textAnchor}
              >
                {secondaryCity.city}
              </text>
            </g>
          ) : null}
        </svg>
        <div className="home-world-clock-center" aria-hidden="true">
          <time className="home-world-clock-center-time" dateTime={now?.toISOString()}>
            {now ? formatBeijingTime(now) : '--:--'}
          </time>
          <span className="home-world-clock-center-city">{primaryCity?.city ?? '北京'}</span>
        </div>
      </div>
      <div className="sr-only">
        <span>
          {primaryCity?.city ?? '北京'} {now ? formatBeijingTime(now) : '--:--'}
        </span>
        {secondaryCity ? (
          <span>
            {secondaryCity.city} {now ? formatCityTime(now, secondaryCity.timezone) : '--:--'}
            {now && getRelativeDayLabel(now, secondaryCity.timezone) !== '今天'
              ? `，${getRelativeDayLabel(now, secondaryCity.timezone)}`
              : ''}
          </span>
        ) : null}
        <span>北京时间氛围：{atmosphere.label}</span>
      </div>
    </div>
  )
}
