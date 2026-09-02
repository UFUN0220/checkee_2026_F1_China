import { genPageMetadata } from '~/app/seo'
import { allBlogs } from 'contentlayer/generated'
//import { ListLayout } from '~/layouts/list-layout'
import { ListLayout } from '~/layouts/list_layout_ufun'
import { POSTS_PER_PAGE } from '~/utils/const'
import { allCoreContent } from '~/utils/contentlayer'
import { sortPosts } from '~/utils/misc'
import { PageTheme } from '~/components/ui/page-theme'

export const metadata = genPageMetadata({ title: 'Article' }) // TODO: update title

export default function BlogPage() {
  const posts = allCoreContent(sortPosts(allBlogs))
  const pageNumber = 1
  const initialDisplayPosts = posts.slice(
    POSTS_PER_PAGE * (pageNumber - 1),
    POSTS_PER_PAGE * pageNumber
  )
  const pagination = {
    currentPage: pageNumber,
    totalPages: Math.ceil(posts.length / POSTS_PER_PAGE),
  }

  return (
    <div className="blog-index-page pt-4 lg:pt-12">
      <PageTheme theme="reading">
        <ListLayout
          posts={posts}
          initialDisplayPosts={initialDisplayPosts}
          pagination={pagination}
        />
      </PageTheme>
    </div>
  )
}
