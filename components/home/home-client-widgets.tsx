'use client'

import { useEffect, useState } from 'react'

function getGreeting(hour: number) {
  if (hour < 5) return '夜深了'
  if (hour < 11) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

function useCurrentDate() {
  const [date, setDate] = useState<Date | null>(null)

  useEffect(() => {
    setDate(new Date())
    const timer = window.setInterval(() => setDate(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  return date
}

export function DailyGreeting() {
  const date = useCurrentDate()
  if (!date) return <span className="home-greeting">晚上好</span>
  return <span className="home-greeting">{getGreeting(date.getHours())}</span>
}

export function CalendarGrid() {
  const date = useCurrentDate()
  const current = date || new Date(0)
  const year = current.getFullYear()
  const month = current.getMonth()
  const day = date?.getDate()
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]

  return (
    <>
      <div className="home-calendar-date">
        <span>{date ? `${year}年${month + 1}月` : '日期加载中'}</span>
        <span>{date ? `星期${['一', '二', '三', '四', '五', '六', '日'][(current.getDay() + 6) % 7]}` : '—'}</span>
      </div>
      <div className="home-calendar-grid">
        {['一', '二', '三', '四', '五', '六', '日'].map((weekday) => (
          <span key={weekday} className="home-calendar-weekday">
            {weekday}
          </span>
        ))}
        {cells.map((cell, index) => (
          <span key={`${cell ?? 'blank'}-${index}`} className={cell === day ? 'is-today' : undefined}>
            {cell}
          </span>
        ))}
      </div>
    </>
  )
}
