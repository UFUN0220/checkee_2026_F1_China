import { Suspense } from 'react'
import { genPageMetadata } from '~/app/seo'
import { CheckmatePage } from '~/components/checkmate/checkmate-page'
import { PageTheme } from '~/components/ui/page-theme'

export const metadata = genPageMetadata({ title: '名人堂' })

export default function HomePage() {
  return (
    <PageTheme theme="hall">
      <div className="about-page hall-of-fame-page">
        <div className="site-container">
          <Suspense fallback={null}>
            <CheckmatePage view="peers" />
          </Suspense>
        </div>
      </div>
    </PageTheme>
  )
}
