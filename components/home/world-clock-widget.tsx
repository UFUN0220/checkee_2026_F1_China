'use client'

import { useEffect, useState } from 'react'
import type { WorldClockCity } from '~/types/home-widgets'

type WorldClockWidgetProps = {
  cities: WorldClockCity[]
}

type DateParts = {
  year: number
  month: number
  day: number
}

function getDateParts(date: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date)

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
    day: Number(parts.find((part) => part.type === 'day')?.value),
  }
}

function getReferenceDateParts(date: Date): DateParts {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  }
}

function dateNumber(parts: DateParts) {
  return Date.UTC(parts.year, parts.month - 1, parts.day)
}

function getRelativeDayLabel(date: Date, timeZone: string) {
  const difference = Math.round(
    (dateNumber(getDateParts(date, timeZone)) - dateNumber(getReferenceDateParts(date))) /
      86_400_000
  )

  if (difference === 0) return '今天'
  if (difference === 1) return '明天'
  if (difference === -1) return '昨天'

  return new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    month: 'numeric',
    day: 'numeric',
  }).format(date)
}

function formatCityTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).format(date)
}

function formatTimeZoneName(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'short',
  })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value
}

function getNextMinuteDelay() {
  return 60_000 - (Date.now() % 60_000)
}

export function WorldClockWidget({ cities }: WorldClockWidgetProps) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined
    const timeout = setTimeout(() => {
      setNow(new Date())
      interval = setInterval(() => setNow(new Date()), 60_000)
    }, getNextMinuteDelay())

    return () => {
      clearTimeout(timeout)
      if (interval) clearInterval(interval)
    }
  }, [])

  return (
    <div className="home-world-clock-card">
      <div className="home-world-clock-heading">
        <span className="home-widget-kicker">世界时钟</span>
        <span className="home-world-clock-count">{cities.length} 个城市</span>
      </div>
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
