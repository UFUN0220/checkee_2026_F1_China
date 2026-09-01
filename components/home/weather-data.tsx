'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { WeatherLocationConfig, WeatherSnapshot } from '~/types/home-widgets'

type WeatherResponse = {
  weather?: WeatherSnapshot
}

export type WeatherDataState = {
  weather: WeatherSnapshot | null
  isLoading: boolean
  hasError: boolean
}

const WeatherDataContext = createContext<WeatherDataState | null>(null)

export function WeatherDataProvider({ location, children }: { location: WeatherLocationConfig; children: ReactNode }) {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadWeather() {
      setIsLoading(true)
      setHasError(false)

      try {
        const response = await fetch(`/api/weather?locationId=${encodeURIComponent(location.id)}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`Weather request failed: ${response.status}`)

        const payload = (await response.json()) as WeatherResponse
        if (!payload.weather || typeof payload.weather.temperature !== 'number') {
          throw new Error('Weather response is incomplete')
        }
        setWeather(payload.weather)
      } catch {
        if (!controller.signal.aborted) {
          setWeather(null)
          setHasError(true)
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadWeather()
    return () => controller.abort()
  }, [location.id])

  return <WeatherDataContext.Provider value={{ weather, isLoading, hasError }}>{children}</WeatherDataContext.Provider>
}

export function useWeatherData() {
  const data = useContext(WeatherDataContext)
  if (!data) throw new Error('useWeatherData must be used within WeatherDataProvider')
  return data
}
