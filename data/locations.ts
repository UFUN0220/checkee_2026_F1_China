import type { LocationRecord, WeatherLocationConfig, WorldClockCity } from '~/types/home-widgets'

// Keep location facts in one registry so future admin data only needs to store IDs.
export const locations = {
  'st-louis': {
    id: 'st-louis',
    city: '圣路易斯',
    displayName: 'St. Louis',
    latitude: 38.627,
    longitude: -90.1994,
    timezone: 'America/Chicago',
    country: 'US',
  },
  'qingdao-shinan': {
    id: 'qingdao-shinan',
    city: '青岛市市南区',
    displayName: '青岛市市南区',
    // Shinan District center: 36°04′N, 120°19′E.
    latitude: 36.0667,
    longitude: 120.3167,
    timezone: 'Asia/Shanghai',
    country: 'CN',
  },
  beijing: {
    id: 'beijing',
    city: '北京',
    displayName: 'Beijing',
    latitude: 39.9042,
    longitude: 116.4074,
    timezone: 'Asia/Shanghai',
    country: 'CN',
  },
} satisfies Record<string, LocationRecord>

export type LocationId = keyof typeof locations

export function getLocationById(locationId: string): WeatherLocationConfig | undefined {
  return locations[locationId as LocationId]
}

export function toWorldClockCity(location: WeatherLocationConfig): WorldClockCity {
  return {
    id: location.id,
    city: location.city,
    timezone: location.timezone,
    country: location.country,
  }
}
