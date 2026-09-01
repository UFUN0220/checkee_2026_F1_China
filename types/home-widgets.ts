export type WeatherLocationConfig = {
  id: string
  name: string
  displayName: string
  latitude: number
  longitude: number
  timezone: string
  country?: string
}

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
  condition: string
  conditionCode?: string
  high?: number
  low?: number
  humidity?: number
  windSpeed?: number
  precipitationProbability?: number
  sunrise?: string
  sunset?: string
}
