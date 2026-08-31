import { allBlogs } from 'contentlayer/generated'
import { Home } from '~/components/home-page'
import { allCoreContent } from '~/utils/contentlayer'
import { sortPosts } from '~/utils/misc'

const MAX_POSTS_DISPLAY = 5

export default async function HomePage() {
  return (
    <Home
      posts={allCoreContent(sortPosts(allBlogs)).slice(0, MAX_POSTS_DISPLAY)}
    />
  )
}
