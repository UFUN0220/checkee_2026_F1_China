import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { allBlogs } from 'contentlayer/generated'
import { allCoreContent } from '~/utils/contentlayer'
import { getHomepageContentSettings, type HomepagePost } from '~/utils/homepage'
import { saveHomepageContentSettings } from '~/utils/homepage-settings'
import { sortPosts } from '~/utils/misc'

function isAuthorized(request: Request) {
  const configuredToken = process.env.HOMEPAGE_SETTINGS_ADMIN_TOKEN
  const authorization = request.headers.get('authorization')
  return Boolean(configuredToken && authorization === `Bearer ${configuredToken}`)
}

function getPublicPosts(): HomepagePost[] {
  return allCoreContent(sortPosts(allBlogs)).filter((post) => !post.draft)
}

function unauthorizedResponse() {
  return NextResponse.json({ error: 'Homepage settings management is not configured' }, { status: 503 })
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return unauthorizedResponse()

  const posts = getPublicPosts()
  const settings = await getHomepageContentSettings()

  return NextResponse.json({
    pinnedArticleSlug: settings.pinnedArticleSlug,
    posts: posts.map((post) => ({ slug: post.slug, title: post.title, date: post.date })),
  })
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return unauthorizedResponse()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const pinnedArticleSlug =
    typeof body === 'object' && body !== null && 'pinnedArticleSlug' in body
      ? (body as { pinnedArticleSlug?: unknown }).pinnedArticleSlug
      : undefined
  if (typeof pinnedArticleSlug !== 'string' || !pinnedArticleSlug.trim()) {
    return NextResponse.json({ error: 'pinnedArticleSlug must be a public article slug' }, { status: 400 })
  }

  const publicPosts = getPublicPosts()
  if (!publicPosts.some((post) => post.slug === pinnedArticleSlug)) {
    return NextResponse.json({ error: 'Pinned article must be a public article' }, { status: 422 })
  }

  const saved = await saveHomepageContentSettings({ pinnedArticleSlug })
  if (!saved) {
    return NextResponse.json({ error: 'Homepage settings storage is not configured' }, { status: 503 })
  }

  revalidatePath('/')

  return NextResponse.json({ pinnedArticleSlug, saved: true })
}
