export type OrbitPoint = {
  angle: number
  x: number
  y: number
  labelX: number
  labelY: number
  textAnchor: 'start' | 'middle' | 'end'
  labelDy: string
}

export const ORBIT_VIEWBOX_SIZE = 280
export const ORBIT_CENTER = ORBIT_VIEWBOX_SIZE / 2
export const ORBIT_RADIUS = 98

export const ORBIT_ATMOSPHERE_SEGMENTS = [
  { id: 'midnight', startHour: 0, endHour: 5, color: 'rgb(190 204 235 / 0.16)' },
  { id: 'dawn', startHour: 5, endHour: 9, color: 'rgb(239 202 185 / 0.16)' },
  { id: 'day', startHour: 9, endHour: 17, color: 'rgb(185 220 235 / 0.16)' },
  { id: 'sunset', startHour: 17, endHour: 20, color: 'rgb(235 190 193 / 0.18)' },
  { id: 'night', startHour: 20, endHour: 24, color: 'rgb(198 197 229 / 0.16)' },
] as const

function getOrbitAngle(hours: number) {
  return (hours / 24) * 360 - 90
}

export function getTimeOfDayHours(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(date)

  const hour = Number(parts.find((part) => part.type === 'hour')?.value)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value)
  return hour + minute / 60
}

export function getOrbitPoint(hours: number, radius = ORBIT_RADIUS): OrbitPoint {
  const angle = getOrbitAngle(hours)
  const radians = (angle * Math.PI) / 180
  const radialX = Math.cos(radians)
  const radialY = Math.sin(radians)
  const x = ORBIT_CENTER + radius * radialX
  const y = ORBIT_CENTER + radius * radialY
  const labelOffset = 14
  const labelX = x + labelOffset * radialX
  const labelY = y + labelOffset * radialY
  const horizontalThreshold = 0.35
  const verticalThreshold = 0.35

  return {
    angle,
    x,
    y,
    labelX,
    labelY,
    textAnchor:
      Math.abs(radialX) < horizontalThreshold ? 'middle' : radialX > 0 ? 'start' : 'end',
    labelDy:
      Math.abs(radialY) < verticalThreshold ? '0.35em' : radialY > 0 ? '1em' : '-0.35em',
  }
}

export function getOrbitArcPath(startHour: number, endHour: number, radius = ORBIT_RADIUS) {
  const start = getOrbitPoint(startHour, radius)
  const end = getOrbitPoint(endHour, radius)
  const largeArcFlag = endHour - startHour > 12 ? 1 : 0

  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
}
