import { CalendarDays } from 'lucide-react'
import type { HomepagePost } from '~/utils/homepage'
import { ArticleWidgetCard } from './article-widget-card'
import { CalendarGrid } from './home-client-widgets'
import { ContactCluster } from './contact-cluster'
import { DesktopCanvasScaler } from './desktop-canvas-scaler'
import { ImageWidgetCard } from './image-widget-card'
import { WidgetShell } from './widget-shell'
import { ProfileCard } from './profile-card'
import { WeatherWidget } from './weather-widget'
import { UrgeUpdate } from '~/components/home-page/UrgeUpdate'
import { LocationTimeWeather } from '~/components/home-page/LocationTimeWeather'

function CalendarCard({ layout = 'desktop' }: { layout?: 'desktop' | 'flow' }) {
  return (
    <WidgetShell widget="calendar" label="Calendar" layout={layout}>
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

export function DesktopHomeCanvas({
  latestPost,
  pinnedPost,
  weatherLocation,
}: {
  latestPost?: HomepagePost
  pinnedPost?: HomepagePost
  weatherLocation: Parameters<typeof WeatherWidget>[0]['location']
}) {
  return (
    <div className="desktop-home-page">
      <div className="home-ambient" aria-hidden="true" />
      <DesktopCanvasScaler>
        <div className="desktop-home-canvas">
          <ImageWidgetCard side="left" />
          <ProfileCard />
          <ContactCluster />
          <WidgetShell widget="weather" label="天气">
            <WeatherWidget location={weatherLocation} />
          </WidgetShell>
          <WidgetShell widget="worldClock" label="世界时钟">
            <LocationTimeWeather />
          </WidgetShell>
          <CalendarCard />
          <WidgetShell widget="urge" label="催更">
            <UrgeUpdate variant="home" />
          </WidgetShell>
          <ArticleWidgetCard widget="latestArticle" label="最新文章" article={latestPost} />
          <ArticleWidgetCard widget="pinnedArticle" label="置顶文章" article={pinnedPost} />
        </div>
      </DesktopCanvasScaler>
    </div>
  )
}
