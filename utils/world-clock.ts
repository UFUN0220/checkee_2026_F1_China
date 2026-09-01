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

export function getRelativeDayLabel(date: Date, timeZone: string) {
  const target = getDateParts(date, timeZone)
  const reference = getReferenceDateParts(date)
  const difference = (dateNumber(target) - dateNumber(reference)) / 86_400_000

  if (difference === 0) return '今天'
  if (difference === 1) return '明天'
  if (difference === -1) return '昨天'
  if (target.year !== reference.year) return `${target.year}年${target.month}月${target.day}日`

  return `${target.month}月${target.day}日`
}

export function formatCityTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).format(date)
}

export function formatTimeZoneName(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'short',
  })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value
}

export function getNextMinuteDelay() {
  return 60_000 - (Date.now() % 60_000)
}
