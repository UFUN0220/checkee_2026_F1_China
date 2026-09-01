import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { slug } from 'github-slugger'
import { allBlogs } from '../.contentlayer/generated/index.mjs'
import tagData from '../json/tag-data.json' with { type: 'json' }

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RSS_PAGE = 'feed.xml'
const blogs = allBlogs
const SITE_METADATA = {
  title: 'uFun Pre - UFUN (中国大陆)',
  author: 'You Fang',
  description: '由心以暇，放鹿青崖。',
  language: 'en-us',
  siteUrl: 'https://www.yvon.dev',
  email: 'youfang0402@163.com',
}

function escape(value) {
  const entities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }

  return String(value).replace(/[&<>'"]/g, (character) => entities[character])
}

function sortPosts(items) {
  return [...items].sort((a, b) => {
    if (a.date > b.date) return -1
    if (a.date < b.date) return 1
    return 0
  })
}

function generateRssItem(item) {
  const { siteUrl, email, author } = SITE_METADATA
  return `
		<item>
			<guid>${siteUrl}/blog/${item.slug}</guid>
			<title>${escape(item.title)}</title>
			<link>${siteUrl}/blog/${item.slug}</link>
			${item.summary && `<description>${escape(item.summary)}</description>`}
			<pubDate>${new Date(item.date).toUTCString()}</pubDate>
			<author>${email} (${author})</author>
			${item.tags && item.tags.map((tag) => `<category>${escape(tag)}</category>`).join('')}
		</item>
	`
}

function generateRss(items, page = RSS_PAGE) {
  const { title, siteUrl, description, language, email, author } = SITE_METADATA
  return `
		<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
			<channel>
				<title>${escape(title)}</title>
				<link>${siteUrl}/blog</link>
				<description>${escape(description)}</description>
				<language>${language}</language>
				<managingEditor>${email} (${author})</managingEditor>
				<webMaster>${email} (${author})</webMaster>
				<lastBuildDate>${new Date(items[0].date).toUTCString()}</lastBuildDate>
				<atom:link href="${siteUrl}/${page}" rel="self" type="application/rss+xml"/>
				${items.map((item) => generateRssItem(item)).join('')}
			</channel>
		</rss>
	`
}

export async function generateRssFeed() {
  const publishPosts = blogs.filter((post) => post.draft !== true)
  if (publishPosts.length === 0) return

  writeFileSync(path.join(projectRoot, 'public', RSS_PAGE), generateRss(sortPosts(publishPosts)))

  for (const tag of Object.keys(tagData)) {
    const filteredPosts = publishPosts.filter((post) => post.tags.map((value) => slug(value)).includes(tag))
    if (filteredPosts.length === 0) continue

    const rssPath = path.join(projectRoot, 'public', 'tags', tag)
    mkdirSync(rssPath, { recursive: true })
    writeFileSync(path.join(rssPath, RSS_PAGE), generateRss(sortPosts(filteredPosts), `tags/${tag}/feed.xml`))
  }

  console.log('🗒️. RSS feed generated.')
}
