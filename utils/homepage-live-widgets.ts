import { homepageConfig } from '~/data/homepage'
import { getLocationById, toWorldClockCity } from '~/data/locations'
import type { HomepageLiveWidgetsConfig, WeatherLocationConfig, WorldClockCity } from '~/types/home-widgets'

export function getHomepageLiveWidgetsConfig(): HomepageLiveWidgetsConfig {
  return {
    weatherLocationId: homepageConfig.liveWidgets.weatherLocationId,
    worldClockLocationIds: [...homepageConfig.liveWidgets.worldClockLocationIds],
  }
}

export function getHomepageWeatherLocation(): WeatherLocationConfig {
  const location = getLocationById(homepageConfig.liveWidgets.weatherLocationId)
  if (!location) {
    throw new Error(`Unknown homepage weather location: ${homepageConfig.liveWidgets.weatherLocationId}`)
  }

  return location
}

export function getHomepageWorldClockCities(): WorldClockCity[] {
  return homepageConfig.liveWidgets.worldClockLocationIds.flatMap((locationId) => {
    const location = getLocationById(locationId)
    return location ? [toWorldClockCity(location)] : []
  })
}
