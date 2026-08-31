import '../css/tailwind.css'
import '../css/twemoji.css'
import 'react-medium-image-zoom/dist/styles.css'
import 'remark-github-blockquote-alert/alert.css'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

import clsx from 'clsx'
import type { Metadata } from 'next'

import { JetBrains_Mono, Nunito, Playpen_Sans } from 'next/font/google'
import { UmamiAnalytics } from '~/components/analytics/umami'
import { Footer } from '~/components/footer'
import { Header } from '~/components/header'
import { KBarSearchProvider } from '~/components/search/kbar-provider'
// import { TiltedGridBackground } from '~/components/ui/tilted-grid-background'

import { SITE_METADATA } from '~/data/site-metadata'
import { ThemeProviders } from './theme-providers'

const FONT_PLAYPEN_SANS = Playpen_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['800'],
  variable: '--font-playpen-sans',
})

const FONT_NUNITO = Nunito({
  subsets: ['latin'],
  display: 'swap',
  style: ['normal', 'italic'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito',
})

const FONT_JETBRAINS_MONO = JetBrains_Mono({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_METADATA.siteUrl),
  title: {
    default: SITE_METADATA.title,
    template: `%s | ${SITE_METADATA.title}`,
  },
  description: SITE_METADATA.description,
  openGraph: {
    title: SITE_METADATA.title,
    description: SITE_METADATA.description,
    url: './',
    siteName: SITE_METADATA.title,
    // images: [SITE_METADATA.socialBanner],
    images: [],
    locale: 'en_US',
    type: 'website',
  },
  alternates: {
    canonical: './',
    types: {
      'application/rss+xml': `${SITE_METADATA.siteUrl}/feed.xml`,
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  twitter: {
    title: SITE_METADATA.title,
    card: 'summary_large_image',
    // images: [SITE_METADATA.socialBanner],
    images: [],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const basePath = process.env.BASE_PATH || ''

  return (
    <html
      lang={SITE_METADATA.language}
      className={clsx(
        'dark',
        'scroll-smooth',
        FONT_NUNITO.variable,
        FONT_JETBRAINS_MONO.variable,
        FONT_PLAYPEN_SANS.variable
      )}
      suppressHydrationWarning
    >
      <link rel="apple-touch-icon" sizes="76x76" href={`${basePath}/static/favicons/favicon.ico`} />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href={`${basePath}/static/favicons/favicon.jpg`}
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href={`${basePath}/static/favicons/favicon.jpg`}
      />
      <link rel="manifest" href={`${basePath}/static/favicons/site.webmanifest`} />
      <link
        rel="mask-icon"
        href={`${basePath}/static/favicons/safari-pinned-tab.svg`}
        color="#5bbad5"
      />
      <meta name="msapplication-TileColor" content="#000000" />
      <meta name="theme-color" media="(prefers-color-scheme: light)" content="#fff" />
      <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#000" />
      <link rel="alternate" type="application/rss+xml" href={`${basePath}/feed.xml`} />

      <body
        className={clsx([
          'antialiased, font-sans',
          'relative min-h-screen pl-[calc(100vw-100%)]',
          'flex flex-col',
          'bg-[#f7edf5] bg-[radial-gradient(circle_at_16%_84%,rgba(255,45,85,0.3),transparent_34%),radial-gradient(circle_at_78%_82%,rgba(255,204,0,0.34),transparent_31%),radial-gradient(circle_at_56%_24%,rgba(175,82,222,0.24),transparent_35%),radial-gradient(circle_at_26%_18%,rgba(90,200,250,0.22),transparent_32%)] text-neutral-900',
          'bg-fixed dark:bg-[#f7edf5] dark:text-gray-100',
        ])}
      >
        <ThemeProviders>
          <UmamiAnalytics websiteId={SITE_METADATA.analytics.umamiAnalytics.websiteId} />
          <KBarSearchProvider configs={SITE_METADATA.search.kbarConfigs}>
            <Header />
            <main className="mb-auto grow">{children}</main>
          </KBarSearchProvider>
          <Footer />
        </ThemeProviders>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
