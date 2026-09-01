import { CalendarDays } from 'lucide-react'
import type { HomepagePost } from '~/utils/homepage'
import type { WeatherLocationConfig, WorldClockCity } from '~/types/home-widgets'
import { ArticleWidgetCard } from './article-widget-card'
import { CalendarGrid } from './home-client-widgets'
import { ContactCluster } from './contact-cluster'
import { ProfileCard } from './profile-card'
import { WeatherWidget } from './weather-widget'
import { WidgetShell } from './widget-shell'
import { WorldClockWidget } from './world-clock-widget'
import { UrgeUpdate } from '~/components/home-page/UrgeUpdate'

function MobileCalendarCard() {
  return (
    <WidgetShell widget="calendar" label="Calendar" layout="flow">
      <div className="home-calendar-card">
        <div className="home-calendar-heading">
          <CalendarDays size={16} strokeWidth={1.8} />
          <span>日历</span>
        </div>
        <div className="home-calendar-client">
          <CalendarGrid />
        </div>
      </div>
    </WidgetShell>
  )
}

type MobileHomeFlowProps = {
  latestPost?: HomepagePost
  pinnedPost?: HomepagePost
  weatherLocation: WeatherLocationConfig
  worldClockCities: WorldClockCity[]
}

export function MobileHomeFlow({ latestPost, pinnedPost, weatherLocation, worldClockCities }: MobileHomeFlowProps) {
  return (
    <div className="mobile-home-page">
      <div className="mobile-home-flow">
        <ProfileCard layout="flow" />

        <WidgetShell widget="weather" label="天气" layout="flow">
          <WeatherWidget location={weatherLocation} />
        </WidgetShell>

        <WidgetShell widget="worldClock" label="世界时钟" layout="flow">
          <WorldClockWidget cities={worldClockCities} />
        </WidgetShell>

        <ArticleWidgetCard widget="latestArticle" label="最新文章" article={latestPost} layout="flow" />
        <ArticleWidgetCard widget="pinnedArticle" label="置顶文章" article={pinnedPost} layout="flow" />

        <MobileCalendarCard />
        <ContactCluster layout="flow" />

        <WidgetShell widget="urge" label="催更" layout="flow">
          <UrgeUpdate variant="home" />
        </WidgetShell>
      </div>
    </div>
  )
}
