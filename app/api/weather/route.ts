import { NextResponse } from 'next/server'
import { getLocationById } from '~/data/locations'
import { getHomepageWeatherLocation } from '~/utils/homepage-live-widgets'

export async function GET(request: Request) {
  const requestedLocationId = new URL(request.url).searchParams.get('locationId')
  const location = requestedLocationId
    ? getLocationById(requestedLocationId)
    : getHomepageWeatherLocation()

  if (!location) {
    return NextResponse.json(
      { error: `Unknown weather location: ${requestedLocationId}` },
      { status: 400 }
    )
  }

  const API_KEY = process.env.OPENWEATHER_API_KEY

  if (!API_KEY) {
    return NextResponse.json({ error: 'API Key missing' }, { status: 500 })
  }

  try {
    const url = new URL('https://api.openweathermap.org/data/2.5/weather')
    url.searchParams.set('lat', String(location.latitude))
    url.searchParams.set('lon', String(location.longitude))
    url.searchParams.set('appid', API_KEY)
    url.searchParams.set('units', 'metric')

    const res = await fetch(url, { cache: 'no-store' })
    const data = await res.json()

    if (res.status !== 200) {
      return NextResponse.json(data, { status: res.status })
    }

    const currentWeather = data.weather?.[0]
    return NextResponse.json({
      locationId: location.id,
      location: location.displayName,
      timezone: location.timezone,
      updatedAt: new Date().toISOString(),
      weather: {
        temperature: data.main?.temp,
        feelsLike: data.main?.feels_like,
        condition: currentWeather?.main,
        conditionCode: currentWeather?.id ? String(currentWeather.id) : undefined,
        high: data.main?.temp_max,
        low: data.main?.temp_min,
        humidity: data.main?.humidity,
        windSpeed: typeof data.wind?.speed === 'number' ? data.wind.speed * 3.6 : undefined,
      },
    })
  } catch (error) {
    console.error('Weather provider request failed', error)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
