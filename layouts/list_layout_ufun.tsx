import type { Blog } from 'contentlayer/generated'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Container } from '~/components/ui/container'
import { Link } from '~/components/ui/link'
import type { CoreContent } from '~/types/data'
import '~/css/ufunReadme.css'
import { formatDate } from '~/utils/misc'

interface PaginationProps {
  totalPages: number
  currentPage: number
}
interface ListLayoutProps {
  posts: CoreContent<Blog>[]
  initialDisplayPosts?: CoreContent<Blog>[]
  pagination?: PaginationProps
}

function Pagination({ totalPages, currentPage }: PaginationProps) {
  const hasPrevious = currentPage > 1
  const hasNext = currentPage < totalPages

  if (totalPages <= 1) return null

  return (
    <nav className="mt-5 border-t border-gray-900/10 pt-4 dark:border-white/10" aria-label="文章分页">
      <div className="flex w-full items-center justify-between gap-4">
        {hasPrevious ? (
          <Link
            className="nav-interactive shrink-0 gap-2 rounded-2xl px-3 py-2 text-sm"
            href={currentPage - 1 === 1 ? '/blog/' : `/blog/page/${currentPage - 1}`}
            rel="prev"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </Link>
        ) : null}
        <span className="relative top-3 min-w-0 flex-1 text-center text-sm text-gray-500 dark:text-gray-400">
          {currentPage} / {totalPages}
        </span>
        {hasNext ? (
          <Link
            className="nav-interactive shrink-0 gap-2 rounded-2xl px-3 py-2 text-sm"
            href={`/blog/page/${currentPage + 1}`}
            rel="next"
          >
            <span>Next</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </nav>
  )
}

function PostTitleItem({ post }: { post: CoreContent<Blog> }) {
  return (
    <article className="group border-b border-gray-900/10 pb-3 dark:border-white/10 sm:pb-4 last:border-b-0">
      <Link
        href={`/${post.path}`}
        className="block min-w-0 transition-colors hover:text-blue-700 dark:hover:text-blue-300"
      >
        <div className="flex items-baseline justify-between gap-4 sm:gap-6">
          <h2 className="min-w-0 break-words font-heishenhua text-3xl font-normal leading-tight tracking-tight text-gray-900 transition-colors group-hover:text-blue-700 dark:text-gray-100 dark:group-hover:text-blue-300 sm:text-4xl lg:text-5xl">
            {post.title}
          </h2>
          {post.date && (
            <time
              className="shrink-0 font-heishenhua text-sm font-normal tracking-wide text-gray-500 dark:text-gray-400 sm:text-base lg:text-lg"
              dateTime={post.date}
            >
              {formatDate(post.date)}
            </time>
          )}
        </div>
        {post.summary && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-gray-600 dark:text-gray-400 lg:line-clamp-1">
            {post.summary}
          </p>
        )}
      </Link>
    </article>
  )
}

export function ListLayout({
  posts,
  initialDisplayPosts = [],
  pagination,
}: ListLayoutProps) {
  const searchValue = ''
  const filteredBlogPosts = posts.filter((post) => {
    const searchContent = post.title + post.summary + post.tags?.join(' ')
    return searchContent.toLowerCase().includes(searchValue.toLowerCase())
  })

  // Paginated routes must render their server-selected slice, including an empty slice for out-of-range pages.
  const displayPosts = pagination && !searchValue ? initialDisplayPosts : filteredBlogPosts

  return (
    <Container className="pb-10 pt-8 sm:pt-10 lg:flex lg:min-h-[calc(100dvh-8rem)] lg:items-center lg:pb-14 lg:pt-14">
      <div className="mx-auto w-full max-w-2xl">
        {!displayPosts.length ? (
          <div className="rounded-[1.5rem] border border-gray-900/10 bg-white/30 px-5 py-10 text-center text-base text-gray-500 dark:border-white/10 dark:bg-gray-900/15 dark:text-gray-400">
            没有找到相关文章
          </div>
        ) : (
          <div className="space-y-8 lg:space-y-16">
            {displayPosts.map((post) => (
              <PostTitleItem key={post.path} post={post} />
            ))}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && !searchValue ? (
          <Pagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} />
        ) : null}
      </div>
    </Container>
  )
}
