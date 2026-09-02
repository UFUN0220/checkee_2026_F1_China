export type WeatherCondition =
  | 'thunderstorm'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'atmosphere'
  | 'clear'
  | 'clouds'
  | 'unknown'

export type LocationRecord = {
  id: string
  city: string
  displayName: string
  latitude: number
  longitude: number
  timezone: string
  country?: string
}

export type WeatherLocationConfig = LocationRecord

export type WorldClockCity = {
  id: string
  city: string
  timezone: string
  country?: string
}

export type HomepageLiveWidgetsConfig = {
  weatherLocationId: string
  worldClockLocationIds: string[]
}

export type WeatherSnapshot = {
  temperature: number
  feelsLike?: number
  condition: WeatherCondition
  conditionCode?: string
  humidity?: number
  windSpeed?: number
  precipitationProbability?: number
  sunrise?: string
  sunset?: string
}
