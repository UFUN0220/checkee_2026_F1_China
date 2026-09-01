'use client'

import { useEffect, useState } from 'react'
import type { WeatherLocationConfig, WorldClockCity } from '~/types/home-widgets'
import type { HomepagePost } from '~/utils/homepage'
import { DesktopHomeCanvas } from './desktop-home'
import { MobileHomeFlow } from './mobile-home'
import { WeatherDataProvider } from './weather-data'

type ResponsiveHomeProps = {
  latestPost?: HomepagePost
  pinnedPost?: HomepagePost
  weatherLocation: WeatherLocationConfig
  worldClockCities: WorldClockCity[]
}

export function ResponsiveHome({ latestPost, pinnedPost, weatherLocation, worldClockCities }: ResponsiveHomeProps) {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const updateMode = () => setIsDesktop(mediaQuery.matches)
    updateMode()
    mediaQuery.addEventListener('change', updateMode)
    return () => mediaQuery.removeEventListener('change', updateMode)
  }, [])

  return (
    <WeatherDataProvider location={weatherLocation}>
      {isDesktop === null ? (
        <div className="responsive-home-placeholder" aria-hidden="true" />
      ) : isDesktop ? (
        <DesktopHomeCanvas latestPost={latestPost} pinnedPost={pinnedPost} weatherLocation={weatherLocation} />
      ) : (
        <MobileHomeFlow
          latestPost={latestPost}
          pinnedPost={pinnedPost}
          weatherLocation={weatherLocation}
          worldClockCities={worldClockCities}
        />
      )}
    </WeatherDataProvider>
  )
}
