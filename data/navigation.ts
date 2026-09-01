import { SITE_METADATA } from './site-metadata'

export const HEADER_NAV_LINKS = [
  //{ href: '/', title: 'Home' },
  //{ href: '/blog', title: 'Article' ,emoji:'' },
  { href: '/blog', title: 'Article', emoji: '📝' },
  { href: '/about', title: 'Check', emoji: '👤' },
]

export const MORE_NAV_LINKS: typeof HEADER_NAV_LINKS = []

export const FOOTER_NAV_LINKS = [
  { href: '/blog', title: 'Article' },
  { href: '/tags', title: 'Tags' },
  { href: '/feed.xml', title: 'RSS Feed' },
]

export const FOOTER_PERSONAL_STUFF = [
  { href: '/README', title: 'Info' },
  { href: '/static/resume.pdf', title: 'CV' },
  { href: SITE_METADATA.analytics.umamiAnalytics.shareUrl, title: 'Analytics' },
]
