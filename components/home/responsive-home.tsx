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
  return (
    <WeatherDataProvider location={weatherLocation}>
      <div className="responsive-home-desktop">
        <DesktopHomeCanvas latestPost={latestPost} pinnedPost={pinnedPost} weatherLocation={weatherLocation} />
      </div>
      <div className="responsive-home-mobile">
        <MobileHomeFlow
          latestPost={latestPost}
          pinnedPost={pinnedPost}
          weatherLocation={weatherLocation}
          worldClockCities={worldClockCities}
        />
      </div>
    </WeatherDataProvider>
  )
}
