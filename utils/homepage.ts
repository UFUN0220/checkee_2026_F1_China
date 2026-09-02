import type { Blog } from 'contentlayer/generated'
import { homepageConfig } from '~/data/homepage'
import type { CoreContent } from '~/types/data'
import type { HomepageContentSettings } from '~/types/homepage'
import { loadHomepageContentSettings } from './homepage-settings'

export type HomepagePost = CoreContent<Blog>

export async function getHomepageContentSettings(): Promise<HomepageContentSettings> {
  return (await loadHomepageContentSettings()) || {
    pinnedArticleSlug: homepageConfig.pinnedArticleSlug,
  }
}

export function resolvePinnedArticle(
  publicPosts: HomepagePost[],
  settings: HomepageContentSettings = homepageConfig
) {
  const pinnedArticle = settings.pinnedArticleSlug
    ? publicPosts.find((post) => post.slug === settings.pinnedArticleSlug)
    : undefined

  if (pinnedArticle) return pinnedArticle

  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      `[Homepage] Pinned article "${settings.pinnedArticleSlug || 'none'}" was not found. Falling back to the latest public article.`
    )
  }

  return publicPosts[0]
}
