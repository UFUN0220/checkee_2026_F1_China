import type { HomepageContentSettings } from '~/types/homepage'

export const homepageConfig = {
  // Change this slug to select the homepage pinned article.
  pinnedArticleSlug: 'kaggleLog',

  // The homepage reads IDs here; presentation components never choose a city.
  weatherLocationId: 'qingdao-shinan',
  worldClockLocationIds: ['beijing', 'st-louis'],
} satisfies HomepageContentSettings & {
  weatherLocationId: string
  worldClockLocationIds: string[]
}
