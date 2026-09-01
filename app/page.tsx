import { allBlogs } from 'contentlayer/generated'
import { DesktopHomeCanvas } from '~/components/home/desktop-home'
import { allCoreContent } from '~/utils/contentlayer'
import { resolvePinnedArticle } from '~/utils/homepage'
import { sortPosts } from '~/utils/misc'

const MAX_POSTS_DISPLAY = 5

export default async function HomePage() {
  const publicPosts = allCoreContent(sortPosts(allBlogs))
    .filter((post) => !post.draft)
  const posts = publicPosts.slice(0, MAX_POSTS_DISPLAY)

  return (
    <DesktopHomeCanvas latestPost={posts[0]} pinnedPost={resolvePinnedArticle(publicPosts)} />
  )
}
