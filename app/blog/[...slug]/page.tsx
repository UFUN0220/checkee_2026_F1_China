import type { Author, Blog } from 'contentlayer/generated'
import { allAuthors, allBlogs } from 'contentlayer/generated'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MDX_COMPONENTS } from '~/components/mdx'
import { MDXLayoutRenderer } from '~/components/mdx/layout-renderer'
import { SITE_METADATA } from '~/data/site-metadata'
import { PostBanner } from '~/layouts/post-banner'
//import { PostLayout } from '~/layouts/post-layout'
import { PostLayout } from '~/layouts/post_layout_ufun'

import { PostSimple } from '~/layouts/post-simple'
import { allCoreContent, coreContent } from '~/utils/contentlayer'
import { sortPosts } from '~/utils/misc'
import { PageTheme } from '~/components/ui/page-theme'

const DEFAULT_LAYOUT = 'PostLayout'
const LAYOUTS = {
  PostSimple,
  PostLayout,
  PostBanner,
}
type LayoutKey = keyof typeof LAYOUTS

export async function generateMetadata(props: {
  params: Promise<{ slug: string[] }>
}): Promise<Metadata | undefined> {
  const params = await props.params
  const slug = decodeURI(params.slug.join('/'))
  const post = allBlogs.find((p) => p.slug === slug)
  const authorList = post?.authors || ['default']
  const authorDetails = authorList.map((author) => {
    const authorResults = allAuthors.find((p) => p.slug === author)
    return coreContent(authorResults as Author)
  })
  if (!post) {
    return
  }

  const publishedAt = new Date(post.date).toISOString()
  const modifiedAt = new Date(post.lastmod || post.date).toISOString()
  const authors = authorDetails.map((author) => author.name)
  //let imageList = [SITE_METADATA.socialBanner]
  let imageList: string[] = []

  if (post.images) {
    imageList = typeof post.images === 'string' ? [post.images] : post.images
  }
  // 添加 (imageList as string[]) 强制断言
  const ogImages = (imageList as string[]).map((img) => {
    return {
      url: img.includes('http') ? img : SITE_METADATA.siteUrl + img,
    }
  })

  return {
    title: post.title,
    description: post.summary,
    openGraph: {
      title: post.title,
      description: post.summary,
      siteName: SITE_METADATA.title,
      locale: 'en_US',
      type: 'article',
      publishedTime: publishedAt,
      modifiedTime: modifiedAt,
      url: './',
      //images: ogImages,
      ...(imageList.length > 0 && { images: ogImages }), // 只有有图片时才包含 images
      authors: authors.length > 0 ? authors : [SITE_METADATA.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.summary,
      //images: imageList,
      ...(imageList.length > 0 && { images: ogImages }), // 只有有图片时才包含 images
    },
  }
}

export const generateStaticParams = async () => {
  return allBlogs.map((p) => ({ slug: p.slug.split('/').map((name) => decodeURI(name)) }))
}

export default async function Page(props: { params: Promise<{ slug: string[] }> }) {
  const params = await props.params
  const slug = decodeURI(params.slug.join('/'))
  // Filter out drafts in production
  const sortedCoreContents = allCoreContent(sortPosts(allBlogs))
  const postIndex = sortedCoreContents.findIndex((p) => p.slug === slug)
  if (postIndex === -1) {
    return notFound()
  }

  const prev = sortedCoreContents[postIndex + 1]
  const next = sortedCoreContents[postIndex - 1]
  const post = allBlogs.find((p) => p.slug === slug) as Blog
  const authorList = post?.authors || ['default']
  const authorDetails = authorList.map((author) => {
    const authorResults = allAuthors.find((p) => p.slug === author)
    return coreContent(authorResults as Author)
  })
  const mainContent = coreContent(post)
  const jsonLd = post.structuredData
  jsonLd['author'] = authorDetails.map((author) => {
    return {
      '@type': 'Person',
      name: author.name,
    }
  })
  const layoutKey = (post.layout && post.layout in LAYOUTS ? post.layout : DEFAULT_LAYOUT) as LayoutKey
  const Layout = LAYOUTS[layoutKey]

  return (
    <PageTheme theme="reading">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Layout content={mainContent} authorDetails={authorDetails} next={next} prev={prev}>
        <MDXLayoutRenderer code={post.body.code} components={MDX_COMPONENTS} toc={post.toc} />
      </Layout>
    </PageTheme>
  )
  
}
