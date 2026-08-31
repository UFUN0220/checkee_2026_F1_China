'use client'

import type { Blog } from 'contentlayer/generated'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { Container } from '~/components/ui/container'
import { GrowingUnderline } from '~/components/ui/growing-underline'
import { Link } from '~/components/ui/link'
import type { CoreContent } from '~/types/data'
import '~/css/ufunReadme.css'

const chineseFont = '"heishenhua", cursive, sans-serif'

interface PaginationProps {
  totalPages: number
  currentPage: number
}
interface ListLayoutProps {
  posts: CoreContent<Blog>[]
  title: string
  initialDisplayPosts?: CoreContent<Blog>[]
  pagination?: PaginationProps
}

function Pagination({ totalPages, currentPage }: PaginationProps) {
  const pathname = usePathname()
  const basePath = pathname.split('/')[1]
  const prevPage = currentPage - 1 > 0
  const nextPage = currentPage + 1 <= totalPages

  return (
    <div className="space-y-2 pb-8 pt-6 md:space-y-5">
      <nav className="flex justify-between">
        {prevPage ? (
          <Link
            className="cursor-pointer"
            href={currentPage - 1 === 1 ? `/${basePath}/` : `/${basePath}/page/${currentPage - 1}`}
            rel="prev"
          >
            <GrowingUnderline className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </GrowingUnderline>
          </Link>
        ) : (
          <button className="cursor-auto disabled:opacity-50" disabled={!prevPage}>
            <GrowingUnderline className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </GrowingUnderline>
          </button>
        )}
        <span>
          {currentPage} / {totalPages}
        </span>
        {nextPage ? (
          <Link className="cursor-pointer" href={`/${basePath}/page/${currentPage + 1}`} rel="next">
            <GrowingUnderline className="inline-flex items-center gap-2">
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </GrowingUnderline>
          </Link>
        ) : (
          <button className="cursor-auto disabled:opacity-50" disabled={!nextPage}>
            <GrowingUnderline className="inline-flex items-center gap-2">
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </GrowingUnderline>
          </button>
        )}
      </nav>
    </div>
  )
}

// 简单的文章标题列表项组件
function PostTitleItem({ post }: { post: CoreContent<Blog> }) {
  // 使用固定的日期格式避免 hydration 错误
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`
  }

  return (
    <article className="mx-auto max-w-3xl border-b border-gray-100 px-8 py-8 font-heishenhua last:border-b-0 dark:border-gray-800">
      <Link
        href={`/${post.path}`}
        className="block transition-colors hover:text-blue-600 dark:hover:text-blue-400"
      >
        <h2 className="text-xl md:text-3xl lg:text-5xl">{post.title}</h2>
        {post.summary && (
          <p className="mt-2 text-sm text-gray-600 md:text-base lg:text-lg dark:text-gray-400">
            {post.summary}
          </p>
        )}
        {post.date && (
          <time className="mt-1 block text-xs text-gray-500 md:text-sm dark:text-gray-500">
            {formatDate(post.date)}
          </time>
        )}
      </Link>
    </article>
  )
}

export function ListLayout({
  posts,
  title,
  initialDisplayPosts = [],
  pagination,
}: ListLayoutProps) {
  const searchValue = ''
  const filteredBlogPosts = posts.filter((post) => {
    const searchContent = post.title + post.summary + post.tags?.join(' ')
    return searchContent.toLowerCase().includes(searchValue.toLowerCase())
  })

  // If initialDisplayPosts exist, display it if no searchValue is specified
  const displayPosts =
    initialDisplayPosts.length > 0 && !searchValue ? initialDisplayPosts : filteredBlogPosts

  return (
    <Container className="pt-4 lg:pt-8">
      {/* 搜索功能（可选保留） */}
      {/* <div className="mb-8">
        <input
          type="text"
          placeholder="搜索文章..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </div> */}

      {/* 页面标题 */}
      <h1
        className="text-black-800 mb-16 mt-24 text-center text-4xl md:text-5xl lg:text-8xl"
        style={{
          fontFamily: chineseFont,
          // backgroundImage: 'linear-gradient(45deg, #d291bc, #f7c8d0, #ffdfd3)',
          // backgroundClip: 'text',
          // WebkitBackgroundClip: 'text',
          // color: 'transparent',
          // WebkitTextFillColor: 'transparent'
        }}
      >
        {title}
      </h1>

      {!filteredBlogPosts.length ? (
        <div className="py-10 text-center text-lg text-gray-500 md:text-xl">没有找到相关文章</div>
      ) : (
        <div className="space-y-0">
          {' '}
          {/* 移除网格布局，使用垂直排列 */}
          {displayPosts.map((post) => (
            <PostTitleItem key={post.path} post={post} />
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && !searchValue && (
        <Pagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} />
      )}
    </Container>
  )
}
