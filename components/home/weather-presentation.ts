import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { WeatherCondition } from '~/types/home-widgets'

export function getWeatherDisplayCity(city: string) {
  const cityMatch = city.match(/^(.+?市)/)
  return cityMatch?.[1] || city
}

export const WEATHER_CONDITION_ICONS: Record<WeatherCondition, LucideIcon> = {
  thunderstorm: CloudLightning,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  atmosphere: CloudFog,
  clear: Sun,
  clouds: CloudSun,
  unknown: Cloud,
}
