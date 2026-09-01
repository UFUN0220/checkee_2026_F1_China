import { allBlogs } from 'contentlayer/generated'
import { ResponsiveHome } from '~/components/home/responsive-home'
import { allCoreContent } from '~/utils/contentlayer'
import { getHomepageContentSettings, resolvePinnedArticle } from '~/utils/homepage'
import { getHomepageWeatherLocation, getHomepageWorldClockCities } from '~/utils/homepage-live-widgets'
import { sortPosts } from '~/utils/misc'

const MAX_POSTS_DISPLAY = 5

export default async function HomePage() {
  const publicPosts = allCoreContent(sortPosts(allBlogs))
    .filter((post) => !post.draft)
  const posts = publicPosts.slice(0, MAX_POSTS_DISPLAY)
  const settings = await getHomepageContentSettings()
  const weatherLocation = getHomepageWeatherLocation()
  const worldClockCities = getHomepageWorldClockCities()

  return (
    <ResponsiveHome
      latestPost={posts[0]}
      pinnedPost={resolvePinnedArticle(publicPosts, settings)}
      weatherLocation={weatherLocation}
      worldClockCities={worldClockCities}
    />
  )
}
