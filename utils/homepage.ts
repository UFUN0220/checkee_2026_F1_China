import type { Blog } from 'contentlayer/generated'
import { homepageConfig } from '~/data/homepage'
import type { CoreContent } from '~/types/data'

export type HomepagePost = CoreContent<Blog>

export function resolvePinnedArticle(publicPosts: HomepagePost[]) {
  const pinnedArticle = publicPosts.find((post) => post.slug === homepageConfig.pinnedArticleSlug)

  if (pinnedArticle) return pinnedArticle

  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      `[Homepage] Pinned article "${homepageConfig.pinnedArticleSlug}" was not found. Falling back to the latest public article.`
    )
  }

  return publicPosts[0]
}
