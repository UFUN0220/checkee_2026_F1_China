export const HEADER_NAV_LINKS = [
  //{ href: '/', title: 'Home' },
  //{ href: '/blog', title: 'Article' ,emoji:'' },
  { href: '/blog', title: 'Article', emoji: '📝' },
  {
    href: '/about',
    title: 'Check',
    emoji: '👤',
    children: [
      { href: '/about', title: '白宫严选' },
      { href: '/about/hall-of-fame', title: '名人堂' },
    ],
  },
]

export const MORE_NAV_LINKS: typeof HEADER_NAV_LINKS = []

export const FOOTER_NAV_LINKS = [
  { href: '/blog', title: 'Article' },
  { href: '/tags', title: 'Tags' },
  { href: '/feed.xml', title: 'RSS Feed' },
]
