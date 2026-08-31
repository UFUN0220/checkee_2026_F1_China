import type { Author, Blog } from 'contentlayer/generated'
import type { ReactNode } from 'react'
import { BlogMeta } from '~/components/blog/blog-meta'
import { PostNav } from '~/components/blog/post-nav'
import { PostTitle } from '~/components/blog/post-title'
import { ScrollButtons } from '~/components/blog/scroll-buttons'
import { TagsList } from '~/components/blog/tags'
import { TableOfContents } from '~/components/blog/toc'
import { Container } from '~/components/ui/container'
import type { CoreContent } from '~/types/data'

interface LayoutProps {
  content: CoreContent<Blog>
  authorDetails: CoreContent<Author>[]
  next?: { path: string; title: string }
  prev?: { path: string; title: string }
  children: ReactNode
}
export function PostLayout({ content, next, prev, children }: LayoutProps) {
  const { slug, lastmod, readingTime, date, title, tags, toc, type } = content

  return (
    <Container className="pt-4 lg:pt-8">
      <ScrollButtons />

      <article className="mx-auto max-w-screen-xl px-4 pt-6">
        <div className="mx-auto max-w-3xl space-y-2">
          <TagsList tags={tags} />
          <PostTitle>{title}</PostTitle>
          <div className="flex items-center justify-between gap-2 pb-2 font-serif lg:pt-2">
            <BlogMeta
              date={date}
              lastmod={lastmod}
              type={type.toLowerCase()}
              slug={slug}
              readingTime={readingTime}
            />
          </div>
        </div>

        {/* 增大内容区域与TOC的水平间距：将 gap-8 改为 gap-12 或更大 */}
        <div className="grid grid-cols-1 gap-24 pb-10 pt-8 lg:grid-cols-12 lg:pt-10">
          {/* 左侧占位列 - 保持对称 */}
          <div className="hidden xl:col-span-1 xl:block">{/* 留空，用于对称布局 */}</div>

          {/* 主要内容区域 - 调整为与标题区域相同宽度 */}
          <div className="lg:col-span-8 xl:col-span-8">
            <div className="prose max-w-none font-serif lg:prose-lg dark:prose-invert">
              {children}
            </div>
          </div>

          {/* TOC 区域 - 移到正文区域外部右侧 */}
          <div className="lg:col-span-3 xl:col-span-3">
            <div className="scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 max-h-[calc(100vh-6rem)] overflow-y-auto font-serif lg:sticky lg:top-24">
              <TableOfContents toc={toc} />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-3xl space-y-4">
          <PostNav next={next} nextLabel="Next post" prev={prev} prevLabel="Previous post" />
        </div>
      </article>
    </Container>
  )
}
