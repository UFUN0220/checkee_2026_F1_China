import type { WeatherCondition, WeatherSnapshot } from '~/types/home-widgets'

export type WeatherProvider = 'qweather' | 'openweather'

export type OpenWeatherPayload = {
  cod?: number | string
  message?: string
  main?: {
    temp?: number
    feels_like?: number
    humidity?: number
  }
  weather?: Array<{
    id?: number
    main?: string
  }>
  wind?: {
    speed?: number
  }
}

export type QWeatherPayload = {
  code?: string
  message?: string
  condition?: {
    text?: string
    code?: string | number
  }
  temperature?: {
    value?: number
  }
  feelsLike?: {
    value?: number
  }
  humidity?: number
  wind?: {
    speed?: {
      value?: number
    }
  }
}

function mapProviderGroup(group?: string): WeatherCondition {
  switch (group?.toLowerCase()) {
    case 'thunderstorm':
      return 'thunderstorm'
    case 'drizzle':
      return 'drizzle'
    case 'rain':
      return 'rain'
    case 'snow':
      return 'snow'
    case 'atmosphere':
      return 'atmosphere'
    case 'clear':
      return 'clear'
    case 'clouds':
      return 'clouds'
    default:
      return 'unknown'
  }
}

export function mapOpenWeatherCondition(id?: number, providerGroup?: string): WeatherCondition {
  if (typeof id === 'number') {
    if (id >= 200 && id <= 232) return 'thunderstorm'
    if (id >= 300 && id <= 321) return 'drizzle'
    if (id >= 500 && id <= 531) return 'rain'
    if (id >= 600 && id <= 622) return 'snow'
    if (id >= 701 && id <= 781) return 'atmosphere'
    if (id === 800) return 'clear'
    if (id >= 801 && id <= 804) return 'clouds'
  }

  return mapProviderGroup(providerGroup)
}

export function mapOpenWeatherResponse(payload: OpenWeatherPayload): WeatherSnapshot | null {
  const providerWeather = payload.weather?.[0]
  if (typeof payload.main?.temp !== 'number' || typeof providerWeather?.main !== 'string') {
    return null
  }

  return {
    temperature: payload.main.temp,
    feelsLike: typeof payload.main.feels_like === 'number' ? payload.main.feels_like : undefined,
    condition: mapOpenWeatherCondition(providerWeather.id, providerWeather.main),
    conditionCode: typeof providerWeather.id === 'number' ? String(providerWeather.id) : undefined,
    humidity: typeof payload.main.humidity === 'number' ? payload.main.humidity : undefined,
    // OpenWeather Current Weather reports wind speed in m/s when units=metric.
    windSpeed: typeof payload.wind?.speed === 'number' ? payload.wind.speed : undefined,
  }
}

export function mapQWeatherCondition(code?: string | number, text?: string): WeatherCondition {
  const numericCode = typeof code === 'number' ? code : Number(code)

  if (Number.isFinite(numericCode)) {
    if (numericCode === 100) return 'clear'
    if (numericCode >= 101 && numericCode <= 104) return 'clouds'
    if (numericCode >= 302 && numericCode <= 304) return 'thunderstorm'
    if (numericCode >= 300 && numericCode <= 399) return 'rain'
    if (numericCode >= 400 && numericCode <= 403) return 'snow'
    if (numericCode >= 404 && numericCode <= 406) return 'rain'
    if (numericCode >= 407 && numericCode <= 499) return 'snow'
    if (numericCode >= 500 && numericCode <= 515) return 'atmosphere'
  }

  const normalizedText = text?.toLowerCase() || ''
  if (normalizedText.includes('雷')) return 'thunderstorm'
  if (normalizedText.includes('雨')) return 'rain'
  if (normalizedText.includes('雪')) return 'snow'
  if (normalizedText.includes('雾') || normalizedText.includes('霾')) return 'atmosphere'
  if (normalizedText.includes('晴')) return 'clear'
  if (normalizedText.includes('云') || normalizedText.includes('阴')) return 'clouds'

  return 'unknown'
}

export function mapQWeatherResponse(payload: QWeatherPayload): WeatherSnapshot | null {
  const temperature = payload.temperature?.value
  const conditionCode = payload.condition?.code

  if (typeof temperature !== 'number' || (typeof conditionCode !== 'string' && typeof conditionCode !== 'number')) {
    return null
  }

  return {
    temperature,
    feelsLike: typeof payload.feelsLike?.value === 'number' ? payload.feelsLike.value : undefined,
    condition: mapQWeatherCondition(conditionCode, payload.condition?.text),
    conditionCode: String(conditionCode),
    // QWeather current-weather humidity is a ratio in the v1 response.
    humidity: typeof payload.humidity === 'number' ? payload.humidity * 100 : undefined,
    // QWeather v1 current-weather wind speed is already reported in m/s.
    windSpeed: typeof payload.wind?.speed?.value === 'number' ? payload.wind.speed.value : undefined,
  }
}

export function getWeatherConditionLabel(condition: WeatherCondition) {
  switch (condition) {
    case 'clear':
      return '晴朗'
    case 'clouds':
      return '多云'
    case 'drizzle':
      return '毛毛雨'
    case 'rain':
      return '有雨'
    case 'snow':
      return '降雪'
    case 'thunderstorm':
      return '雷雨'
    case 'atmosphere':
      return '雾霾'
    default:
      return '天气暂不可用'
  }
}
