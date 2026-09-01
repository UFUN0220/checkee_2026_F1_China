export const BEIJING_TIME_ZONE = 'Asia/Shanghai'

export type BeijingTimePeriod = 'midnight' | 'dawn' | 'day' | 'sunset' | 'night'

export type BeijingTimeParts = {
  hour: number
  minute: number
}

export type WorldClockAtmosphere = {
  label: string
  ambientPrimary: string
  ambientSecondary: string
  ambientPosition: string
  ambientSecondaryPosition: string
  ambientOpacity: number
  ambientSpread: string
  ambientSecondarySpread: string
}

// Temporary development-only override for visual review. Keep null for real Beijing time.
export const DEBUG_TIME_PERIOD: BeijingTimePeriod | null = null

export const WORLD_CLOCK_ATMOSPHERES: Record<BeijingTimePeriod, WorldClockAtmosphere> = {
  midnight: {
    label: '深夜',
    ambientPrimary: 'rgb(180 195 235 / 0.2)',
    ambientSecondary: 'rgb(211 205 232 / 0.14)',
    ambientPosition: '8% 2%',
    ambientSecondaryPosition: '88% 8%',
    ambientOpacity: 0.78,
    ambientSpread: '42%',
    ambientSecondarySpread: '30%',
  },
  dawn: {
    label: '黎明',
    ambientPrimary: 'rgb(244 197 174 / 0.2)',
    ambientSecondary: 'rgb(189 213 232 / 0.16)',
    ambientPosition: '90% 4%',
    ambientSecondaryPosition: '12% 12%',
    ambientOpacity: 0.8,
    ambientSpread: '44%',
    ambientSecondarySpread: '34%',
  },
  day: {
    label: '白天',
    ambientPrimary: 'rgb(174 215 235 / 0.18)',
    ambientSecondary: 'rgb(213 236 245 / 0.14)',
    ambientPosition: '92% 0%',
    ambientSecondaryPosition: '16% 86%',
    ambientOpacity: 0.76,
    ambientSpread: '40%',
    ambientSecondarySpread: '32%',
  },
  sunset: {
    label: '日落',
    ambientPrimary: 'rgb(244 188 169 / 0.24)',
    ambientSecondary: 'rgb(207 193 224 / 0.18)',
    ambientPosition: '94% 4%',
    ambientSecondaryPosition: '7% 72%',
    ambientOpacity: 0.86,
    ambientSpread: '46%',
    ambientSecondarySpread: '36%',
  },
  night: {
    label: '夜晚',
    ambientPrimary: 'rgb(185 196 233 / 0.22)',
    ambientSecondary: 'rgb(204 194 226 / 0.16)',
    ambientPosition: '88% 2%',
    ambientSecondaryPosition: '14% 82%',
    ambientOpacity: 0.8,
    ambientSpread: '43%',
    ambientSecondarySpread: '34%',
  },
}

export function getBeijingTimeParts(date: Date = new Date()): BeijingTimeParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BEIJING_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(date)

  return {
    hour: Number(parts.find((part) => part.type === 'hour')?.value),
    minute: Number(parts.find((part) => part.type === 'minute')?.value),
  }
}

export function getBeijingTimePeriod(hour: number): BeijingTimePeriod {
  if (hour < 5) return 'midnight'
  if (hour < 9) return 'dawn'
  if (hour < 17) return 'day'
  if (hour < 20) return 'sunset'
  return 'night'
}

export function getBeijingTimeAtmosphere(date: Date = new Date()): BeijingTimePeriod {
  if (process.env.NODE_ENV !== 'production' && DEBUG_TIME_PERIOD) {
    return DEBUG_TIME_PERIOD
  }

  return getBeijingTimePeriod(getBeijingTimeParts(date).hour)
}
