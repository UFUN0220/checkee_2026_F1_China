import { NextResponse } from 'next/server'
import { getLocationById } from '~/data/locations'
import { getHomepageWeatherLocation } from '~/utils/homepage-live-widgets'
import {
  mapOpenWeatherResponse,
  mapQWeatherResponse,
  type OpenWeatherPayload,
  type QWeatherPayload,
  type WeatherProvider,
} from '~/utils/weather'

const OPENWEATHER_API_KEY_ENV = 'OPENWEATHER_API_KEY'
const QWEATHER_API_KEY_ENV = 'QWEATHER_API_KEY'
const QWEATHER_API_HOST_ENV = 'QWEATHER_API_HOST'
// The China endpoint is measurably reachable from the site's primary audience.
// Keep it configurable for deployments that have reliable access to the global endpoint.
const OPENWEATHER_BASE_URL =
  process.env.OPENWEATHER_BASE_URL || 'https://cn-api.openweathermap.org'

function logProviderFailure({
  provider,
  status,
  providerCode,
  providerMessage,
}: {
  provider: WeatherProvider
  status?: number
  providerCode?: number | string
  providerMessage?: string
}) {
  if (process.env.NODE_ENV !== 'development') return

  console.error('Weather provider request failed', {
    provider,
    status: status ?? 'network_error',
    providerCode: providerCode ?? 'unknown',
    providerMessage: providerMessage ?? 'No provider response',
  })
}

function errorResponse(error: string, code: string, status: number) {
  return NextResponse.json({ error, code }, { status })
}

function getProvider(location: { country?: string }): WeatherProvider {
  return location.country === 'CN' ? 'qweather' : 'openweather'
}

export async function GET(request: Request) {
  const requestedLocationId = new URL(request.url).searchParams.get('locationId')
  const location = requestedLocationId
    ? getLocationById(requestedLocationId)
    : getHomepageWeatherLocation()

  if (!location) {
    return errorResponse(`Unknown weather location: ${requestedLocationId}`, 'UNKNOWN_LOCATION', 400)
  }

  const provider = getProvider(location)
  const apiKeyEnv = provider === 'qweather' ? QWEATHER_API_KEY_ENV : OPENWEATHER_API_KEY_ENV
  const API_KEY = process.env[apiKeyEnv]

  if (!API_KEY) {
    logProviderFailure({ provider, providerCode: 'ENV_NOT_LOADED', providerMessage: apiKeyEnv })
    return errorResponse('Weather provider is not configured', 'ENV_NOT_LOADED', 500)
  }

  try {
    let res: Response
    let weather

    if (provider === 'qweather') {
      const configuredApiHost = process.env[QWEATHER_API_HOST_ENV]?.trim()
      if (!configuredApiHost) {
        logProviderFailure({ provider, providerCode: 'ENV_NOT_LOADED', providerMessage: QWEATHER_API_HOST_ENV })
        return errorResponse('Weather provider is not configured', 'ENV_NOT_LOADED', 500)
      }

      let apiHost: URL
      try {
        apiHost = new URL(
          /^https?:\/\//i.test(configuredApiHost) ? configuredApiHost : `https://${configuredApiHost}`
        )
        if (!['http:', 'https:'].includes(apiHost.protocol)) throw new Error('Unsupported API host protocol')
      } catch {
        logProviderFailure({ provider, providerCode: 'INVALID_API_HOST', providerMessage: QWEATHER_API_HOST_ENV })
        return errorResponse('Weather provider host is invalid', 'INVALID_API_HOST', 500)
      }

      const url = new URL(
        `/weather/v1/current/${location.latitude}/${location.longitude}`,
        apiHost.origin
      )
      url.searchParams.set('lang', 'zh')
      res = await fetch(url, {
        cache: 'no-store',
        headers: { Accept: 'application/json', 'X-QW-Api-Key': API_KEY },
        signal: AbortSignal.timeout(10_000),
      })
      const data = (await res.json()) as QWeatherPayload

      if (!res.ok) {
        logProviderFailure({
          provider,
          status: res.status,
          providerCode: data.code,
          providerMessage: data.message,
        })
        return errorResponse(
          data.message || 'Weather provider request failed',
          data.code || `HTTP_${res.status}`,
          res.status
        )
      }

      weather = mapQWeatherResponse(data)
    } else {
      const url = new URL('/data/2.5/weather', OPENWEATHER_BASE_URL)
      url.searchParams.set('lat', String(location.latitude))
      url.searchParams.set('lon', String(location.longitude))
      url.searchParams.set('appid', API_KEY)
      url.searchParams.set('units', 'metric')

      res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10_000) })
      const data = (await res.json()) as OpenWeatherPayload

      if (!res.ok) {
        logProviderFailure({
          provider,
          status: res.status,
          providerCode: data.cod,
          providerMessage: data.message,
        })
        return errorResponse(
          data.message || 'Weather provider request failed',
          data.cod ? String(data.cod) : `HTTP_${res.status}`,
          res.status
        )
      }

      weather = mapOpenWeatherResponse(data)
    }

    if (!weather) {
      logProviderFailure({
        provider,
        status: res.status,
        providerCode: 'RESPONSE_MAPPING_BUG',
        providerMessage: 'Weather response is missing required fields',
      })
      return errorResponse('Weather provider response is incomplete', 'RESPONSE_MAPPING_BUG', 502)
    }

    return NextResponse.json({
      locationId: location.id,
      location: location.displayName,
      timezone: location.timezone,
      provider,
      updatedAt: new Date().toISOString(),
      weather,
    })
  } catch (error) {
    logProviderFailure({ provider, providerCode: 'NETWORK_ERROR', providerMessage: 'Weather request failed' })
    if (process.env.NODE_ENV === 'development') {
      console.error('Weather network error', {
        errorType: error instanceof Error ? error.name : 'UnknownError',
      })
    }
    return errorResponse('Weather provider is unavailable', 'NETWORK_ERROR', 502)
  }
}
